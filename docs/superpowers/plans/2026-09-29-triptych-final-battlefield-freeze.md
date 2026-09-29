# Royal War Triptych Final Battlefield Freeze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the approved 24×24 Royal War Triptych battlefield, including playable cross geometry, eight strategic nodes, mirrored six-piece starting armies, 3+3 prepared fortifications, compact starting territory, and projection scaling without changing existing unit apparent scale.

**Architecture:** Simulation coordinates remain authoritative. Expand the logical board from 16×16 to 24×24 and define one canonical cross topology that all movement, territory, nodes, intelligence, fortifications, deployment and presentation consume. Starting state is expressed through small deterministic constructors/constants rather than scene-only placement. Presentation projects the expanded simulation through the existing camera system; no asset generation occurs in this plan.

**Tech Stack:** TypeScript, Vitest, Phaser client, existing simulation kernel, existing camera/projection/intelligence stack.

**Spec:** `docs/superpowers/specs/2026-09-29-royal-war-triptych-design.md`

## Global Constraints

- Board is exactly 24×24 logical coordinates.
- The central horizontal war theatre spans the full width on rows `y=8..15`.
- The north/south corridor is exactly six tiles wide on columns `x=9..14` outside the central theatre.
- North and South major Crown nodes begin neutral and symmetric in strategic authority.
- Eight nodes total: 2 Crown + 6 minor. No node occupies the exact battlefield center.
- Victoria starts West and advances East; Shadow/Obsidian starts East and advances West.
- Starting armies are six units per faction: King, Queen/hero, Rook, Knight, 2 Pawns. Bishop remains a recruitment choice.
- Victoria opening cells: King `(1,11)`, Victoria `(5,11)`, Rook `(3,9)`, Knight `(3,13)`, Pawns `(5,10)` and `(5,12)`.
- Shadow opening cells: King `(22,12)`, Queen `(18,12)`, Rook `(20,14)`, Knight `(20,10)`, Pawns `(18,13)` and `(18,11)`.
- Starting fortifications are real simulation objects on controlled tiles: Victoria Bastions `(8,9)`, `(8,13)`, Redoubt `(8,11)`; Shadow Bastions `(15,14)`, `(15,10)`, Redoubt `(15,12)`.
- All starting fortifications have durability 3 under existing fortification rules.
- The opening neutral killing ground is columns `x=9..14` through the central theatre except for any explicitly controlled starting approach tiles needed by the approved compact home footprint.
- Starting faction control must remain compact, target 12–15% of playable cells per faction, and must include every starting unit and starting fortification cell.
- Existing unit apparent world-space scale is preserved. The camera sees less of the larger board rather than shrinking units to fit.
- Camera freedom never grants intelligence. Existing observed/remembered/unknown rules and stale ghost authority remain unchanged.
- No new artwork or asset generation in this plan.

## Review Focus

- Coordinates just outside the cross arms must remain non-playable while every approved starting cell/node/fort cell remains playable.
- Expansion from 16×16 to 24×24 must not leave stale hard-coded `16`, `15`, or `BOARD_SIZE` assumptions in movement, projection, deployment, save/replay, AI, or tests.
- Starting controlled territory must be deterministic, contiguous enough to support forts, and must not accidentally annex the neutral center.
- Mirrored opening placement must not overlap nodes, forts, or each other and must preserve Victoria-West / Shadow-East orientation.
- Camera/projection and pointer mapping must still round-trip logical tiles on the expanded board while HUD remains anchored.

---

### Task 1: Expand Canonical Board Topology to 24×24

**Files:**
- Modify: `src/sim/board-topology.ts`
- Modify: `src/sim/world.ts`
- Test: `tests/sim/board-topology.test.ts`
- Test: `tests/sim/position.test.ts`

**Interfaces:**
- Produces: `BOARD_WIDTH = 24`, `BOARD_HEIGHT = 24`, and `isPlayableCell(x,y)` implementing the approved cross.
- Consumes later: all node, territory, movement, intelligence, production and presentation code.

- [ ] Add failing tests asserting 24×24 bounds, full-width central theatre `y=8..15`, six-wide N/S corridor `x=9..14`, representative excluded corner cells, and all approved unit/node/fort cells playable.
- [ ] Run targeted topology/position tests and verify RED against the current 16×16 board.
- [ ] Change canonical board dimensions and cross geometry. Remove or alias stale `BOARD_SIZE=16` assumptions in `world.ts` so world width/height and bounds use the canonical topology constants.
- [ ] Run targeted tests and verify GREEN.
- [ ] Run full `npm test` to expose downstream 16×16 assumptions before Task 2; ledger any failures as expected migration work, not ignored regressions.
- [ ] Commit `feat: expand Triptych battlefield to 24x24`.

### Task 2: Freeze Eight Strategic Node Coordinates

**Files:**
- Modify: `src/sim/nodes.ts`
- Test: `tests/sim/royal-node-topology.test.ts`
- Test: `tests/sim/nodes.test.ts`

**Interfaces:**
- Consumes: Task 1 playable topology.
- Produces: `DEFAULT_CAPTURE_NODES` with exactly 8 approved node centers.

Approved centers:
- North Crown `(11,1)`
- South Crown `(12,22)`
- NW Minor `(9,7)`
- NE Minor `(14,7)`
- West Minor `(10,11)`
- East Minor `(13,12)`
- SW Minor `(9,16)`
- SE Minor `(14,16)`

- [ ] Add failing tests for exact node count, IDs/kinds/centers, all centers playable, no node at `(11,11)`, `(12,11)`, `(11,12)`, or `(12,12)`, and both Crown nodes neutral initially.
- [ ] Run targeted tests and verify RED.
- [ ] Update `DEFAULT_CAPTURE_NODES` only; preserve existing capture/supply semantics.
- [ ] Run targeted tests and verify GREEN.
- [ ] Commit `feat: freeze eight-node Triptych objective map`.

### Task 3: Add Canonical Opening Deployment

**Files:**
- Create: `src/sim/triptych-opening.ts`
- Modify only if needed: `src/client/skirmish-fixture.ts` or its actual fixture owner discovered in repo.
- Test: `tests/sim/triptych-opening.test.ts`

**Interfaces:**
- Consumes: Task 1 topology and Task 2 node map.
- Produces: `TRIPTYCH_OPENING_UNITS` and `createTriptychOpeningUnits()` returning deterministic `UnitState[]` with the approved twelve starting pieces.

- [ ] Add failing tests asserting exact IDs/factions/kinds/cells for all 12 starting units, unique occupancy, all cells playable, no unit starts on a node, Victoria-West / Obsidian-East mirror orientation, and no starting Bishop.
- [ ] Run targeted test and verify RED.
- [ ] Implement the smallest canonical opening constructor/constants file.
- [ ] Wire the Triptych/skirmish fixture to consume the canonical opening instead of duplicating coordinates, if a fixture currently owns startup placement.
- [ ] Run targeted tests plus existing fixture tests and verify GREEN.
- [ ] Commit `feat: freeze Triptych opening armies`.

### Task 4: Seed Prepared Fortification Belts

**Files:**
- Modify: `src/sim/triptych-opening.ts`
- Modify: `src/sim/world.ts` or the narrowest existing initial-state hook for fortification state.
- Test: `tests/sim/triptych-opening-fortifications.test.ts`
- Test: `tests/sim/fortifications.test.ts`

**Interfaces:**
- Consumes: Task 1 topology, existing fortification state/build semantics.
- Produces: `TRIPTYCH_OPENING_FORTIFICATIONS` and a deterministic opening-world constructor/helper that places exactly 3 Victoria + 3 Obsidian forts with durability 3.

- [ ] Add failing tests for exact cells, faction, role (`bastion` vs `redoubt` if the model supports role; otherwise stable IDs carry role), durability 3, unique cells, no overlap with units/nodes, and all forts on same-faction controlled territory after Task 5 integration.
- [ ] Run targeted tests and verify RED.
- [ ] Implement deterministic fort seeds using existing fortification data structures, without bypassing attackability/blocking semantics.
- [ ] Run targeted fort tests and verify GREEN for structure; ownership assertion may remain RED until Task 5 only if the test is split accordingly.
- [ ] Commit `feat: seed Triptych prepared fortification belts`.

### Task 5: Freeze Compact Starting Territory

**Files:**
- Modify: `src/sim/triptych-opening.ts`
- Modify: `src/sim/territory.ts` or narrow initial-state constructor only if necessary.
- Test: `tests/sim/triptych-opening-territory.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces: `TRIPTYCH_STARTING_CONTROL` or `applyTriptychStartingControl(world)`.

Territory rule:
- Include every friendly starting unit and fortification cell.
- Use a compact connected home footprint plus narrow fort approach tendrils.
- Preserve at least columns `x=9..14` of the central theatre as neutral at round 1.
- Each faction controls between 12% and 15% of all playable cells.
- Victoria/Obsidian controlled-cell counts differ by at most one.

- [ ] Add failing tests for percentage bounds, symmetry, all starting pieces/forts supplied by own control, neutral center preservation, no enemy-controlled cells inside the opposing home half, and deterministic tile IDs/order.
- [ ] Run targeted test and verify RED.
- [ ] Implement a single explicit deterministic starting-control set per faction. Do not derive ownership dynamically from current unit positions at startup.
- [ ] Apply the control seed in the canonical Triptych opening world/fixture.
- [ ] Run territory + node supply + fortification tests and verify GREEN.
- [ ] Commit `feat: seed compact Triptych home territories`.

### Task 6: Update Reinforcement and Deployment Anchors for West/East Opening

**Files:**
- Modify: `src/sim/world.ts`
- Modify relevant production/deployment tests.
- Test: `tests/sim/production-queue.test.ts`
- Test: `tests/client/production-guidance.test.ts`

**Interfaces:**
- Consumes: Task 1 topology and Task 5 starting control.
- Produces: faction reinforcement/deployment anchors consistent with Victoria West and Obsidian East.

- [ ] Add failing tests that anchors are playable, inside own starting control, not occupied by a starting fort, and geographically behind each faction's opening line.
- [ ] Run targeted tests and verify RED.
- [ ] Replace old north/south 16×16 anchors with approved West/East anchors chosen from the home footprint; prefer empty rear cells near each King.
- [ ] Run production/deployment tests and verify GREEN.
- [ ] Commit `feat: align deployment anchors with Triptych fronts`.

### Task 7: Scale Board Projection for 24×24 Without Shrinking Unit Footprint

**Files:**
- Modify: `src/client/board/projection.ts` and/or its dimension constants if hard-coded to 16.
- Modify: `src/client/render/responsive-battlefield.ts`
- Test: `tests/client/board-projection.test.ts`
- Test: `tests/client/phaser-unit-footprint.test.ts`
- Test: `tests/client/camera-projection.test.ts`

**Interfaces:**
- Consumes: Task 1 board dimensions and existing free-roam camera.
- Produces: tile projection using 24×24 logical normalization while retaining existing unit-to-tile apparent scale under camera zoom 1.

- [ ] Add failing projection tests for corners/extreme playable cells `(0,8)`, `(23,15)`, North/South corridor endpoints, exact tile-center round-trip, and stable sprite footprint ratio to one projected tile.
- [ ] Run targeted tests and verify RED.
- [ ] Replace any 16-based normalization with canonical board width/height. Keep camera transform and HUD untouched.
- [ ] Tune only world projection/base board render scale necessary to preserve the existing apparent unit footprint; do not globally shrink unit sprite constants to fit the whole board.
- [ ] Run projection, camera, pointer, footprint and HUD exclusion tests and verify GREEN.
- [ ] Commit `feat: project 24x24 Triptych battlefield`.

### Task 8: Full Structural Freeze Gauntlet

**Files:**
- Create: `tests/sim/triptych-final-battlefield-freeze-gauntlet.test.ts`
- Update: `docs/superpowers/specs/2026-09-29-royal-war-triptych-design.md` with an approved-final battlefield-freeze appendix/status note.

**Scenario:**
- Construct the canonical Triptych opening world.
- Assert 24×24 cross geometry and exact playable/non-playable samples.
- Assert exactly 8 nodes at approved centers.
- Assert exactly 12 starting units at approved centers.
- Assert exactly 6 prepared forts at approved centers and durability 3.
- Assert both starting territories are 12–15%, symmetric, and the central killing ground remains neutral.
- Assert every opening fort and deployment anchor is supplied by own territory.
- Refresh Victoria intelligence and prove existing information-authority invariants still hold.
- Project several extreme cells through free camera pan/zoom and recover the same logical cells through inverse/pointer mapping.
- Run one deterministic round boundary and prove board dimensions, nodes, fortifications, control and unit coordinates remain valid.

- [ ] Write the integrated gauntlet and verify any remaining mismatch RED.
- [ ] Make only minimal fixes needed by the gauntlet, with a failing regression test before each production fix.
- [ ] Run targeted gauntlet and verify GREEN.
- [ ] Run full `npm test`, `npm run typecheck`, `npm run build` and read all outputs.
- [ ] Update the design spec appendix to record the final approved 24×24 coordinates and mark the structural battlefield freeze approved.
- [ ] Inspect branch head and CI.
- [ ] Commit `test: freeze final Royal War Triptych battlefield`.

## Exit Condition

The canonical game starts on one deterministic 24×24 cross-shaped battlefield with the approved eight nodes, mirrored six-piece armies, two three-fort prepared defensive belts, compact symmetric starting control, West/East deployment logic, unchanged intelligence authority, and camera-safe 24×24 projection. All tests, typecheck and production build are green. Only then does the asset pipeline become the primary workstream.
