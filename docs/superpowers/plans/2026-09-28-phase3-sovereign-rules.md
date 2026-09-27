# Phase 3 Sovereign Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make King death deterministically end the match while exposing replay-stable real-time sovereign threat state, transition events, terminal freezing, and post-match command rejection.

**Architecture:** Add a pure `sovereign.ts` layer that derives King identity, current attack-capability threat provenance, threat transitions, and match outcomes from authoritative Phase 2 state. Keep combat authoritative for damage/death; `step.ts` only orchestrates Guard → combat → sovereign outcome → commands → sovereign threat → tick advance. Replay snapshots include normalized match state.

**Tech Stack:** TypeScript, Vitest, existing deterministic simulation kernel.

**Spec:** `docs/superpowers/specs/2026-09-28-phase3-sovereign-rules-design.md`

## Global Constraints

- King death determines victory; sovereign threat is real-time RTS danger, not orthodox chess check/checkmate.
- Phase 2 simultaneous intent collection, reciprocal lethal attacks, focus-fire aggregation, Guard behavior, positional damage, and combat-before-new-commands semantics remain authoritative.
- A terminal world does not resolve combat, retarget Guard, execute commands, or advance ticks.
- Post-match commands reject deterministically with `reason: 'match_ended'` and preserve frozen world state.
- If both Kings die in the same combat resolution, the result is `draw` regardless of insertion or iteration order.
- Threat provenance is lexicographically sorted and transition events emit only on false→true / true→false changes.
- Missing Kings in focused lower-phase fixtures are represented explicitly as unbound sovereigns, not interpreted as defeats.
- No Phaser, economy, node, production, Victoria ability, AI-strategy, or Phase 4 behavior enters this layer.

## Review Focus

1. Partial worlds with one or both Kings absent must remain valid lower-layer fixtures without accidental victory.
2. A King already dead in a terminal snapshot must not generate duplicate defeat/victory events on later calls.
3. A threatening unit killed during combat must be absent from tick-end provenance and may cause exactly one relief transition.
4. New movement can create sovereign threat at tick-end but must never create retroactive same-tick damage.
5. Simultaneous King kills must produce identical outcome and event ordering under reversed unit insertion order.

---

### Task 1: Typed match state and sovereign discovery

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Create: `src/sim/sovereign.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/sovereign-state.test.ts`

**Interfaces:**
- Consumes: existing `Faction`, `UnitState`, `WorldState`, combat registry.
- Produces: `MatchStatus`, `SovereignState`, `MatchState`, `createInitialMatchState(units)`, `findFactionKingId(units, faction)`.

- [ ] **Step 1: Write failing construction tests**

Add tests asserting that a world with both Kings binds each sovereign correctly and starts `active`, while worlds with missing Kings represent those sovereigns as explicitly unbound without declaring a winner.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/sim/sovereign-state.test.ts`
Expected: FAIL because match-state types/helpers do not exist.

- [ ] **Step 3: Add typed match contracts**

Use:

```ts
export type MatchStatus = 'active' | 'victoria_won' | 'obsidian_won' | 'draw';
export type SovereignState = Readonly<{
  kingId: string | null;
  threatened: boolean;
  threateningUnitIds: readonly string[];
}>;
export type MatchState = Readonly<{
  status: MatchStatus;
  victor: Faction | null;
  endedTick: number | null;
  sovereigns: Readonly<Record<Faction, SovereignState>>;
}>;
```

Add `match: MatchState` to `WorldState` and initialize it in `createWorld` by discovering current Kings. Do not infer defeat from an unbound sovereign.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- tests/sim/sovereign-state.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "phase3: add authoritative sovereign match state"`

### Task 2: Shared combat capability and sovereign threat provenance

**Files:**
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/sovereign.ts`
- Create: `tests/sim/sovereign-threat.test.ts`

**Interfaces:**
- Consumes: `UNIT_COMBAT_PROFILES`, living unit/combat state.
- Produces: `canUnitAttackTarget(world, attackerId, targetId): boolean`, `deriveSovereignThreat(world, faction): SovereignState`.

- [ ] **Step 1: Write failing threat tests**

Cover safe→threatened provenance, sorted multiple attacker IDs, continuously threatened state, out-of-range geometrically aligned Bishop, dead attacker exclusion, and unbound King behavior.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/sovereign-threat.test.ts`
Expected: FAIL because shared attack-capability / sovereign-threat helpers do not exist.

- [ ] **Step 3: Extract pure attack-capability helper**

Implement `canUnitAttackTarget(world, attackerId, targetId)` in `combat.ts` using the same alive/enemy/range semantics combat resolution already owns. Refactor combat resolution to call it where practical rather than duplicating range legality.

- [ ] **Step 4: Implement sovereign threat derivation**

`deriveSovereignThreat` returns the existing bound `kingId`, current `threatened` boolean, and lexicographically sorted valid enemy attacker IDs. Raw chess threat maps must not decide this state.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/sovereign-threat.test.ts tests/sim/combat-resolution.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -am "phase3: derive real-time sovereign threat provenance"`

### Task 3: Threat-transition state and events

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/sovereign.ts`
- Create: `tests/sim/sovereign-transitions.test.ts`

**Interfaces:**
- Consumes: prior `MatchState`, `deriveSovereignThreat`.
- Produces: `evaluateSovereignThreats(world): { state: WorldState; events: readonly SimEvent[] }`.

- [ ] **Step 1: Write failing transition tests**

Assert exactly one `sovereign.threatened` on false→true, no duplicate on true→true, exactly one `sovereign.relief` on true→false, and provenance updates without duplicate transition events when attacker IDs change while threat stays true.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/sovereign-transitions.test.ts`
Expected: FAIL because sovereign transition events/evaluator do not exist.

- [ ] **Step 3: Extend `SimEvent` and implement evaluator**

Add exact event contracts:

```ts
{ type: 'sovereign.threatened'; tick; faction; kingId; threateningUnitIds }
{ type: 'sovereign.relief'; tick; faction; kingId }
```

Evaluate factions in fixed order `victoria`, then `obsidian`; update match sovereign state immutably.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/sovereign-transitions.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "phase3: add sovereign threat transition events"`

### Task 4: King defeat, victory, draw, and decisive ordering

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/sovereign.ts`
- Modify: `src/sim/step.ts`
- Create: `tests/sim/sovereign-outcome.test.ts`

**Interfaces:**
- Consumes: combat `unit.killed` events and pre-combat bound sovereign IDs.
- Produces: `interpretSovereignDefeats(beforeCombat, afterCombat, combatEvents): { state: WorldState; events: readonly SimEvent[] }`.

- [ ] **Step 1: Write failing decisive-tick tests**

Cover single King death, victor + `endedTick`, two simultaneous King deaths, reversed insertion-order equivalence, no relief for a killed threatened King, and commands in the decisive tick not executing after terminal combat.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/sovereign-outcome.test.ts`
Expected: FAIL because outcome semantics do not exist.

- [ ] **Step 3: Add outcome event contracts**

Add:

```ts
{ type: 'sovereign.defeated'; tick; faction; kingId; byUnitIds }
{ type: 'match.victory'; tick; victor; defeatedFaction }
{ type: 'match.draw'; tick; defeatedKingIds }
```

- [ ] **Step 4: Implement defeat interpretation**

Use bound sovereign IDs captured before combat plus deterministic `unit.killed` provenance. Emit all combat events first, then sovereign defeats in fixed faction order, then exactly one victory/draw event. Set `endedTick` to the decisive world's current tick.

- [ ] **Step 5: Integrate into `stepWorld`**

Required order: terminal guard → Guard refresh → combat → sovereign outcome → stop if terminal → commands → sovereign threat evaluation → tick advance.

- [ ] **Step 6: Verify outcome + Phase 2 regression**

Run: `npm test -- tests/sim/sovereign-outcome.test.ts tests/sim/combat-resolution.test.ts tests/sim/guard.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

`git commit -am "phase3: make King defeat end the match deterministically"`

### Task 5: Terminal freeze and generic command rejection

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/step.ts`
- Create: `tests/sim/terminal-match.test.ts`

**Interfaces:**
- Consumes: terminal `MatchState`, all `SimCommand` variants.
- Produces: `command.rejected` events with `reason: 'match_ended'`; unchanged terminal state.

- [ ] **Step 1: Write failing terminal tests**

Test post-match move rejection, attack rejection, deterministic `(sequence, unitId)` rejection ordering, no tick advance, byte-stable repeated post-match calls, and no Guard/combat mutation.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/terminal-match.test.ts`
Expected: FAIL because generic terminal rejection does not exist.

- [ ] **Step 3: Add `command.rejected` event**

Contract:

```ts
{
  type: 'command.rejected';
  tick: number;
  sequence: number;
  unitId: string;
  commandType: SimCommand['type'];
  reason: 'match_ended';
}
```

At the very start of `stepWorld`, if terminal, return the exact same `WorldState` object/value and ordered rejection events; do not call Guard/combat/clock.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/terminal-match.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "phase3: freeze terminal matches and reject later commands"`

### Task 6: Command-created / command-removed threat integration

**Files:**
- Modify: `tests/sim/sovereign-transitions.test.ts`
- Modify: `src/sim/step.ts` only if integration exposes ordering defects.

**Interfaces:**
- Consumes: accepted Phase 2 movement and tick-end `evaluateSovereignThreats`.
- Produces: threat state/events reflecting post-command board truth without retroactive combat.

- [ ] **Step 1: Add failing integration tests**

Prove an accepted move can create threat at tick-end without same-tick King damage; an accepted move can remove the last threat and emit relief; and a threatening unit killed during combat disappears before tick-end provenance.

- [ ] **Step 2: Run focused tests and inspect RED**

Run: `npm test -- tests/sim/sovereign-transitions.test.ts`
Expected: PASS if Task 4 orchestration is already exact; otherwise RED identifies an ordering defect to fix in `step.ts`.

- [ ] **Step 3: Apply only the minimal ordering fix if required**

Do not change Phase 2 combat-before-command semantics.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/sovereign-transitions.test.ts tests/sim/kernel.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "phase3: verify post-command sovereign threat timing"`

### Task 7: Replay normalization and decisive replay equivalence

**Files:**
- Modify: `src/sim/replay.ts`
- Create: `tests/sim/phase3-replay.test.ts`

**Interfaces:**
- Consumes: Phase 3 `WorldState.match`, existing replay frames/events.
- Produces: canonical snapshots including normalized sovereign/match state.

- [ ] **Step 1: Write failing replay tests**

Run two equivalent multi-tick histories through threat onset, combat, King defeat, terminal commands, and compare both `canonicalSnapshot()` and `eventsByTick`. Include simultaneous-King draw replay.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/phase3-replay.test.ts`
Expected: FAIL because canonical snapshots omit match state.

- [ ] **Step 3: Normalize match state in `canonicalSnapshot`**

Include `status`, `victor`, `endedTick`, both sovereign records, and sorted `threateningUnitIds`. Do not add wall-clock/render state.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/phase3-replay.test.ts tests/sim/phase2-replay.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "phase3: include sovereign truth in deterministic replay"`

### Task 8: Full regression, acceptance receipt, and CI gate

**Files:**
- Create: `docs/PHASE3_SOVEREIGN_RULES_ACCEPTANCE.md`

**Interfaces:**
- Consumes: all Phase 0–3 tests.
- Produces: evidence-bound Phase 3 acceptance record.

- [ ] **Step 1: Run complete local/CI-equivalent verification**

Run:

```bash
npm test
npm run typecheck
```

Expected: every Phase 0–3 test passes.

- [ ] **Step 2: Confirm acceptance matrix coverage**

Cross-check all 20 cases in the spec against concrete automated tests. Add missing tests before acceptance.

- [ ] **Step 3: Write acceptance receipt**

Record exact head SHA, test/file counts, verification commands, decisive event ordering, draw ruling, terminal freeze ruling, missing-sovereign compatibility, and deferred Phase 4 boundary.

- [ ] **Step 4: Commit**

`git add docs/PHASE3_SOVEREIGN_RULES_ACCEPTANCE.md && git commit -m "phase3: record sovereign rules acceptance"`

- [ ] **Step 5: Verify final head in GitHub Actions**

Require successful `npm install`, `npm test`, and `npm run typecheck` on the final PR head before marking Phase 3 verified.

## Phase 3 Exit Gate

Phase 3 is complete only when all 20 spec acceptance cases are automated, the terminal state is replay-stable, simultaneous King death is order-independent, lower-phase tests remain green, and final-head GitHub Actions passes tests plus typecheck.
