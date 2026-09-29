# Royal War Triptych Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved Royal War Triptych into a playable deterministic strategy layer where visible board geometry, faction territory, mutable black/white polarity, Attack/Assault/Reinforce combat, fortifications, banners, veterancy, promotion, deployment and Victoria abilities all share one authoritative round-bound simulation.

**Architecture:** Preserve the current unit visual scale and rebuild the board contract beneath it. Introduce one explicit playable-tile topology for the cross-shaped battlefield, then layer `polarity` and `factionControl` independently on each tile. Strategic mutation resolves only at round boundaries; command-phase orders read a frozen authoritative board state. Combat becomes an order graph with Attack, Assault and chained Reinforce; Bastion and Manipulation systems consume the same board state rather than adding parallel rules engines.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, Phaser 4.2, Vite 7.3.

**Spec:** `docs/superpowers/specs/2026-09-29-royal-war-triptych-design.md`

## Global Constraints

- Preserve the current apparent unit scale. Expand the battlefield around the pieces; do not solve geometry by shrinking units.
- The board is cross-shaped, not a perfect square, with Shadow and Victoria major-node nooks at opposite ends and a broad central war theatre.
- Every playable logical tile must correspond to one visible physical tile. No hidden half-grid or invisible sub-cells.
- `polarity` (`black | white`) and `factionControl` (`neutral | victoria | shadow`) are independent state axes everywhere.
- Settlement changes faction control only after round resolution; passing through a tile never annexes it.
- Node capture requires at least one orthogonally adjacent friendly faction tile.
- Fortifications may only be built on friendly faction tiles and start with 3 durability.
- Banners flip black/white polarity, never faction ownership, after surviving the required two-round hold. Completed flips become authoritative only at the next round boundary.
- Attack damages without movement. Assault may advance only after a lethal attack and only if the destination remains legally occupiable.
- Reinforce is an explicit action by a deployed piece and may chain through legal support relationships with bounded/diminishing contribution.
- Military rank is independent from chess-class promotion. Initial thresholds are Recruit 0, Proven 2, Veteran 5, Elite 9, Royal Guard/Dread Guard 14 kills.
- Rank changes become authoritative at round boundaries; death permanently loses that unit's veterancy.
- Currency determines deployed army composition. Deployment must expose costs, unlocks, valid location, queued state and rejection reason.
- Existing strategic state remains deterministic and turn/round-bound. Presentation clocks must not mutate strategic authority.
- Major-node art keeps its current successful apparent size and placement, but final source assets must have genuine transparency.
- All implementation follows TDD: failing test first, then minimal implementation, then verification, then commit.

## Review Focus

1. **Topology holes and off-board inputs:** movement, attack, banner placement and construction must reject coordinates that fall inside the rectangular bounding box but outside the cross-shaped playable mask. Covered in Task 1.
2. **Round-boundary races:** a banner flip, settlement, promotion or rank increase must not retroactively invalidate an already locked order in the same round. Covered in Tasks 3, 5 and 8.
3. **Support-chain corruption:** cycles, duplicate supporters, dead links and blocked lines must not create infinite or double-counted reinforcement. Covered in Task 6.
4. **Stale presentation objects:** dead units, destroyed fortifications, completed banners and invalid highlights must disappear or refresh after world-state replacement. Covered in Tasks 2, 7 and 10.
5. **Deployment ambiguity:** insufficient currency, locked piece, occupied spawn, capacity failure and invalid territory must produce explicit non-mutating rejection states rather than silent clicks. Covered in Task 9.

---

## File Structure

### New simulation modules
- `src/sim/board-topology.ts` — canonical cross-board mask, tile IDs and neighbor queries.
- `src/sim/territory.ts` — faction-control state, settlement and node-supply rules.
- `src/sim/polarity.ts` — black/white tile state and banner mutation lifecycle.
- `src/sim/fortifications.ts` — construction legality, occupancy and durability.
- `src/sim/rank.ts` — kill totals, military-rank thresholds and modifiers.
- `src/sim/support.ts` — reinforcement graph validation and bounded support pressure.

### Existing simulation modules to modify
- `src/sim/types.ts` — tile, banner, fortification, combat-order and rank types.
- `src/sim/movement.ts` or the repository's canonical move-legality module — cross-mask and polarity-aware legality.
- `src/sim/combat.ts` — combat packets and target legality for units/fortifications.
- `src/sim/resolve-orders.ts` — Attack, Assault and Reinforce graph resolution.
- `src/sim/nodes.ts` — adjacent-territory supply requirement.
- `src/sim/turns.ts` — deterministic round-boundary strategic mutation ordering.
- `src/sim/production.ts` — explicit currency-driven deployment receipts.
- `src/sim/promotion.ts` — class promotion preserving military rank/history.
- `src/sim/hero-abilities.ts` or current Victoria ability resolver — modifiers to existing strategic verbs.

### Rendering/input modules to modify
- `src/client/render/responsive-battlefield.ts` — visible cross-board geometry.
- `src/client/board/projection.ts` — one-to-one tile polygon projection and hit-testing helpers.
- `src/client/phaser/battlefield-renderer.ts` — unit anchoring to tile footpoints and stale-sprite cleanup.
- `src/client/phaser/royal-battlefield-scene.ts` — full-tile highlights, Attack/Assault/Reinforce controls, banners, fortifications, deployment feedback and combat presentation.
- `src/client/phaser/royal-battlefield-guidance.ts` — contextual order instructions and rejection feedback.

### Tests
- `tests/sim/board-topology.test.ts`
- `tests/client/board-geometry.test.ts`
- `tests/sim/territory.test.ts`
- `tests/sim/polarity.test.ts`
- `tests/sim/fortifications.test.ts`
- `tests/sim/rank.test.ts`
- `tests/sim/support.test.ts`
- `tests/sim/assault-resolution.test.ts`
- `tests/sim/strategic-round-boundary.test.ts`
- `tests/sim/production-feedback.test.ts`
- `tests/client/royal-triptych-presentation.test.ts`

---

### Task 1: Canonical Cross-Board Topology

**Files:**
- Create: `src/sim/board-topology.ts`
- Modify: `src/sim/types.ts`
- Test: `tests/sim/board-topology.test.ts`

**Interfaces:**
- Produces: `type TileId = string`, `interface BoardTile { id; x; y; polarity; factionControl; }`, `isPlayableCell(x, y): boolean`, `orthogonalNeighbors(x, y): BoardCell[]`, `allPlayableCells(): BoardCell[]`.

- [ ] **Step 1: Write failing topology tests** proving the major-node nooks and central theatre are playable, corner voids are not, every playable cell has a stable ID, and orthogonal neighbor queries never return a void cell.
- [ ] **Step 2: Run** `npm test -- tests/sim/board-topology.test.ts` and confirm the tests fail because the topology contract does not exist.
- [ ] **Step 3: Implement** the immutable cross-board mask and helpers in `src/sim/board-topology.ts`; extend canonical state types without adding rendering concerns.
- [ ] **Step 4: Run** `npm test -- tests/sim/board-topology.test.ts && npm run typecheck` and confirm PASS.
- [ ] **Step 5: Commit** with `feat: add canonical cross battlefield topology`.

### Task 2: One Visible Tile Equals One Logical Tile

**Files:**
- Modify: `src/client/render/responsive-battlefield.ts`
- Modify: `src/client/board/projection.ts`
- Modify: `src/client/phaser/battlefield-renderer.ts`
- Test: `tests/client/board-geometry.test.ts`

**Interfaces:**
- Consumes: Task 1 playable-cell topology.
- Produces: `tilePolygon(cell): Point[]`, `tileCenter(cell): Point`, `tileFootpoint(cell): Point`, `screenPointToPlayableCell(point): BoardCell | null`.

- [ ] **Step 1: Write failing geometry tests** that assert one logical tile maps to one visible polygon, unit footpoints land inside their tile polygon, hit-testing round-trips representative center/edge cells, and points in the cross-board void return `null`.
- [ ] **Step 2: Run** `npm test -- tests/client/board-geometry.test.ts` and confirm expected failures against the old rectangular 16x16 overlay.
- [ ] **Step 3: Implement** a cross-board projection sized around the current piece footprint; do not change unit visual scaling.
- [ ] **Step 4: Anchor unit sprites to `tileFootpoint()` and ensure stale sprites are removed when the authoritative render frame no longer contains the unit.
- [ ] **Step 5: Run** geometry tests, existing renderer tests, `npm run typecheck`, and `npm run build`.
- [ ] **Step 6: Commit** with `feat: bind units and input to visible cross-board tiles`.

### Task 3: Independent Territory and Polarity State

**Files:**
- Create: `src/sim/territory.ts`
- Create: `src/sim/polarity.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/turns.ts`
- Test: `tests/sim/territory.test.ts`
- Test: `tests/sim/polarity.test.ts`
- Test: `tests/sim/strategic-round-boundary.test.ts`

**Interfaces:**
- Produces: `resolveSettlement(world): WorldState`, `hasAdjacentFactionTile(world, cell, faction): boolean`, `queueBanner(world, order): Result`, `resolveBannerProgress(world): WorldState`, `applyMaturePolarityFlips(world): WorldState`.

- [ ] **Step 1: Write failing tests** showing that settling annexes at round resolution, transit does not annex, faction control does not alter polarity, and a two-round banner flips polarity without altering faction control.
- [ ] **Step 2: Add the round-race test**: an order legal under the round's frozen polarity remains valid through that resolution; the mature banner flip affects legality only in the following command phase.
- [ ] **Step 3: Run** the three new test files and verify RED.
- [ ] **Step 4: Implement** separate territory and polarity reducers and wire them into `turns.ts` after locked-order combat resolution.
- [ ] **Step 5: Run** new tests plus full `npm test` and `npm run typecheck`.
- [ ] **Step 6: Commit** with `feat: add settlement territory and round-bound banner polarity`.

### Task 4: Node Supply and Territory-Gated Fortifications

**Files:**
- Create: `src/sim/fortifications.ts`
- Modify: `src/sim/nodes.ts`
- Modify: `src/sim/movement.ts` or canonical move-legality module
- Modify: `src/sim/combat.ts`
- Test: `tests/sim/fortifications.test.ts`
- Extend: `tests/sim/royal-node-topology.test.ts`

**Interfaces:**
- Produces: `canBuildFortification(world, faction, cell): Decision`, `buildFortification(world, order): Result`, `damageFortification(world, id, amount): WorldState`.

- [ ] **Step 1: Write failing node tests** proving occupation alone cannot capture a node without an orthogonally adjacent friendly faction tile, while supplied occupation can.
- [ ] **Step 2: Write failing fortification tests** proving construction is accepted only on friendly faction territory, starts at durability 3, blocks movement, accepts attacks, and disappears at zero durability.
- [ ] **Step 3: Run** targeted tests and verify RED.
- [ ] **Step 4: Implement** node supply gating and fortification state/legality using Task 3 territory helpers.
- [ ] **Step 5: Run** targeted tests and full simulation tests.
- [ ] **Step 6: Commit** with `feat: gate nodes and fortifications by faction territory`.

### Task 5: Military Rank and Class Promotion Separation

**Files:**
- Create: `src/sim/rank.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/promotion.ts`
- Modify: `src/sim/turns.ts`
- Test: `tests/sim/rank.test.ts`
- Extend: `tests/sim/promotion.test.ts`

**Interfaces:**
- Produces: `rankForKills(kills): MilitaryRank`, `combatModifiersForRank(rank): RankModifiers`, `resolveRankUps(world): WorldState`.

- [ ] **Step 1: Write failing tests** for thresholds 0/2/5/9/14, kill accumulation, no mid-round rank mutation, death losing veterancy, and class promotion preserving kill count/rank.
- [ ] **Step 2: Run** rank and promotion tests and verify RED.
- [ ] **Step 3: Implement** rank as persistent per-unit history independent of `kind`; apply conservative initial modifiers through one central function rather than scattering constants.
- [ ] **Step 4: Resolve rank changes at the round boundary after combat and before the next command phase.
- [ ] **Step 5: Run** rank/promotion/full simulation tests and typecheck.
- [ ] **Step 6: Commit** with `feat: add persistent military rank progression`.

### Task 6: Attack, Assault and Chained Reinforce Combat Graph

**Files:**
- Create: `src/sim/support.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/resolve-orders.ts`
- Test: `tests/sim/support.test.ts`
- Test: `tests/sim/assault-resolution.test.ts`

**Interfaces:**
- Produces: `validateSupportGraph(world, orders): SupportGraphResult`, `supportPressureForChain(world, chain): number`, explicit `attack`, `assault`, and `reinforce` order variants.

- [ ] **Step 1: Write failing Attack tests** proving damage never moves the attacker and lethal Attack leaves the target tile empty.
- [ ] **Step 2: Write failing Assault tests** proving a surviving defender bounces the attacker to its origin and a lethal legal Assault advances into the target tile.
- [ ] **Step 3: Write failing Reinforce tests** for direct support, legal multi-link chaining, bounded diminishing contribution, duplicate-support rejection, cycle rejection, dead-link removal and line-block interruption.
- [ ] **Step 4: Run** targeted tests and verify RED.
- [ ] **Step 5: Implement** one deterministic support-graph validator and one combat-resolution path. Do not implement reinforcement as repeated independent attacks.
- [ ] **Step 6: Run** targeted tests, existing combat/order tests and typecheck.
- [ ] **Step 7: Commit** with `feat: add assault and chained battlefield reinforcement`.

### Task 7: Banner Contest and Polarity-Aware Movement

**Files:**
- Modify: `src/sim/polarity.ts`
- Modify: `src/sim/movement.ts` or canonical move-legality module
- Modify: `src/sim/turns.ts`
- Test: `tests/sim/polarity.test.ts`
- Extend: movement-legality tests for bishop/knight cases.

**Interfaces:**
- Consumes: Task 3 polarity lifecycle and Task 1 topology.
- Produces: explicit polarity-aware move decisions with machine-readable rejection reasons.

- [ ] **Step 1: Write failing tests** proving a banner is contested only when an enemy completes a currently legal landing on that banner tile, not by adjacency or threat alone.
- [ ] **Step 2: Add representative bishop and knight tests** showing a completed next-round polarity mutation can remove a future legal destination according to the adopted piece rule, while already locked prior-round orders remain untouched.
- [ ] **Step 3: Run** targeted tests and verify RED.
- [ ] **Step 4: Implement** polarity-aware movement through the single canonical move-legality function so UI and simulation cannot disagree.
- [ ] **Step 5: Run** all movement/polarity tests and full simulation suite.
- [ ] **Step 6: Commit** with `feat: make banner polarity authoritative to movement`.

### Task 8: Round Resolution Order and Victoria Ability Hooks

**Files:**
- Modify: `src/sim/turns.ts`
- Modify: current Victoria hero-ability resolver
- Test: `tests/sim/strategic-round-boundary.test.ts`
- Extend: existing hero ability tests.

**Interfaces:**
- Produces the canonical round boundary sequence:
  1. lock commands against current authoritative topology,
  2. resolve Victoria orders,
  3. resolve Shadow orders,
  4. resolve combat deaths and kill receipts,
  5. resolve settlement and node control,
  6. resolve fortification/banner progress,
  7. mature polarity flips,
  8. resolve rank/class promotion and production/reinforcement queues,
  9. apply next-round authoritative topology and ability cooldown state,
  10. enter the next Victoria command phase.

- [ ] **Step 1: Write one failing end-to-end round test** that combines a legal locked order, a settlement, a banner maturation, a rank threshold and next-round legality.
- [ ] **Step 2: Write failing ability-hook tests** that require Royal Decree/Hold the Crown/Sovereign Line/Imperial Gambit to modify existing reinforcement, fortification, banner or command verbs rather than invent parallel state.
- [ ] **Step 3: Run** tests and verify RED.
- [ ] **Step 4: Refactor** `turns.ts` into named deterministic resolution stages while preserving current external turn-controller behavior.
- [ ] **Step 5: Wire** Victoria abilities as modifiers read by those stages.
- [ ] **Step 6: Run** full `npm test`, `npm run typecheck`, and `npm run build`.
- [ ] **Step 7: Commit** with `feat: unify Triptych systems at round boundaries`.

### Task 9: Currency-Driven Deployment and Explicit Feedback

**Files:**
- Modify: `src/sim/production.ts`
- Modify: `src/client/phaser/royal-battlefield-scene.ts`
- Modify: `src/client/phaser/royal-battlefield-guidance.ts`
- Test: `tests/sim/production-feedback.test.ts`
- Test: `tests/client/royal-triptych-presentation.test.ts`

**Interfaces:**
- Produces: production result receipts with at least `accepted`, `reason`, `cost`, `remainingCurrency`, `unitKind`, and queued/placed state.

- [ ] **Step 1: Write failing production tests** for success plus insufficient currency, locked unit, command-capacity failure, occupied spawn and invalid deployment territory.
- [ ] **Step 2: Write failing client tests** proving each rejected result maps to visible guidance instead of a silent click.
- [ ] **Step 3: Run** targeted tests and verify RED.
- [ ] **Step 4: Implement** typed production receipts and make the full deployment card/slot interactive, not only the small unit artwork.
- [ ] **Step 5: Render** cost/unlock/readiness state and queued deployment status in the existing HUD without changing the approved unit scale.
- [ ] **Step 6: Run** targeted tests, full tests, typecheck and build.
- [ ] **Step 7: Commit** with `feat: make deployment an explicit currency decision`.

### Task 10: Triptych Battlefield Presentation and Combat Feedback

**Files:**
- Modify: `src/client/phaser/royal-battlefield-scene.ts`
- Modify: `src/client/phaser/battlefield-renderer.ts`
- Modify: `src/client/phaser/royal-battlefield-guidance.ts`
- Test: `tests/client/royal-triptych-presentation.test.ts`

**Interfaces:**
- Consumes all prior simulation receipts and geometry helpers.
- Produces no strategic authority; presentation is a pure view of authoritative state and staged orders.

- [ ] **Step 1: Write failing presentation tests** proving move highlights use the exact projected tile polygon/footprint, Attack and Assault have distinct staged visuals, Reinforce links are visible, dead-unit sprites disappear, fortification destruction removes blockers, and stale banner/highlight objects are cleared after world replacement.
- [ ] **Step 2: Run** client tests and verify RED.
- [ ] **Step 3: Replace viewport-percentage highlight sizing** with exact tile geometry from Task 2. A legal destination must visually occupy one actual board tile.
- [ ] **Step 4: Add combat receipts**: hit flash, damage number or health change, death cleanup, Attack-stays-put feedback, Assault advance/bounce feedback, and Reinforce-chain visualization.
- [ ] **Step 5: Render** faction-control overlay separately from black/white tile identity; render banners, fortifications and rank pips from authoritative state.
- [ ] **Step 6: Swap major-node source art to transparent-background assets when available without changing their approved apparent scale/anchors.
- [ ] **Step 7: Run** `npm test`, `npm run typecheck`, `npm run build` and a local browser smoke test covering move, Attack, Assault, Reinforce, settlement, banner, fortification, deployment and rank-up.
- [ ] **Step 8: Commit** with `feat: present the Royal War Triptych battlefield`.

### Task 11: Whole-System Gauntlet and Balance-Safe Defaults

**Files:**
- Create: `tests/sim/royal-triptych-gauntlet.test.ts`
- Update: documentation only for constants proven by tests.

**Interfaces:**
- Validates the integrated rules contract; does not introduce new mechanics.

- [ ] **Step 1: Write an integrated deterministic scenario** with both factions that includes currency purchase, settlement creep, supplied node capture, fortification, banner placement and contest, a chained Reinforce Assault, kill/rank progression and a next-round polarity change.
- [ ] **Step 2: Assert** replaying the same command sequence from the same initial state yields identical final world state and receipts.
- [ ] **Step 3: Add doctrine counterweight assertions** showing no unconditional auto-win from support-chain length, fortification durability or rank alone; each uses capped/modifier logic rather than infinite scaling.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build` and require all three commands to pass.
- [ ] **Step 5: Commit** with `test: add Royal War Triptych deterministic gauntlet`.

---

## Execution Order

The tasks are intentionally dependency-ordered. Do not parallelize Tasks 1-3, 6-8 or 9-10 because their interfaces build directly on one another. Tasks 4 and 5 may be implemented in parallel only after Task 3 is merged and only if separate worktrees are used. Task 11 is the final whole-branch gate.

## Completion Gate

The Triptych implementation is complete only when:

- one visible physical tile equals one simulation tile across the cross board,
- unit sprites are tile-bound without changing their approved apparent scale,
- Attack visibly damages and stays put,
- Assault visibly advances only after lethal legal resolution,
- Reinforce chains resolve deterministically with bounded support,
- settlement and faction territory visibly spread independently of black/white polarity,
- nodes require adjacent supplied territory,
- fortifications require friendly territory and survive multiple hits,
- banners flip polarity only after the delayed round-bound lifecycle and can only be contested by legal landing,
- military rank persists across class promotion and disappears on unit death,
- deployment is currency-driven and never fails silently,
- Victoria abilities modify the shared strategic verbs,
- all strategic mutations occur at deterministic round boundaries,
- `npm test`, `npm run typecheck`, and `npm run build` all pass.
