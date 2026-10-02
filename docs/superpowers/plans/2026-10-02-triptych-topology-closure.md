# Triptych Topology Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every live V1 spatial-authority leak from the restored V2 game so all gameplay, intelligence, AI, production and presentation behavior derives battlefield geometry from the selected `WorldState` topology.

**Architecture:** Keep `board-topology.ts` as historical V1 compatibility/type support, but forbid live world-aware systems from using it to decide playability, enumeration, bounds, neighbors or ray termination. World-aware code resolves geometry through `topologyForWorld(world)` / `getBattlefieldTopology(...)`; source-level architectural tests prevent regressions.

**Tech Stack:** TypeScript, Vitest 3.2.7, Phaser 3, existing `battlefield-topology-authority.ts`, existing `triptych-topology-v2.ts`.

**Spec:** `docs/superpowers/specs/2026-10-02-triptych-ideal-system-restoration-design.md`

## Global Constraints

- Preserve the verified V2 battlefield: 32x32 world, 496 playable cells, playable iff `x in 12..19 OR y in 11..20`.
- Historical V1 behavior remains available only for explicit compatibility tests/fixtures.
- No live V2 behavior may silently fall back to V1 geometry.
- Use TDD for every behavioral change: RED must be observed before production edits.
- Do not redesign intelligence, economy, deployment, combat or art in this plan.
- Do not merge historical branches.
- Keep deterministic ordering and replay behavior unchanged.
- Full completion gate remains `npm test -- --maxWorkers=1`, `npm run typecheck`, `npm run build`.

## Review Focus

- Valid V2 cells outside historical V1 bounds must remain fully governed by LOS, intelligence and movement-knowledge rules.
- V2 void-corner cells inside the 32x32 rectangle must be rejected by every live spatial authority.
- Presented faction worlds must contain exactly 496 V2 tiles and no V1-only enumeration.
- Recruitment/spawn and direct unit placement must not accept a rectangularly in-bounds V2 void cell.
- Historical V1 tests must continue to pass when V1 is explicitly selected.

---

### Task 1: Add a Topology-Authority Architectural Tripwire

**Files:**
- Create: `tests/sim/topology-authority-imports.test.ts`
- Read/audit: `src/**/*.ts`

**Interfaces:**
- Consumes: repository source tree.
- Produces: one test that fails whenever a live world-aware module directly imports V1 geometry authority from `board-topology.ts` outside an explicit allowlist.

- [ ] **Step 1: Write the failing source-architecture test**

Create `tests/sim/topology-authority-imports.test.ts` with a test named `forbids live world-aware modules from importing V1 geometry authority`.

It must recursively inspect `src/**/*.ts` and fail when a non-allowlisted module imports any of these runtime geometry symbols from `board-topology`:

```ts
[
  'isPlayableCell',
  'allPlayableCells',
  'createBoardTile',
  'BOARD_WIDTH',
  'BOARD_HEIGHT',
  'orthogonalNeighbors',
]
```

Allow imports of serialization/types such as `tileId`, `TileId`, `FactionControl`, `TilePolarity`, and explicitly documented V1 compatibility modules/tests.

The initial RED failure must identify at least the currently confirmed stale consumers:

- `src/sim/vision.ts`
- `src/sim/knowledge-legality.ts`
- `src/client/intelligence/presented-world.ts`
- `src/sim/production.ts`

- [ ] **Step 2: Run the architectural test and verify RED**

Run:

```bash
npx vitest run tests/sim/topology-authority-imports.test.ts --maxWorkers=1
```

Expected: FAIL listing one or more confirmed stale imports above.

- [ ] **Step 3: Commit the RED characterization test**

```bash
git add tests/sim/topology-authority-imports.test.ts
git commit -m "test: expose stale V1 topology authority imports"
```

---

### Task 2: Make Geometric Vision Resolve the Selected World Topology

**Files:**
- Modify: `src/sim/vision.ts`
- Modify: `tests/sim/geometric-vision.test.ts`
- Modify: `tests/sim/triptych-battlefield-intelligence-gauntlet.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world): BattlefieldTopologyAuthority`.
- Produces: topology-aware LOS for units, forts, nodes and faction-visible-cell accumulation without changing existing range semantics.

- [ ] **Step 1: Add failing V2 LOS regressions**

Add tests proving:

1. a Victoria/Obsidian unit on a valid V2 cell with `x >= 24` generates sight on valid neighboring/ray cells;
2. ray sight stops when the next coordinate is a V2 void cell even though it is inside `0..31` rectangular bounds;
3. fortification and owned-node beacon sight at V2 coordinates enumerate only V2-playable cells;
4. `computeFactionVisibleCells()` includes valid controlled V2 cells beyond the V1 footprint.

Use coordinates from the frozen V2 map such as `(27,18)`, `(25,15)`, `(15,1)`, and a void corner such as `(2,2)`.

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
npx vitest run tests/sim/geometric-vision.test.ts tests/sim/triptych-battlefield-intelligence-gauntlet.test.ts --maxWorkers=1
```

Expected: at least one new V2 assertion FAILS because `vision.ts` still calls V1 `isPlayableCell()`.

- [ ] **Step 3: Migrate `vision.ts` to world topology authority**

Refactor helper signatures so world-aware topology reaches every playability decision:

```ts
surroundingCells(world: WorldState, center: Coord, range: number): readonly Coord[]
localBeaconCells(world: WorldState, center: Coord, range: number): readonly Coord[]
rayCells(world: WorldState, origin: Coord, directions: readonly Readonly<{x:number;y:number}>[], range: number): readonly Coord[]
```

Inside each helper resolve/use `topologyForWorld(world).isPlayableCell(...)`. `visibleCellsForFortification()` and `visibleCellsForNode()` must stop ignoring their `world` argument. Keep `tileId` ordering unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/vision.ts tests/sim/geometric-vision.test.ts tests/sim/triptych-battlefield-intelligence-gauntlet.test.ts
git commit -m "fix: make Triptych vision topology aware"
```

---

### Task 3: Make Knowledge Legality Topology-Aware

**Files:**
- Modify: `src/sim/knowledge-legality.ts`
- Modify: `tests/sim/intelligence-legality.test.ts`
- Modify: `tests/sim/intelligence-authority-boundary.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world)` and existing `isTileKnown` / `isTileObserved`.
- Produces: `validateMoveKnowledge(...)` and `targetIsObserved(...)` that apply intelligence rules across all selected-topology playable cells and bypass only truly non-battlefield fixtures.

- [ ] **Step 1: Add failing V2 knowledge-boundary tests**

Add tests proving:

- a valid V2 destination beyond historical V1 bounds is rejected as `unknown_destination` when unknown;
- a rook/bishop/queen path through a valid unknown V2 cell is rejected as `unknown_path`;
- a V2 void destination remains outside battlefield intelligence authority and is left for ordinary geometry validation;
- an enemy on a valid V2 cell outside V1 bounds must be observed to be targetable;
- explicit V1 fixtures retain their existing behavior.

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/sim/intelligence-legality.test.ts tests/sim/intelligence-authority-boundary.test.ts --maxWorkers=1
```

Expected: new V2 assertions FAIL because `knowledge-legality.ts` still imports V1 `isPlayableCell()`.

- [ ] **Step 3: Replace V1 checks with selected-world topology**

At the start of each exported validator resolve:

```ts
const topology = topologyForWorld(world);
```

Use `topology.isPlayableCell(...)` for origin, destination, intermediate sliding cells and target positions. Preserve all existing knowledge semantics and reject reasons.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/knowledge-legality.ts tests/sim/intelligence-legality.test.ts tests/sim/intelligence-authority-boundary.test.ts
git commit -m "fix: bind knowledge legality to world topology"
```

---

### Task 4: Make Faction Presentation Enumerate the Selected Topology

**Files:**
- Modify: `src/client/intelligence/presented-world.ts`
- Modify: `tests/client/presented-world-intelligence.test.ts`
- Modify: `tests/client/phaser-intelligence-projection.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world).allPlayableCells()` and selected-world strategic tile state.
- Produces: `createPresentedWorld(...)` with exactly the selected topology's cells; `createPresentedWorldState(...)` without V1 `createBoardTile()` validation.

- [ ] **Step 1: Add failing V2 presentation tests**

Add assertions that for a `triptych-v2` world:

```ts
expect(presented.tiles).toHaveLength(496);
expect(presented.tiles.some(tile => tile.cell.x === 27 && tile.cell.y === 18)).toBe(true);
expect(presented.tiles.some(tile => tile.cell.x === 2 && tile.cell.y === 2)).toBe(false);
```

Also prove a remembered ghost and remembered polarity/control on a valid V2 cell beyond V1 bounds survives `createPresentedWorld()` and `createPresentedWorldState()`.

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/client/presented-world-intelligence.test.ts tests/client/phaser-intelligence-projection.test.ts --maxWorkers=1
```

Expected: new V2 enumeration assertion FAILS because `allPlayableCells()` is V1.

- [ ] **Step 3: Migrate presentation enumeration and tile reconstruction**

Use:

```ts
const topology = topologyForWorld(world);
const cells = topology.allPlayableCells();
```

Do not call V1 `createBoardTile()` for reconstructed V2 presentation tiles. Rebuild the presentation tile from its `id`, `cell`, remembered polarity/control and the selected world's corresponding strategic tile/base polarity rules already used by the sim. Preserve unknown information masking.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/intelligence/presented-world.ts tests/client/presented-world-intelligence.test.ts tests/client/phaser-intelligence-projection.test.ts
git commit -m "fix: present faction worlds on selected topology"
```

---

### Task 5: Close Production, Spawn and Direct-Placement Geometry Seams

**Files:**
- Modify: `src/sim/production.ts`
- Modify as required after usage audit: `src/sim/spawn.ts`
- Modify: `src/sim/world.ts`
- Modify: `tests/sim/reinforcements.test.ts`
- Modify: `tests/sim/world-topology-authority.test.ts`
- Modify: `tests/sim/triptych-reinforcement-anchors-v2.test.ts`

**Interfaces:**
- Consumes: selected world topology.
- Produces: no ordinary reinforcement or direct unit placement may treat a V2 void cell as valid merely because it lies inside `world.width/world.height`.

- [ ] **Step 1: Add failing V2 void-placement regressions**

Add tests proving:

- `placeUnit()` refuses or deterministically rejects placement at a V2 void coordinate such as `(2,2)`;
- valid V2 placement such as `(27,18)` remains allowed;
- reinforcement anchor/spawn validation uses the selected topology rather than V1 `isPlayableCell()`;
- V1 explicit worlds retain their historical valid cells.

Do not implement READY deployment here. This task only closes geometry authority in the existing temporary reinforcement path.

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/sim/world-topology-authority.test.ts tests/sim/reinforcements.test.ts tests/sim/triptych-reinforcement-anchors-v2.test.ts --maxWorkers=1
```

Expected: at least the V2 void direct-placement assertion FAILS against the current rectangular-only `placeUnit()` validation.

- [ ] **Step 3: Make `placeUnit()` validate selected topology**

In `src/sim/world.ts`, resolve world topology and reject any destination for which `topology.isPlayableCell(x,y)` is false. Preserve existing occupancy/combat/military initialization semantics.

- [ ] **Step 4: Make temporary reinforcement/spawn geometry topology-aware**

Remove V1 `isPlayableCell` use from `production.ts` and any `spawn.ts` path used by ordinary reinforcement. Derive valid cells from the selected topology. Do not redesign auto-spawn semantics yet; READY deployment belongs to its later plan.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run Step 2 command.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/world.ts src/sim/production.ts src/sim/spawn.ts tests/sim/world-topology-authority.test.ts tests/sim/reinforcements.test.ts tests/sim/triptych-reinforcement-anchors-v2.test.ts
git commit -m "fix: close V2 placement and spawn topology seams"
```

---

### Task 6: Audit Projection and Remaining Runtime Geometry Call Sites

**Files:**
- Modify only files identified by the architectural tripwire/runtime census.
- Likely review: `src/client/board/projection.ts`
- Likely review: `src/client/board/interactive-board-grid.ts`
- Likely review: `src/client/input/board-pointer-cell.ts`
- Likely review: `src/client/render/triptych-presentation.ts`
- Test: existing topology-authority tests under `tests/client/` and `tests/sim/`.

**Interfaces:**
- Consumes: selected topology ID/world topology at live V2 call sites.
- Produces: no live runtime call site depends on a default V1 topology when it already has world/topology context available.

- [ ] **Step 1: Run a complete source census**

```bash
rg -n "board-topology|isPlayableCell|allPlayableCells|createBoardTile|BOARD_WIDTH|BOARD_HEIGHT|orthogonalNeighbors" src
```

Classify every hit as either:

1. allowed serialization/type/V1 compatibility use, or
2. forbidden live geometry authority.

Record the classification in the commit message/body or test comments where non-obvious.

- [ ] **Step 2: Add one failing regression for each newly discovered live V1 authority leak**

Prefer behavior tests. If the leak is purely architectural/default-parameter based, extend `topology-authority-imports.test.ts` or the existing projection topology-authority tests.

- [ ] **Step 3: Run each new regression and verify RED before editing production code**

Expected: each new regression fails for the intended stale authority reason.

- [ ] **Step 4: Migrate only the confirmed live leaks**

Pass explicit topology/world context through the narrowest existing interface. Do not remove V1 defaults required by compatibility tests unless the caller can now supply an explicit topology.

- [ ] **Step 5: Run all topology-focused tests**

```bash
npx vitest run \
  tests/sim/battlefield-topology-authority.test.ts \
  tests/sim/world-topology-authority.test.ts \
  tests/sim/triptych-topology-v2.test.ts \
  tests/sim/topology-authority-imports.test.ts \
  tests/sim/geometric-vision.test.ts \
  tests/sim/intelligence-legality.test.ts \
  tests/client/board-projection-topology-authority.test.ts \
  tests/client/board-pointer-cell-topology-authority.test.ts \
  tests/client/interactive-board-grid-topology-authority.test.ts \
  tests/client/presented-world-intelligence.test.ts \
  --maxWorkers=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "refactor: close remaining live topology authority leaks"
```

---

### Task 7: Add the V2 Intelligence/Topology Closure Gauntlet and Run Full Verification

**Files:**
- Create: `tests/sim/triptych-v2-topology-closure-gauntlet.test.ts`
- Modify only if a final defect is exposed by the gauntlet: owning source/test files.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: one high-level executable receipt proving V2 topology closure across geometry, LOS, fog memory, presentation and placement.

- [ ] **Step 1: Write the end-to-end gauntlet**

The gauntlet must create a V2 world and prove in one deterministic scenario:

- world dimensions are 32x32 and playable-cell count is 496;
- `(27,18)` is playable and `(2,2)` is void;
- a unit at an eastern V2 coordinate produces LOS/intelligence there;
- losing observation creates a remembered ghost at that V2 coordinate;
- knowledge legality blocks an unknown V2 destination/path;
- faction presentation exposes exactly 496 cells and never the void corner;
- direct placement into the void is rejected;
- no assertion depends on historical V1 bounds.

- [ ] **Step 2: Run the gauntlet**

```bash
npx vitest run tests/sim/triptych-v2-topology-closure-gauntlet.test.ts --maxWorkers=1
```

Expected: PASS after Tasks 1-6. If it fails, add a focused RED regression to the owning task area before fixing production code.

- [ ] **Step 3: Run the architectural tripwire again**

```bash
npx vitest run tests/sim/topology-authority-imports.test.ts --maxWorkers=1
```

Expected: PASS with no forbidden live imports.

- [ ] **Step 4: Run the authoritative repository gate**

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run build
```

Expected:

- all tests PASS; count must be greater than the historical 537-test baseline because this plan adds regressions;
- TypeScript typecheck exits 0;
- Vite build exits 0; existing Phaser chunk-size warning may remain informational.

- [ ] **Step 5: Commit the gauntlet/receipt**

```bash
git add tests/sim/triptych-v2-topology-closure-gauntlet.test.ts
git commit -m "test: lock V2 topology authority closure"
```

## Self-Review Result

- **Spec coverage:** This plan covers only restoration stage 1, Topology Closure, by design. Claim authority, supply, READY deployment, AI parity beyond topology, presentation clock and art remain separate follow-on plans.
- **Type consistency:** All production changes route through existing selected-world topology authority rather than introducing a competing topology abstraction.
- **TDD:** Every behavior change begins with an observed failing test before production edits.
- **Compatibility:** V1 remains explicit compatibility authority; this plan removes only silent V1 governance of live V2 worlds.
- **Review Focus coverage:** V2 out-of-V1-range cells, void cells, 496-cell presentation, placement/spawn and V1 compatibility are each assigned explicit tests above.
