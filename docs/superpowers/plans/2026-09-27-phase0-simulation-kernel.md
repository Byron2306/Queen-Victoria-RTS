# Phase 0 Simulation Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, renderer-independent 16×16 simulation kernel with a fixed clock, authoritative occupancy, explicit move orders, deterministic events and replay-equivalent state.

**Architecture:** A pure TypeScript `src/sim` package owns tactical truth. Phaser is deliberately absent. `WorldState` is immutable at the public boundary: `stepWorld` consumes state plus ordered commands and returns the next state plus events. Phase 0 permits only generic one-cell orthogonal movement so kernel semantics can be proven before Phase 1 adds chess-specific geometry.

**Tech Stack:** TypeScript, Vitest, Node, npm. Phaser/Vite enter only when a browser surface exists.

**Spec:** `docs/superpowers/specs/2026-09-27-queen-victoria-real-time-chess-rts-design.md`

## Global Constraints

- Board dimensions are exactly **16×16**, coordinates `x,y` are integers in `0..15`.
- Simulation tick is fixed at **100 ms** (`10 Hz`) for Phase 0.
- Renderer/frame rate never changes simulation truth.
- Equivalent initial state + equivalent ordered commands produces equivalent state and events.
- One exclusive unit may occupy a cell; invalid/out-of-bounds moves are rejected atomically.
- Phase 0 contains no Phaser dependency, combat, chess movement geometry, economy, AI or hero abilities.
- IDs and command sequence numbers are supplied by callers; the kernel does not use randomness or wall-clock time.

## Review Focus

1. Out-of-bounds coordinates must reject without mutating occupancy: pinned in Task 2.
2. Two units targeting the same cell on the same tick must resolve deterministically by command sequence: pinned in Task 4.
3. A command for a missing unit must reject without throwing or partially applying: pinned in Task 4.
4. Re-running an identical command stream must serialize to byte-equivalent canonical state/events: pinned in Task 5.
5. Render cadence must not affect tick advancement: pinned by the exact integer tick API in Task 3 and replay test in Task 5.

---

## File structure

- `package.json` — scripts and dev dependencies only.
- `tsconfig.json` — strict TypeScript configuration.
- `src/sim/types.ts` — coordinates, entities, commands, events and world-state types.
- `src/sim/world.ts` — create/validate world, occupancy helpers, entity placement.
- `src/sim/clock.ts` — fixed-tick clock constants/helpers.
- `src/sim/step.ts` — deterministic command ordering and atomic movement resolution.
- `src/sim/replay.ts` — deterministic command-stream runner and canonical snapshot.
- `src/sim/index.ts` — public simulation exports.
- `tests/sim/world.test.ts` — grid/occupancy tests.
- `tests/sim/clock.test.ts` — tick tests.
- `tests/sim/step.test.ts` — movement/conflict/rejection tests.
- `tests/sim/replay.test.ts` — determinism tests.

### Task 1: TypeScript test harness and simulation contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/sim/types.ts`
- Create: `src/sim/index.ts`
- Test: `tests/sim/contracts.test.ts`

**Interfaces:**
- Produces: `Coord`, `UnitState`, `MoveCommand`, `SimCommand`, `SimEvent`, `WorldState`.
- `UnitState`: `{ id: string; faction: 'victoria'|'obsidian'; kind: 'pawn'|'knight'|'bishop'|'rook'|'queen'|'king'; position: Coord }`.
- `MoveCommand`: `{ type:'move'; sequence:number; issuedTick:number; unitId:string; to:Coord }`.
- `WorldState`: `{ tick:number; width:16; height:16; units:Readonly<Record<string,UnitState>>; occupancy:Readonly<Record<string,string>> }`.

- [ ] **Step 1: Write the failing contract test** asserting typed fixture construction and exported `BOARD_SIZE === 16`.
- [ ] **Step 2: Run** `npm test -- --run tests/sim/contracts.test.ts`; expect failure because the package/contracts do not exist.
- [ ] **Step 3: Add minimal npm/Vitest/strict-TypeScript setup and the declared types/constant exports.**
- [ ] **Step 4: Run** `npm test -- --run tests/sim/contracts.test.ts` and `npm run typecheck`; expect PASS.
- [ ] **Step 5: Commit** `chore: bootstrap deterministic simulation contracts`.

### Task 2: Authoritative 16×16 world and occupancy

**Files:**
- Create: `src/sim/world.ts`
- Test: `tests/sim/world.test.ts`
- Modify: `src/sim/index.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces: `coordKey(coord: Coord): string`, `isInBounds(coord: Coord): boolean`, `createWorld(units?: readonly UnitState[]): WorldState`, `placeUnit(world: WorldState, unit: UnitState): WorldState`.

- [ ] **Step 1: Write failing tests**: empty world is 16×16/tick 0; placement owns exactly one occupancy key; duplicate-cell placement throws `CellOccupiedError`; coordinates `(-1,0)`, `(16,0)`, `(0,16)` throw `OutOfBoundsError`; failed placement leaves original state unchanged.
- [ ] **Step 2: Run** `npm test -- --run tests/sim/world.test.ts`; expect missing implementation failures.
- [ ] **Step 3: Implement the four declared functions and explicit error classes without mutation of the input world.**
- [ ] **Step 4: Run world tests + typecheck; expect PASS.**
- [ ] **Step 5: Commit** `feat: add authoritative royal board occupancy`.

### Task 3: Fixed simulation clock

**Files:**
- Create: `src/sim/clock.ts`
- Test: `tests/sim/clock.test.ts`
- Modify: `src/sim/index.ts`

**Interfaces:**
- Produces: `TICK_MS = 100`, `advanceTick(world: WorldState): WorldState`.

- [ ] **Step 1: Write failing tests** asserting `TICK_MS === 100`, one call advances tick exactly by one, and ten calls represent exactly 1000 ms of simulation time without consulting wall clock.
- [ ] **Step 2: Run clock test; expect missing exports failure.**
- [ ] **Step 3: Implement `advanceTick` as a pure tick increment preserving all other state.**
- [ ] **Step 4: Run clock/world tests + typecheck; expect PASS.**
- [ ] **Step 5: Commit** `feat: add fixed simulation clock`.

### Task 4: Deterministic atomic move orders

**Files:**
- Create: `src/sim/step.ts`
- Test: `tests/sim/step.test.ts`
- Modify: `src/sim/index.ts`

**Interfaces:**
- Consumes: `WorldState`, `SimCommand`, world helpers.
- Produces: `stepWorld(world: WorldState, commands: readonly SimCommand[]): { state: WorldState; events: readonly SimEvent[] }`.
- Phase 0 legal move: exactly one orthogonal cell (`|dx| + |dy| === 1`). Chess-specific movement is Phase 1.
- Commands are resolved ascending by `(sequence, unitId)`; each accepted move immediately updates the working occupancy for later commands in the same tick.
- Event kinds: `move.accepted` and `move.rejected`; rejected event includes reason `out_of_bounds | illegal_step | missing_unit | occupied`.

- [ ] **Step 1: Write failing tests** for one legal move; diagonal/two-cell rejection; out-of-bounds rejection; missing-unit rejection; occupied-cell rejection; and two units racing for one empty cell where lower sequence wins and the other receives `occupied`.
- [ ] **Step 2: Run step tests; expect missing implementation failure.**
- [ ] **Step 3: Implement deterministic sorting, validation, atomic occupancy update and event emission; advance world tick exactly once after command resolution.**
- [ ] **Step 4: Run all tests + typecheck; expect PASS.**
- [ ] **Step 5: Commit** `feat: resolve deterministic simulation move orders`.

### Task 5: Replay equivalence and canonical snapshots

**Files:**
- Create: `src/sim/replay.ts`
- Test: `tests/sim/replay.test.ts`
- Modify: `src/sim/index.ts`

**Interfaces:**
- Produces: `runReplay(initial: WorldState, frames: readonly (readonly SimCommand[])[]): ReplayResult`, `canonicalSnapshot(result: ReplayResult): string`.
- `ReplayResult`: final state plus events grouped by tick.
- Canonical snapshot sorts unit IDs and occupancy keys lexicographically before JSON serialization.

- [ ] **Step 1: Write failing replay test** using at least two units and four ticks; run identical input twice and assert identical canonical snapshot; assert changing render-like external loop frequency cannot alter result because only frame arrays advance ticks.
- [ ] **Step 2: Run replay test; expect missing implementation failure.**
- [ ] **Step 3: Implement replay as repeated `stepWorld` calls and canonical serialization with explicit key ordering.**
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`; expect all PASS.
- [ ] **Step 5: Commit** `test: prove Phase 0 replay determinism`.

### Task 6: Phase 0 acceptance document

**Files:**
- Create: `docs/PHASE0_SIMULATION_KERNEL_ACCEPTANCE.md`

**Interfaces:**
- Consumes: verified test/typecheck outputs from Tasks 1–5.
- Produces: human-readable Phase 0 boundary and acceptance checklist.

- [ ] **Step 1: Run fresh verification:** `npm test && npm run typecheck`.
- [ ] **Step 2: Record exact commands, PASS counts, Phase 0 invariants proven, and explicit deferrals to Phase 1+ in the acceptance document.**
- [ ] **Step 3: Commit** `docs: record Phase 0 simulation kernel acceptance`.

## Self-review

Spec coverage for Phase 0: 16×16 board truth, fixed clock, entity state, deterministic explicit orders, authoritative occupancy/movement, events and replay equivalence are all assigned. Chess geometry, combat, Crown economy, nodes, hero systems, AI and Phaser are intentionally deferred per the phase boundary. Interfaces use the same `Coord`, `WorldState`, `SimCommand` and `stepWorld` names throughout. Review-focus failure modes are pinned to explicit tests.
