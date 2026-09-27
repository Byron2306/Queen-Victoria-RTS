# Phase 1 Chess Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phase 0's generic one-cell orthogonal movement rule with deterministic, piece-specific chess geometry for Pawn, Knight, Bishop, Rook, Queen and King on the 16×16 Royal Board, including blockers, explicit geometry rejection reasons, and deterministic faction threat maps.

**Architecture:** Keep geometry pure and renderer-independent. A dedicated `geometry.ts` owns piece movement shape and ray/blocker validation; `threats.ts` projects attack pressure independently from movement rules; `step.ts` remains the deterministic command arbiter and delegates legality to geometry before atomically mutating authoritative occupancy. Phase 1 changes movement and threat geometry only: captures, attack timing, check, combat, pathfinding, promotion and hero abilities remain deferred.

**Tech Stack:** TypeScript, Vitest, existing deterministic simulation kernel.

**Spec:** `docs/superpowers/specs/2026-09-27-queen-victoria-real-time-chess-rts-design.md`

## Global Constraints

- Board remains exactly 16×16.
- Simulation remains fixed-tick, deterministic and independent of wall clock/render cadence.
- Authoritative occupancy remains simulation-owned and one unit per cell.
- Commands remain ordered deterministically by `(sequence, unitId)`.
- No capture semantics in Phase 1: any occupied destination remains rejected.
- No Phaser/rendering dependencies may enter `src/sim`.
- Pawn geometry is faction-oriented: Victoria advances toward increasing `y`; Obsidian advances toward decreasing `y`.
- Pawns receive one-cell forward movement only in Phase 1. Initial double-step, diagonal capture and en passant are explicitly deferred.
- Pawn threat geometry is diagonal-forward, intentionally distinct from Pawn movement geometry.
- Knight movement and threat projection ignore intermediate blockers.
- Bishop, Rook and Queen movement rays must be clear at every intermediate cell.
- Bishop, Rook and Queen threat rays include the first occupied cell and stop beyond it.
- King moves exactly one cell in any of eight directions; check safety is deferred to sovereign-rule work.

## Review Focus

1. Ray pieces must reject a geometrically valid movement destination when any intermediate square is occupied.
2. Threat rays must include a blocker/target square but never project beyond it.
3. Knights must jump blockers while still rejecting an occupied movement destination.
4. Pawn movement and Pawn threat direction must both be faction-correct while remaining distinct.
5. Existing deterministic conflict ordering, threat provenance ordering and replay equivalence must remain stable.

---

### Task 1: Pure piece geometry contract

**Files:**
- Create: `src/sim/geometry.ts`
- Create: `tests/sim/geometry.test.ts`
- Modify: `src/sim/index.ts`

- [ ] Write failing tests for empty-board legal and illegal movement shapes for all six unit kinds.
- [ ] Include Victoria/Obsidian pawn direction, knight L movement, bishop diagonals, rook orthogonals, queen union, king one-square adjacency, and zero-distance rejection.
- [ ] Run `npm test -- tests/sim/geometry.test.ts` and confirm RED because the geometry API does not exist.
- [ ] Implement a pure `validateMoveGeometry(world, unit, to)` returning `{ legal: true }` or `{ legal: false, reason }` with no mutation.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Run `npm run typecheck`.
- [ ] Commit `phase1: add pure chess movement geometry`.

### Task 2: Sliding-piece blockers and knight jumping

**Files:**
- Modify: `src/sim/geometry.ts`
- Modify: `tests/sim/geometry.test.ts`

- [ ] Add failing tests proving bishop/rook/queen movement rays stop at the first occupied intermediate cell.
- [ ] Add tests proving a knight can cross occupied intermediate geometry because it does not traverse a ray.
- [ ] Add edge/corner cases on the 16×16 boundary.
- [ ] Run focused tests and confirm RED.
- [ ] Implement deterministic integer ray stepping with no floating-point interpolation.
- [ ] Run focused tests and confirm GREEN.
- [ ] Run full `npm test` and `npm run typecheck`.
- [ ] Commit `phase1: enforce sliding blockers and knight jumps`.

### Task 3: Integrate geometry into authoritative movement

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/step.ts`
- Modify: `tests/sim/kernel.test.ts`

- [ ] Replace Phase 0's generic `illegal_step` expectations with explicit Phase 1 geometry rejection behavior.
- [ ] Add integration tests showing each piece can execute a legal move through `stepWorld` and an illegal geometry command is rejected atomically.
- [ ] Add regression tests for occupied destination, missing unit, out-of-bounds, command collision ordering and unchanged source occupancy after rejection.
- [ ] Run focused kernel tests and confirm RED before integration.
- [ ] Delegate movement legality from `stepWorld` to `validateMoveGeometry`; keep destination occupancy as a separate authoritative rejection.
- [ ] Run full `npm test` and `npm run typecheck`.
- [ ] Commit `phase1: integrate chess geometry into simulation step`.

### Task 4: Determinism and replay regression

**Files:**
- Modify: `tests/sim/kernel.test.ts`
- Create: `docs/PHASE1_CHESS_GEOMETRY_ACCEPTANCE.md`

- [ ] Add replay tests containing mixed Pawn/Knight/Bishop/Rook/Queen/King commands over multiple ticks.
- [ ] Prove two runs from equivalent initial state produce byte-equivalent canonical snapshots and event streams.
- [ ] Prove rejected blocker/geometry commands do not mutate state other than advancing the fixed tick.
- [ ] Run `npm test` and `npm run typecheck`.
- [ ] Record the exact verification commands and Phase 1 boundaries in the acceptance document.
- [ ] Commit `phase1: verify deterministic chess geometry`.

### Task 5: Deterministic threat maps

**Why this task was added:** During final spec reconciliation, the canonical development sequence was re-read and found to define Phase 1 as **“chess geometry, blockers and threat maps.”** The initial implementation plan covered geometry/blockers but omitted threat maps. This task closes that spec gap before Phase 1 is accepted.

**Files:**
- Create: `src/sim/threats.ts`
- Create: `tests/sim/threats.test.ts`
- Modify: `src/sim/index.ts`
- Modify: `docs/PHASE1_CHESS_GEOMETRY_ACCEPTANCE.md`

- [x] Write tests first for Pawn diagonal threats, Knight/King edge projection, sliding blockers, faction filtering, overlapping pressure and deterministic source ordering.
- [x] Run CI and observe RED because `projectThreatCells` / `buildThreatMap` do not yet exist (run `36351851073`: 6 threat tests failed, existing 26 passed).
- [x] Implement `projectThreatCells(world, unit)` with board-bounded piece-specific threat semantics.
- [x] Implement `buildThreatMap(world, faction)` as deterministic `cell -> sorted source unit ids` provenance.
- [ ] Run full CI and confirm all tests plus typecheck GREEN.
- [ ] Update acceptance evidence to include threat maps and the final green run.

## Phase 1 Exit Gate

Phase 1 is complete only when:

- all six chess-derived unit kinds have deterministic movement geometry;
- sliding blockers and knight jumps behave correctly;
- pawn direction is faction-correct;
- deterministic threat maps exist for both factions with blocker-aware ray projection;
- Pawn attack threats remain distinct from Pawn forward movement;
- occupied destinations still reject rather than capture;
- illegal movement is atomic and inspectable through events;
- replay equivalence survives mixed-piece commands;
- the full test suite and typecheck pass in CI;
- no renderer, combat, check/mate, economy, hero or AI semantics have leaked into the geometry/threat layers.
