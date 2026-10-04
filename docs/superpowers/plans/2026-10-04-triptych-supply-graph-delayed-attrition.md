# Triptych Supply Graph and Delayed Attrition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic graph-derived logistics and delayed 10 HP attrition without creating a second territorial truth.

**Architecture:** Supply is derived in a new `src/sim/supply.ts` module from canonical territory ownership, topology, Crown-node state, and living hostile occupation. Only per-unit consecutive unsupplied exposure is persisted in `WorldState.supply`; supplied tiles and roots remain derived. Strategic-boundary resolution runs settlement, node control, supply attrition, then the existing economy/manipulation/development lifecycle.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, Phaser 4 runtime, Vite 7

**Spec:** `docs/superpowers/specs/2026-10-04-triptych-supply-graph-delayed-attrition-design.md`

## Global Constraints

- `BoardTile.factionControl` remains the sole territorial ownership truth.
- No canonical per-tile `supplied` flag may be added.
- Supply traversal is orthogonal and topology-aware.
- Victoria home-edge root: `x = 0`; Obsidian home-edge root: `x = world.width - 1`.
- Crown nodes seed supply only when owned, uncontested, and connected to already controlled candidate cells.
- Minor nodes do not seed supply.
- Living enemy occupation blocks supply traversal without changing ownership.
- Unit supply requires the unit's occupied cell to be in its faction's supplied-tile set.
- Exposure progression is `0 supplied -> 1 exposed -> 2 strained -> 3+ attrition`.
- Attrition damage is exactly 10 HP per strategic boundary at exposure 3+.
- Reconnection resets exposure to zero immediately.
- Fixed ticks have no supply or attrition authority.
- Supply derives from world state deterministically with no randomness or wall-clock input.
- Newly deployed units do not take attrition on the same boundary they appear.
- AI supply-aware behavior, READY deployment, supply visualization, territory decay, and enemy conquest are out of scope.

## Review Focus

- **No active roots:** a faction with owned territory but no active home/Crown root must derive an empty supplied set; pinned in Task 1.
- **Hostile bridge occupancy:** a living enemy on a one-tile corridor must cut traversal while a dead enemy does not; pinned in Task 2.
- **Crown root isolation:** a Crown may seed a disconnected owned component, but contested Crowns and minor nodes may not; pinned in Task 2.
- **Attrition death invariants:** killing a unit by attrition must remove occupancy/combat/military/exposure state without stale references; pinned in Task 4.
- **Boundary ordering:** supply must execute after node control but before deployment so fresh Crown capture can supply immediately and fresh recruits avoid same-boundary attrition; pinned in Task 5.

---

### Task 1: Add Supply State and Pure Home-Edge Connectivity

**Files:**
- Create: `src/sim/supply.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/supply-graph.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world)`, `strategicTiles(world)`, `tileId(cell)`, `WorldState`, `Faction`.
- Produces:
  - `type SupplyStatus = 'supplied' | 'exposed' | 'strained' | 'attrition'`
  - `type SupplyState = Readonly<{ exposureRoundsByUnit: Readonly<Record<string, number>> }>`
  - `type FactionSupplySnapshot = Readonly<{ faction: Faction; rootTileIds: readonly TileId[]; suppliedTileIds: readonly TileId[] }>`
  - `deriveFactionSupply(world: WorldState, faction: Faction): FactionSupplySnapshot`
  - `WorldState.supply: SupplyState`

- [ ] **Step 1: Write the failing home-edge supply tests**

Add tests proving:
- V2 opening Victoria territory includes supplied cells rooted from owned playable `x=0` tiles.
- V2 opening Obsidian territory includes supplied cells rooted from owned playable `x=31` tiles.
- A connected owned corridor floods orthogonally through its whole component.
- A disconnected owned island remains `factionControl: 'victoria'` but is absent from `suppliedTileIds`.
- A faction with owned cells but no active home-edge or Crown root gets `rootTileIds=[]` and `suppliedTileIds=[]`.
- Calling `deriveFactionSupply` twice on equal worlds produces equal snapshots.

- [ ] **Step 2: Run the new tests to verify RED**

Run:
```bash
npx vitest run tests/sim/supply-graph.test.ts
```

Expected: FAIL because `deriveFactionSupply`, `SupplyState`, and `world.supply` do not exist.

- [ ] **Step 3: Add the minimal persistent state types and initialization**

In `src/sim/types.ts`, add `SupplyState` and `WorldState.supply`.

In `src/sim/world.ts`, initialize:

```ts
supply: { exposureRoundsByUnit: {} }
```

Export supply APIs from `src/sim/index.ts`.

- [ ] **Step 4: Implement `deriveFactionSupply` for home-edge roots and orthogonal traversal**

In `src/sim/supply.ts`:
- collect playable home-edge cells for the faction;
- retain only cells controlled by the faction and not occupied by a living enemy;
- stable-sort root tile ids;
- BFS/DFS only over controlled, playable, enemy-unblocked orthogonal neighbors;
- return stable-sorted `suppliedTileIds`;
- do not mutate the input world.

Crown roots are added in Task 2.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:
```bash
npx vitest run tests/sim/supply-graph.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/supply.ts src/sim/types.ts src/sim/world.ts src/sim/index.ts tests/sim/supply-graph.test.ts
git commit -m "feat: derive home-edge supply connectivity"
```

### Task 2: Add Hostile Corridor Blocking and Crown Roots

**Files:**
- Modify: `src/sim/supply.ts`
- Modify: `tests/sim/supply-graph.test.ts`
- Test: `tests/sim/nodes.test.ts`
- Test: `tests/sim/royal-node-topology.test.ts`

**Interfaces:**
- Consumes: Task 1 `deriveFactionSupply(world, faction)`.
- Produces: final root policy combining active home-edge roots with owned uncontested Crown-root candidates.

- [ ] **Step 1: Add failing hostile-occupation tests**

Add tests proving:
- a living enemy on the only owned bridge cell removes the beyond-bridge component from `suppliedTileIds`;
- the blocked tile remains owned by its original faction;
- removing the enemy restores the component on the next derivation;
- a combat record with `health <= 0` does not block traversal.

- [ ] **Step 2: Add failing Crown-root tests**

Add tests proving:
- an owned uncontested Crown seeds a disconnected controlled component from its center/orthogonal controlled candidates;
- a contested Crown does not seed supply;
- an unowned Crown does not seed supply;
- an owned minor node does not seed supply;
- Crown ownership does not recolour neutral cells.

- [ ] **Step 3: Run the focused graph tests to verify RED**

Run:
```bash
npx vitest run tests/sim/supply-graph.test.ts
```

Expected: hostile bridge and Crown-root cases fail while Task 1 cases stay green.

- [ ] **Step 4: Implement hostile blocking and Crown root candidates**

In `src/sim/supply.ts`:
- add a helper that treats a cell as blocked only when occupied by a living enemy;
- gather owned uncontested Crown nodes in stable node-id order;
- consider the Crown center plus topology orthogonal neighbors;
- admit only faction-controlled, enemy-unblocked candidate cells;
- union these candidates with home-edge roots before traversal;
- retain stable deterministic ordering.

- [ ] **Step 5: Run graph + node regressions**

Run:
```bash
npx vitest run   tests/sim/supply-graph.test.ts   tests/sim/nodes.test.ts   tests/sim/royal-node-topology.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/supply.ts tests/sim/supply-graph.test.ts
git commit -m "feat: add hostile cuts and crown supply roots"
```

### Task 3: Add Unit Supply Status and Exposure Progression

**Files:**
- Modify: `src/sim/supply.ts`
- Create: `tests/sim/supply-exposure.test.ts`

**Interfaces:**
- Consumes: Task 2 `deriveFactionSupply`, `WorldState.supply.exposureRoundsByUnit`.
- Produces:
  - `supplyStatusForUnit(world: WorldState, unitId: string, snapshot?: FactionSupplySnapshot): SupplyStatus`
  - `advanceSupplyExposure(world: WorldState): WorldState` or equivalent internal step used by Task 4.

- [ ] **Step 1: Write failing unit-status tests**

Add tests proving:
- a unit on a supplied owned tile reports `supplied`;
- a unit on disconnected friendly territory reports `exposed` from zero prior exposure;
- a neutral-territory raider is unsupplied;
- an enemy-territory occupier is unsupplied;
- adjacency to a supplied tile does not count;
- a missing unit does not gain an exposure entry.

- [ ] **Step 2: Write failing exposure-sequence tests**

Starting from exposure zero, resolve exposure only and assert:
- first unsupplied boundary -> count 1 / `exposed`;
- second -> count 2 / `strained`;
- third -> count 3 / `attrition`;
- supplied reconnection -> count 0 / `supplied`;
- stable unit-id iteration produces equal state regardless of insertion order.

- [ ] **Step 3: Run to verify RED**

Run:
```bash
npx vitest run tests/sim/supply-exposure.test.ts
```

Expected: FAIL because status/exposure progression APIs do not exist.

- [ ] **Step 4: Implement unit status and exposure update**

Use the unit's own cell membership in its faction snapshot. Missing exposure means zero. Process living unit ids lexicographically. Preserve only entries for currently living units; reset supplied units to zero.

- [ ] **Step 5: Run to verify GREEN**

Run:
```bash
npx vitest run tests/sim/supply-exposure.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/supply.ts tests/sim/supply-exposure.test.ts
git commit -m "feat: track deterministic supply exposure"
```

### Task 4: Apply Delayed Attrition and Canonical Death Cleanup

**Files:**
- Modify: `src/sim/supply.ts`
- Modify: `src/sim/combat.ts` only if a shared unit-removal helper is required
- Create: `tests/sim/supply-attrition.test.ts`
- Test: `tests/sim/combat.test.ts` or the repository's existing combat-death regression file

**Interfaces:**
- Consumes: Task 3 exposure progression.
- Produces:
  - `resolveSupplyAttrition(world: WorldState): WorldState`
  - exactly 10 HP damage when the newly resolved exposure count is 3 or greater.

- [ ] **Step 1: Write failing delayed-damage tests**

Assert:
- exposure 0 -> 1 causes 0 damage;
- 1 -> 2 causes 0 damage;
- 2 -> 3 causes exactly 10 HP damage;
- 3 -> 4 causes another exactly 10 HP;
- reconnection before resolution resets to zero and causes no damage;
- all unit kinds, including king/queen, use the same rule.

- [ ] **Step 2: Write failing attrition-death invariant test**

Construct a unit at <=10 HP with prior exposure 2 and assert after `resolveSupplyAttrition`:
- unit is absent from `world.units`;
- its cell is absent from `world.occupancy`;
- combat record is absent;
- military record is absent;
- exposure entry is absent;
- no unrelated unit records change.

- [ ] **Step 3: Run to verify RED**

Run:
```bash
npx vitest run tests/sim/supply-attrition.test.ts
```

Expected: FAIL because attrition resolution does not exist.

- [ ] **Step 4: Implement `resolveSupplyAttrition`**

For each living unit in stable id order:
- derive/reuse the faction snapshot;
- calculate next exposure;
- if next exposure >= 3, subtract exactly 10 health, clamped at zero;
- if health remains positive, persist combat + exposure;
- if health reaches zero, remove unit/occupancy/combat/military/exposure using one consistent cleanup path.

If combat death cleanup must be shared, extract only the smallest deterministic helper needed and keep existing combat tests unchanged.

- [ ] **Step 5: Run attrition + combat regressions**

Run:
```bash
npx vitest run   tests/sim/supply-attrition.test.ts   tests/sim/combat.test.ts
```

If the combat test filename differs, use the existing file that exercises unit death cleanup.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/supply.ts src/sim/combat.ts tests/sim/supply-attrition.test.ts
git commit -m "feat: apply delayed supply attrition"
```

### Task 5: Integrate Supply Into the Strategic Round Boundary

**Files:**
- Modify: `src/sim/turns.ts`
- Modify: `tests/sim/strategic-round-boundary.test.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`
- Test: `tests/sim/supply-attrition.test.ts`
- Test: `tests/sim/supply-graph.test.ts`

**Interfaces:**
- Consumes: `resolveSupplyAttrition(world)`.
- Produces: reinforcement boundary order:
  `settlement -> node_control -> supply_attrition -> crown_income -> banner_progress -> polarity_flip -> promotion -> deployment -> military_rank -> hero_round_state -> hero_respawn -> sovereign_truth`.

- [ ] **Step 1: Write failing stage-order test**

Assert `TRIPTYCH_ROUND_STAGE_ORDER` exactly contains `'supply_attrition'` after `'node_control'` and before `'crown_income'`.

- [ ] **Step 2: Write failing fresh-Crown integration test**

Build a reinforcement-boundary world where node control captures an uncontested Crown and the Crown is the only supply root for a disconnected owned component containing a unit. Assert the same boundary leaves that unit supplied with exposure zero.

- [ ] **Step 3: Write failing deployment-order test**

Queue a recruit while the deployment location would otherwise be unsupplied. Enter reinforcement with an already-unsupplied existing unit and assert:
- existing units are evaluated for supply;
- the new recruit is deployed later;
- the new recruit has no exposure increment on that same boundary.

- [ ] **Step 4: Run integration tests to verify RED**

Run:
```bash
npx vitest run   tests/sim/strategic-round-boundary.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/supply-attrition.test.ts
```

Expected: new stage-order/integration tests fail before turns integration.

- [ ] **Step 5: Integrate supply in `resolveGeographyStage` and stage order**

Import `resolveSupplyAttrition` in `src/sim/turns.ts`.

Update `TRIPTYCH_ROUND_STAGE_ORDER` with `'supply_attrition'`.

Run:
```text
resolveSettlement
-> evaluateNodeControlForRound
-> resolveSupplyAttrition
-> applyCrownIncome
```

Leave deployment later in `resolveForceDevelopmentStage`.

- [ ] **Step 6: Run integration regressions to verify GREEN**

Run:
```bash
npx vitest run   tests/sim/strategic-round-boundary.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/supply-graph.test.ts   tests/sim/supply-exposure.test.ts   tests/sim/supply-attrition.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/sim/turns.ts tests/sim/strategic-round-boundary.test.ts tests/sim/royal-tactical-round-gauntlet.test.ts
git commit -m "feat: resolve supply at strategic boundary"
```

### Task 6: Add Fixed-Tick and Architecture Tripwires

**Files:**
- Create: `tests/sim/supply-authority-imports.test.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`
- Test: `tests/sim/territory-claim-authority-imports.test.ts`
- Read-only proof target: `src/client/runtime/fixed-tick-runtime.ts`

**Interfaces:**
- Consumes: all supply APIs from Tasks 1-5.
- Produces: executable architecture constraints preventing supply authority from leaking into territory/client clocks.

- [ ] **Step 1: Add failing/self-proving architecture tests**

The test must prove its detector catches representative forbidden source strings, then scan runtime source for:
- canonical territory types gaining a per-tile `supplied` property;
- `src/sim/supply.ts` containing a direct gameplay `factionControl:` value write or `.factionControl =` assignment;
- `src/client/runtime/fixed-tick-runtime.ts` importing or invoking `resolveSupplyAttrition`;
- client/render/input modules importing mutation APIs from `supply.ts`.

Use Vite raw-source imports (`?raw`) rather than Node `fs/path`, matching the repository's no-`@types/node` TypeScript configuration.

- [ ] **Step 2: Strengthen the fixed-tick world-stability test**

In `royal-tactical-round-gauntlet.test.ts`, initialize non-zero exposure and advance many `SIM_TICK_MS` steps. Assert JSON world equality before/after, including unchanged exposure and health.

- [ ] **Step 3: Run architecture/fixed-tick tests**

Run:
```bash
npx vitest run   tests/sim/supply-authority-imports.test.ts   tests/sim/territory-claim-authority-imports.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts
```

Expected: PASS after any necessary test-only detector correction. Do not weaken the territorial-ownership tripwire.

- [ ] **Step 4: Commit**

```bash
git add tests/sim/supply-authority-imports.test.ts tests/sim/royal-tactical-round-gauntlet.test.ts
git commit -m "test: guard supply authority boundaries"
```

### Task 7: Add Integrated Supply Gauntlet and Replay Proof

**Files:**
- Create: `tests/sim/triptych-supply-gauntlet.test.ts`
- Test: existing replay/snapshot tests under `tests/sim`
- Modify only if required: replay/snapshot fixtures that construct `WorldState` literally

**Interfaces:**
- Consumes: completed supply graph, exposure, attrition, strategic-boundary integration.
- Produces: one deterministic V2 whole-feature acceptance proof.

- [ ] **Step 1: Write the integrated V2 gauntlet**

Create a V2 scenario that proves in one deterministic sequence:
- opening/home-edge supply exists;
- an owned corridor feeds a forward unit;
- a hostile raider cuts a one-tile bridge without changing ownership;
- the forward unit progresses through exposed and strained before taking exactly 10 HP at stage 3;
- removal/departure of the raider reconnects the corridor and resets exposure;
- an owned uncontested Crown can independently seed another disconnected controlled component;
- a contested Crown cannot;
- repeating the scenario from identical initial truth yields deeply equal final world and intermediate supply snapshots.

- [ ] **Step 2: Run the gauntlet to verify behavior**

Run:
```bash
npx vitest run tests/sim/triptych-supply-gauntlet.test.ts
```

Expected: PASS if Tasks 1-6 are complete. If RED, debug the integrated boundary before altering frozen rules.

- [ ] **Step 3: Run replay/snapshot regressions**

Locate the repository's existing replay/save/snapshot tests and run them with the supply gauntlet. Update only fixtures that require the new `WorldState.supply` field; do not serialize derived supplied tiles.

Expected: deterministic replay/save tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/sim/triptych-supply-gauntlet.test.ts tests
git commit -m "test: prove triptych supply and attrition gauntlet"
```

### Task 8: Full Repository Verification

**Files:**
- No intended production changes.
- Fix only regressions directly caused by the supply-state addition or frozen supply semantics.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: authoritative phase-completion evidence.

- [ ] **Step 1: Run focused strategic regressions**

Run:
```bash
npx vitest run   tests/sim/supply-graph.test.ts   tests/sim/supply-exposure.test.ts   tests/sim/supply-attrition.test.ts   tests/sim/strategic-round-boundary.test.ts   tests/sim/nodes.test.ts   tests/sim/fortifications.test.ts   tests/sim/territory-claims.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/triptych-supply-gauntlet.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run the authoritative full test suite**

Run:
```bash
npm test -- --maxWorkers=1
```

Expected: 0 failing test files and 0 failing tests; total tests greater than the current 580 baseline.

- [ ] **Step 3: Run TypeScript verification**

Run:
```bash
npm run typecheck
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 4: Run production build**

Run:
```bash
npm run build
```

Expected: exit 0. The existing Phaser bundle-size warning is non-fatal.

- [ ] **Step 5: Final scope audit**

Verify:
- no per-tile canonical supply state exists;
- supply never writes territorial ownership;
- no AI supply planning was added;
- no READY deployment behavior was added;
- no presentation-clock authority was added;
- no territory decay/conquest rule slipped in;
- `WorldState.supply` stores exposure only.

- [ ] **Step 6: Commit any verification-only fixture corrections**

If full-suite failures expose stale fixtures because of the new required `WorldState.supply` field, update those fixtures narrowly and commit with a test-only message. Otherwise no commit is needed.

