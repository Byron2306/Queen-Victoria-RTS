# Triptych Board Authority Implementation Plan

> **STATUS: SUPERSEDED.** This 24x24 board-authority plan is retained only as historical context. Do not execute it. The approved programme migrates topology and projection to 32x32 before final board art is authored.
>
> Execute these plans instead, in order:
> 1. `docs/superpowers/plans/2026-09-30-triptych-scale-supply-territory.md`
> 2. `docs/superpowers/plans/2026-09-30-triptych-ready-deployment.md`
> 3. `docs/superpowers/plans/2026-09-30-triptych-presentation-clock.md`
> 4. `docs/superpowers/plans/2026-09-30-triptych-ornate-board-visual-gauntlet.md`
>
> Binding spec: `docs/superpowers/specs/2026-09-30-triptych-coalesced-strategy-and-presentation.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ornate 24×24 Triptych cross the sole battlefield art authority and prove that board art, tile projection, units, nodes, tactical overlays, and camera transforms stay on one geometry.

**Architecture:** The logical 24×24 topology remains unchanged. A dedicated canonical Triptych board asset path replaces the legacy `palace-board.png` identity; the render model exposes that one asset only. Projection remains code-owned by `createResponsiveBattlefieldLayout()`, while visual tests pin representative cross cells and all camera-bound layers to that same projection.

**Tech Stack:** TypeScript, Phaser, Vitest, Vite, PNG battlefield asset.

**Spec:** `docs/superpowers/specs/2026-09-29-triptych-final-battlefield-freeze.md`

## Global Constraints

- Logical board is 24×24 with exactly 288 playable cross cells.
- Central theatre is `x=0..23, y=8..15`; strategic spine is `x=9..14, y=0..23`.
- World expansion remains `24 / 16 = 1.5`; camera movement never changes simulation truth.
- Unit feet use the exact projected tile centre via the existing `unitGroundAnchor` contract.
- Tactical overlays, nodes, forts, territory, intelligence and ghost contacts must use the same current camera-bound projection.
- No retired 16×16 or legacy palace-board asset may be a live rendering authority.

## Review Focus

- Browser cache or stale asset path must not resurrect the retired board.
- Landscape viewport resizing must keep projection and board texture aligned.
- Extreme pan/zoom must not detach overlays or pieces from painted tile centres.
- Void corner cells must remain visually non-playable and non-interactive.
- Representative west/east theatre and north/south spine cells must map to the intended cross tiles.

---

### Task 1: Give the Triptych Board a Unique Canonical Identity

**Files:**
- Modify: `src/client/assets/canonical.ts`
- Modify: `tests/client/canonical-assets.test.ts`
- Binary handoff: `public/assets/battlefield/triptych-board.png`

**Interfaces:**
- Consumes: existing `assetUrl(path)`.
- Produces: `CANONICAL_ASSET_PATHS.board === assetUrl('assets/battlefield/triptych-board.png')`.

- [ ] **Step 1: Write the failing test**

Add an assertion that the canonical board path ends in `assets/battlefield/triptych-board.png` and contains no `palace-board` reference.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/canonical-assets.test.ts`
Expected: FAIL because the canonical path still points at `palace-board.png`.

- [ ] **Step 3: Install the ornate cross PNG and change the canonical path**

Place the approved ornate cross art at `public/assets/battlefield/triptych-board.png`, then change only the board entry in `CANONICAL_ASSET_PATHS`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/canonical-assets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "assets: make Triptych board canonical"`

### Task 2: Pin Board Art to the Authoritative Projection

**Files:**
- Modify: `tests/client/board-geometry.test.ts`
- Modify: `tests/client/phaser-camera-runtime.test.ts`
- Modify only if required by RED test: `src/client/render/responsive-battlefield.ts`

**Interfaces:**
- Consumes: `createResponsiveBattlefieldLayout(width, height)` and 24×24 topology.
- Produces: tested projection/board-render alignment for representative cross cells before and after camera transforms.

- [ ] **Step 1: Write failing-or-characterization tests**

Pin representative playable cells `(1,11)`, `(22,12)`, `(11,1)`, `(12,22)`, `(10,11)`, `(13,12)` to points inside `boardRender`; pin representative corner void cells as non-playable; verify pan+zoom transforms board rectangle and all corresponding tile centres coherently.

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/client/board-geometry.test.ts tests/client/phaser-camera-runtime.test.ts`
Expected: PASS if the current geometry is already correct; otherwise RED identifies the exact projection defect.

- [ ] **Step 3: Make the minimal geometry fix only if RED**

Do not change logical topology or opening coordinates. Any fix stays inside responsive presentation geometry.

- [ ] **Step 4: Re-run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "test: lock Triptych board projection to cross art"`

### Task 3: Whole-Battlefield Coherence Gauntlet

**Files:**
- Modify: `tests/client/triptych-camera-overlay-coherence.test.ts`
- Modify: `tests/client/triptych-unit-grounding.test.ts`
- Modify only if required: `src/client/phaser/triptych-battlefield-scene.ts`

**Interfaces:**
- Consumes: camera-aware layout, selection geometry, unit grounding, strategic overlay projection.
- Produces: regression proof that board, units, movement tiles, watchtower/intelligence cells, nodes and strategic overlays remain attached to logical cells through pan and zoom.

- [ ] **Step 1: Extend the regression test**

Check one selected unit, one legal destination, one observed/watchtower tile, one node, one fortification and one territory tile before and after a non-zero pan+zoom. Assert every screen geometry equals a fresh projection of the same logical cell.

- [ ] **Step 2: Run the gauntlet**

Run: `npx vitest run tests/client/triptych-camera-overlay-coherence.test.ts tests/client/triptych-unit-grounding.test.ts`
Expected: PASS after the camera-overlay fix; any RED is a layer still carrying stale screen coordinates.

- [ ] **Step 3: Fix only stale projection ownership if necessary**

All world-bound layers must recompute from the current `layout.projection`; no per-layer independent camera math.

- [ ] **Step 4: Full verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

`git commit -m "test: lock full battlefield camera coherence"`

### Task 4: Retire the Legacy Board Path

**Files:**
- Delete after successful live deployment: `public/assets/battlefield/palace-board.png`
- Modify: `tests/client/canonical-assets.test.ts`

**Interfaces:**
- Consumes: Task 1 canonical `triptych-board.png` path.
- Produces: no runtime or test reference to the legacy board filename.

- [ ] **Step 1: Add a source-level/reference assertion**

Ensure canonical runtime configuration does not contain `palace-board.png`.

- [ ] **Step 2: Verify Triptych board is deployed successfully**

The Pages build must succeed with `triptych-board.png` before deleting the old binary.

- [ ] **Step 3: Delete retired board binary**

Remove `public/assets/battlefield/palace-board.png`.

- [ ] **Step 4: Full verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green and no missing asset references.

- [ ] **Step 5: Commit**

`git commit -m "chore: retire legacy palace battlefield"`
