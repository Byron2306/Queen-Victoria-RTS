# Triptych Battlefield Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic faction-relative battlefield intelligence with geometric line of sight, stale last-known ghosts, owned-territory visibility, watchtower fortifications/nodes, knowledge-bounded movement and fair non-omniscient AI.

**Architecture:** Keep shared battlefield truth unchanged: polarity, faction control, occupancy, units, banners, nodes and fortifications remain authoritative in `WorldState`. Add a separate per-faction `intelligence` slice containing only what each faction currently observes or remembers. `vision.ts` computes live sight from units, owned tiles, nodes and fortifications; `intelligence.ts` updates faction memories from current sight without leaking unseen truth; legality and AI consume intelligence-aware helpers rather than raw hidden state.

**Tech Stack:** TypeScript, Vitest, deterministic immutable simulation state, Phaser client.

**Spec:** `docs/superpowers/specs/2026-09-29-triptych-battlefield-intelligence-doctrine.md`

## Global Constraints

- The board terrain remains visible; hidden information is represented as intelligence state, not black fog.
- Visibility is faction-relative and must never be stored directly on shared `BoardTile` truth.
- Owned faction tiles are always currently observed by their owner.
- Remembered tiles retain stale last-known truth until re-observed; hidden changes must never update enemy memory.
- Ghosts are memory records only: they never occupy cells, block movement, satisfy combat, or become legal targets.
- Ordinary units do not block strategic sight; fortifications do.
- Unknown terrain cannot be entered by normal movement; remembered terrain may be entered subject to authoritative resolution.
- Sliding-piece destinations and paths may not extend through unknown intelligence beyond the visible/remembered frontier.
- Knight vision is projected onto legal L-hop destination cells rather than through intervening cells.
- AI must plan from its own faction knowledge and may not inspect hidden enemy truth.
- No intelligence rule may weaken existing polarity, occupancy, fortification, attack, Assault, Reinforce, rank, settlement, node or deterministic round semantics.

## Review Focus

- Hidden polarity/banner changes must remain stale in enemy memory until re-observed.
- Ghost contacts must never leak into authoritative occupancy, targeting or sovereign-threat calculations.
- Sliding movement must reject a destination if any required traversed tile is unknown even when pure chess geometry is legal.
- Node/fortification visibility must disappear when ownership/structure is lost while preserving remembered state.
- AI target scoring and path generation must exclude currently unobserved enemy truth.

---

### Task 1: Add Canonical Intelligence State and Memory Types

**Files:**
- Modify: `src/sim/types.ts`
- Create: `src/sim/intelligence.ts`
- Modify: `src/sim/world.ts`
- Test: `tests/sim/intelligence-state.test.ts`

**Interfaces:**
- Produces: `VisibilityState`, `TileMemory`, `FactionIntelligenceState`, `IntelligenceState`, `createInitialIntelligenceState()`, `getTileMemory(world, faction, cell)`.
- Later tasks consume `world.intelligence` and these selectors.

- [ ] **Step 1: Write failing tests** asserting a new world contains per-faction memory for every playable tile, every tile begins `unknown` before the first refresh, and memory is not stored on `BoardTile`.
- [ ] **Step 2: Run** `npx vitest run tests/sim/intelligence-state.test.ts` and verify failure for missing intelligence types/state.
- [ ] **Step 3: Implement types and initialization** in `src/sim/types.ts`, `src/sim/intelligence.ts`, and `createWorld()`.
- [ ] **Step 4: Run** `npx vitest run tests/sim/intelligence-state.test.ts` and verify PASS.
- [ ] **Step 5: Commit** `feat: add faction battlefield intelligence state`.

### Task 2: Compute Geometric Vision Sources

**Files:**
- Create: `src/sim/vision.ts`
- Modify: `src/sim/fortifications.ts`
- Test: `tests/sim/geometric-vision.test.ts`

**Interfaces:**
- Consumes: `WorldState`, `UnitState`, playable cells, current movement/polarity helpers, `getFortificationAt`.
- Produces: `visibleCellsForUnit(world, unit): readonly Coord[]`, `visibleCellsForFortification(world, fortification): readonly Coord[]`, `visibleCellsForNode(world, node, faction): readonly Coord[]`, `computeFactionVisibleCells(world, faction): ReadonlySet<TileId>`.

- [ ] **Step 1: Write failing tests** for: pawn sees one surrounding ring; knight sees only legal L-hop windows; rook sees three orthogonal tiles; bishop sees three diagonal tiles; queen combines rook+bishop sight; king sees two surrounding rings; ordinary units do not block sight; fortifications terminate ray sight behind themselves.
- [ ] **Step 2: Add tests** that owned faction tiles are visible and controlled minor/major nodes contribute their configured local sight footprint.
- [ ] **Step 3: Add tests** that Bastion and Redoubt vision differ, using `FortificationKind = 'bastion' | 'redoubt'`, and that destroying a fortification removes its live watchtower sight.
- [ ] **Step 4: Run** `npx vitest run tests/sim/geometric-vision.test.ts` and verify failures.
- [ ] **Step 5: Implement minimal vision algorithms** and fortification kind support. Use deterministic tile sets sorted by `tileId`; do not mutate world state.
- [ ] **Step 6: Run** the test file and verify PASS.
- [ ] **Step 7: Commit** `feat: add chess-geometric battlefield vision`.

### Task 3: Refresh Current Observation and Preserve Stale Memory

**Files:**
- Modify: `src/sim/intelligence.ts`
- Modify: `src/sim/turns.ts`
- Test: `tests/sim/intelligence-memory.test.ts`

**Interfaces:**
- Consumes: `computeFactionVisibleCells(world, faction)`.
- Produces: `refreshFactionIntelligence(world, faction): WorldState`, `refreshAllIntelligence(world): WorldState`, `isTileObserved(world, faction, cell)`, `isTileKnown(world, faction, cell)`.

- [ ] **Step 1: Write failing tests** proving an observed tile snapshots current polarity, control, unit, banner, fortification and `lastSeenRound`.
- [ ] **Step 2: Write failing tests** proving a tile that leaves sight changes to `remembered` without changing its stored snapshot.
- [ ] **Step 3: Write the hidden-trap regression:** observe a white tile, lose LOS, secretly flip authoritative polarity to black, refresh enemy intelligence, assert remembered polarity is still white; restore LOS and assert it becomes black.
- [ ] **Step 4: Write ghost tests:** enemy leaving sight leaves `lastKnownUnitId`; moving the actual unit elsewhere does not move the ghost; re-observing the old empty tile clears that ghost.
- [ ] **Step 5: Run** `npx vitest run tests/sim/intelligence-memory.test.ts` and verify failures.
- [ ] **Step 6: Implement refresh semantics** so only currently visible cells read authoritative truth. Integrate refresh at world initialization and deterministic phase boundaries without altering existing round ordering semantics.
- [ ] **Step 7: Run** tests and verify PASS.
- [ ] **Step 8: Commit** `feat: preserve stale battlefield intelligence`.

### Task 4: Enforce Knowledge-Bounded Movement and Targeting

**Files:**
- Create: `src/sim/knowledge-legality.ts`
- Modify: movement/order validation call sites that consume `validateMoveGeometry`
- Modify: Attack/Assault validation in the existing resolution path
- Modify: `src/sim/types.ts`
- Test: `tests/sim/intelligence-legality.test.ts`

**Interfaces:**
- Produces: `validateMoveKnowledge(world, faction, from, to): KnowledgeResult`, `targetIsObserved(world, faction, targetId): boolean`.
- Adds rejection reasons `unknown_destination`, `unknown_path`, `target_not_observed` where the existing result types permit typed reasons.

- [ ] **Step 1: Write failing tests** that an unknown destination is rejected while a remembered legal destination is allowed.
- [ ] **Step 2: Write failing sliding-piece tests** that Rook/Bishop/Queen may not traverse required unknown cells even when `validateMoveGeometry` is otherwise legal.
- [ ] **Step 3: Write the named regression** `queen_cannot_leeeeroooy_through_unknown_territory`.
- [ ] **Step 4: Write Knight tests** proving an observed legal L-hop destination remains usable without requiring knowledge of intervening cells.
- [ ] **Step 5: Write Attack/Assault tests** proving observed enemies are targetable and ghost/unobserved enemies are rejected.
- [ ] **Step 6: Run** `npx vitest run tests/sim/intelligence-legality.test.ts` and verify failures.
- [ ] **Step 7: Implement knowledge legality as a second gate** after existing geometry/occupancy/polarity legality; do not merge intelligence concerns into `validateMoveGeometry`.
- [ ] **Step 8: Run** tests and verify PASS.
- [ ] **Step 9: Commit** `feat: bound orders by battlefield knowledge`.

### Task 5: Keep Reinforcement, Sovereign and Ghost Semantics Honest

**Files:**
- Modify only if tests expose leaks: existing Reinforce/support, sovereign and combat selectors
- Test: `tests/sim/intelligence-authority-boundary.test.ts`

**Interfaces:**
- Consumes: authoritative `world.units` and intelligence selectors.
- Produces no new public interface unless a leak requires a shared helper.

- [ ] **Step 1: Write tests** proving ghosts do not populate occupancy, block movement, contribute Reinforce, threaten a sovereign, capture nodes or satisfy combat target existence.
- [ ] **Step 2: Write tests** proving a currently unobserved real enemy remains authoritative for simulation resolution while being unavailable to the opposing player as an issued target.
- [ ] **Step 3: Run** the authority-boundary test and verify any failures.
- [ ] **Step 4: Make only minimal corrections** where presentation/intelligence state leaked into authoritative selectors.
- [ ] **Step 5: Run** the test and existing Triptych combat/reinforcement/sovereign suites.
- [ ] **Step 6: Commit** `test: enforce intelligence authority boundaries` (or `fix:` if production changes are required).

### Task 6: Give Shadow AI the Same Imperfect Information

**Files:**
- Modify: `src/sim/ai.ts`
- Create or extend: `src/sim/intelligence-view.ts`
- Test: `tests/sim/ai-intelligence.test.ts`

**Interfaces:**
- Produces: `createFactionKnowledgeView(world, faction)` or equivalent selectors that expose friendly live truth plus observed enemy truth and remembered contacts without hidden enemy positions.
- AI scoring/path generation must consume faction knowledge for enemy selection and objective reasoning.

- [ ] **Step 1: Write failing tests** where an enemy unit outside Obsidian LOS exists in authoritative state but does not appear in AI pressure/target candidates.
- [ ] **Step 2: Write tests** proving observed enemies re-enter AI targeting and stale ghosts may inform investigation but cannot become Attack targets.
- [ ] **Step 3: Write a trap test** where hidden polarity/fortification truth remains unavailable to AI until re-observed.
- [ ] **Step 4: Run** `npx vitest run tests/sim/ai-intelligence.test.ts` and verify failures.
- [ ] **Step 5: Refactor AI enemy enumeration and movement candidate generation** to knowledge-aware selectors while preserving deterministic sort order.
- [ ] **Step 6: Run** the AI test plus existing AI suites and verify PASS.
- [ ] **Step 7: Commit** `feat: make Shadow AI obey battlefield intelligence`.

### Task 7: Persist Intelligence Through Save/Load and Replay

**Files:**
- Modify: `src/client/persistence/save-game.ts`
- Modify replay migration path if separate from save serialization
- Test: `tests/client/save-game-intelligence.test.ts`
- Test: replay test nearest the current replay suite

**Interfaces:**
- SAVE_VERSION increments from `2` to `3`.
- Version-2 saves migrate by creating/refeshing intelligence deterministically from the loaded world rather than inventing stale history.

- [ ] **Step 1: Write failing tests** that version-3 save/load preserves remembered polarity, last-known unit ghost and last-seen round exactly.
- [ ] **Step 2: Write migration test** for version-2 saves receiving valid initialized intelligence.
- [ ] **Step 3: Write replay determinism assertion** that identical commands produce identical final `intelligence` state.
- [ ] **Step 4: Run** targeted save/replay tests and verify failures.
- [ ] **Step 5: Implement save version migration and replay support.**
- [ ] **Step 6: Run** targeted tests and verify PASS.
- [ ] **Step 7: Commit** `feat: persist battlefield intelligence`.

### Task 8: Provide a Safe Faction Presentation Model for Phaser

**Files:**
- Create: `src/client/intelligence/presented-world.ts`
- Create: `src/client/render/intelligence-overlay.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Test: `tests/client/presented-world-intelligence.test.ts`
- Test: `tests/client/intelligence-overlay.test.ts`

**Interfaces:**
- Produces: `createPresentedWorld(world, faction)` containing live observed enemy units, remembered ghost contacts, tile visibility, and no hidden enemy truth.
- Produces renderer data for `observed`, `remembered`, `unknown` without changing simulation authority.

- [ ] **Step 1: Write failing presentation-model tests** proving hidden enemy units are absent, observed units are live, remembered contacts are ghost records, and stale polarity is sourced from memory.
- [ ] **Step 2: Write failing overlay tests** proving observed tiles render normal treatment, remembered tiles subdued treatment, unknown tiles terrain-only information-muted treatment, and ghosts carry `lastSeenRound` metadata.
- [ ] **Step 3: Run** targeted client tests and verify failures.
- [ ] **Step 4: Implement the faction-filtered adapter and overlay model.** Phaser may consume only the presented model for enemy battlefield presentation.
- [ ] **Step 5: Run** client tests and verify PASS.
- [ ] **Step 6: Commit** `feat: render faction-relative battlefield intelligence`.

### Task 9: Full Intelligence Gauntlet and Regression Gate

**Files:**
- Create: `tests/sim/triptych-intelligence-gauntlet.test.ts`
- Modify: CI workflow only if the current test command does not already include the new suites.

**Interfaces:**
- Consumes all tasks above.
- Produces one deterministic end-to-end scenario covering scouting, stale memory, deception, watchtower loss, re-observation and knowledge-bounded orders.

- [ ] **Step 1: Write an integrated scenario**: Victoria observes a white frontier tile; loses LOS; Shadow plants/matures a hidden banner and flips it black; a ghost contact moves; Victoria attempts an illegal long Queen move and is refused; a Knight reveals a hop-window; a Bastion grants sight; Bastion destruction removes live sight; re-observation corrects stale tile and ghost memory.
- [ ] **Step 2: Add AI assertion** that Shadow never targets a currently hidden Victoria unit during the scenario.
- [ ] **Step 3: Run** `npx vitest run tests/sim/triptych-intelligence-gauntlet.test.ts` and verify PASS after preceding tasks.
- [ ] **Step 4: Run full verification:** `npm test`, `npm run typecheck`, `npm run build`.
- [ ] **Step 5: Run `git diff --check`** and inspect status for accidental asset/generated-file changes.
- [ ] **Step 6: Commit** `test: verify Triptych battlefield intelligence gauntlet`.

## Deferred Follow-On Plans

These are deliberately not folded into this plan because each is an independently reviewable subsystem:

1. **Expansive battlefield camera and navigation**: free-roam pan, drag, edge-pan, zoom, centering and large-board viewport constraints.
2. **Visible combat presentation sequencer**: attack wind-up, projectile/strike, impact, hit reaction, health transition, death, Assault advance and fortification destruction synchronized to simulation receipts.
3. **Final expansive board/topology pass**: longer north/south corridors, exact node/deployment/starting-fortification coordinates and final art-to-geometry projection.

## Self-Review Notes

- Spec coverage: intelligence states, owned-territory sight, geometric unit sight, fortification/node beacons, stale ghosts, hidden banner/polarity deception, knowledge-bounded movement, fair AI and persistence are all assigned to tasks.
- Authority boundary: ghosts remain outside `world.units`/`occupancy`; presentation consumes a filtered adapter.
- Type consistency: `world.intelligence`, `VisibilityState`, `TileMemory`, `computeFactionVisibleCells`, `refreshFactionIntelligence`, `validateMoveKnowledge`, and `createPresentedWorld` are the stable cross-task names.
- Review-focus risks each have explicit tests in Tasks 3, 4, 5 and 6.
- Scope intentionally excludes camera navigation, combat animation sequencing and final board coordinate expansion so this plan can ship/test independently.
