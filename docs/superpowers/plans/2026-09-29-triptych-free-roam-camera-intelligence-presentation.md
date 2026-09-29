# Triptych Free-Roam Camera + Intelligence Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the expansive Triptych battlefield physically navigable and visibly intelligence-aware without changing simulation authority: free-roam pan/zoom/centering, camera-safe pointer mapping, remembered/unknown tile treatments, and stale ghost rendering.

**Architecture:** Keep simulation/world coordinates authoritative and unchanged. Add a pure camera state/controller layer that transforms the existing battlefield projection into a navigable viewport projection. `phaser-scene.ts` owns Phaser input binding only; camera math lives in small testable modules. The existing faction-safe `createBattlefieldSceneRuntime()` remains the only battlefield presentation source, so hidden enemy truth never enters render state. Intelligence drawing consumes `runtime.intelligenceOverlay` and `runtime.presented.ghosts` only.

**Tech Stack:** TypeScript, Vitest, Phaser client, existing `BoardProjection` and `createResponsiveBattlefieldLayout()`.

**Depends on:** `docs/superpowers/plans/2026-09-29-triptych-battlefield-intelligence-implementation.md`

## Global Constraints

- Camera freedom never grants intelligence.
- Camera state is presentation-only and must not modify simulation coordinates, occupancy, legality, AI, replay, or save truth.
- Hidden enemy units must remain absent from Phaser render frames.
- Board terrain remains visible everywhere; remembered and unknown are information treatments, not black fog.
- Remembered ghost contacts are non-authoritative visual records only.
- Pointer/tap selection must continue to resolve logical board cells correctly after pan/zoom.
- HUD remains screen-anchored and does not pan/zoom with the world.
- Unit apparent scale must remain stable relative to board cells while zooming the world.
- No large-scale rewrite of `phaser-scene.ts`; introduce small helpers and make surgical integrations.

---

### Task 1: Add Pure Camera State and Clamped Pan/Zoom Math

**Files:**
- Create: `src/client/camera/battlefield-camera.ts`
- Test: `tests/client/battlefield-camera.test.ts`

**Interfaces:**
- Produces: `BattlefieldCameraState`, `createBattlefieldCameraState()`, `panBattlefieldCamera()`, `zoomBattlefieldCamera()`, `centerBattlefieldCameraOn()`, `clampBattlefieldCamera()`.

- [ ] Write failing tests for default state, pan deltas, min/max zoom, clamping to world bounds, and centering on a world anchor.
- [ ] Run targeted test and verify RED.
- [ ] Implement deterministic immutable camera math.
- [ ] Run targeted test and verify GREEN.
- [ ] Commit `feat: add free-roam battlefield camera state`.

### Task 2: Transform Board Projection Through Camera State

**Files:**
- Create: `src/client/camera/camera-projection.ts`
- Test: `tests/client/camera-projection.test.ts`

**Interfaces:**
- Produces: `applyCameraToProjection(baseProjection, camera, viewport)` and inverse point transform for pointer mapping.

- [ ] Write failing tests proving pan translates all projection anchors equally, zoom scales around viewport focus, inverse mapping round-trips screen points, and HUD coordinates are untouched because they never enter this transform.
- [ ] Run targeted test and verify RED.
- [ ] Implement pure forward/inverse transforms.
- [ ] Run targeted test and verify GREEN.
- [ ] Commit `feat: project battlefield through free camera`.

### Task 3: Add Input Intent Model for Keyboard, Drag and Wheel/Pinch

**Files:**
- Create: `src/client/camera/camera-input.ts`
- Test: `tests/client/camera-input.test.ts`

**Interfaces:**
- Produces camera intents for keyboard arrows/WASD, drag delta, wheel zoom, and center-selected / center-Victoria actions.

- [ ] Write failing tests for keyboard pan vectors, drag direction, wheel zoom sign, and deterministic speed scaling by delta time.
- [ ] Run targeted test and verify RED.
- [ ] Implement pure input-to-intent helpers with no Phaser dependency.
- [ ] Run targeted test and verify GREEN.
- [ ] Commit `feat: add battlefield camera input intents`.

### Task 4: Wire Camera into Battlefield Runtime Projection and Pointer Mapping

**Files:**
- Modify: `src/client/phaser/phaser-scene.ts`
- Modify only if needed: `src/client/render/responsive-battlefield.ts`
- Test: `tests/client/phaser-camera-runtime.test.ts`
- Test: existing battlefield pointer/input suites.

**Interfaces:**
- Scene owns one camera state.
- Runtime calls use camera-transformed projection.
- Pointer hit-testing uses the same transformed projection so board-cell selection remains correct.

- [ ] Write failing scene/controller tests proving camera pan changes rendered unit anchors without changing `world.units[*].position`.
- [ ] Add pointer regression proving a panned/zoomed visible tile still maps to the correct logical cell.
- [ ] Run targeted client tests and verify RED.
- [ ] Add surgical scene integration: keyboard state, pointer-drag pan, wheel zoom, update-time camera intent application, and transformed runtime projection.
- [ ] Run targeted tests and existing input/selection suites; verify GREEN.
- [ ] Commit `feat: wire free-roam battlefield camera`.

### Task 5: Render Intelligence Tile Treatments Procedurally

**Files:**
- Create: `src/client/render/intelligence-visuals.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Test: `tests/client/intelligence-visuals.test.ts`

**Interfaces:**
- Produces per-tile visual primitives from `IntelligenceOverlayModel`: observed = no obscuring treatment, remembered = subdued veil, unknown = stronger terrain-only veil.

- [ ] Write failing tests for treatment-to-alpha/style mapping and deterministic tile ordering.
- [ ] Run targeted test and verify RED.
- [ ] Implement style/model helper with no Phaser dependency.
- [ ] Wire scene markers from `runtime.intelligenceOverlay.tiles` below units but above board art.
- [ ] Ensure markers refresh when intelligence changes and are destroyed/reused deterministically.
- [ ] Run targeted tests + scene tests; verify GREEN.
- [ ] Commit `feat: show battlefield intelligence frontier`.

### Task 6: Render Last-Known Ghost Contacts

**Files:**
- Create: `src/client/render/ghost-contacts.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Test: `tests/client/ghost-contacts.test.ts`

**Interfaces:**
- Produces ghost render records from `runtime.presented.ghosts` with cell anchor, unit id, last-seen round, subdued opacity, and non-interactive semantics.

- [ ] Write failing tests proving ghost anchor uses remembered cell, lastSeenRound is preserved, ghosts do not appear in live unit list, and no hidden current enemy position is exposed.
- [ ] Run targeted test and verify RED.
- [ ] Implement pure ghost render model.
- [ ] Wire non-interactive ghost markers/sprites in Phaser; never add them to `unitSprites` or occupancy-driven selection.
- [ ] Run targeted tests and intelligence authority suites; verify GREEN.
- [ ] Commit `feat: render stale battlefield ghosts`.

### Task 7: Camera + Intelligence Presentation Gauntlet

**Files:**
- Create: `tests/client/triptych-camera-intelligence-gauntlet.test.ts`

**Scenario:**
- Begin with Victoria view.
- Pan away from starting zone and zoom in.
- Confirm logical unit positions are unchanged while rendered anchors move.
- Confirm hidden enemy does not enter the frame.
- Confirm remembered tile receives subdued treatment and unknown receives terrain-only treatment.
- Confirm stale enemy contact appears only as a ghost with last-seen metadata.
- Center camera on selected Victoria unit and verify projection anchor.
- Round-trip a pointer coordinate through transformed projection and recover the intended logical tile.

- [ ] Write integrated gauntlet.
- [ ] Run targeted gauntlet and verify PASS after Tasks 1-6.
- [ ] Run full `npm test`, `npm run typecheck`, `npm run build`.
- [ ] Inspect final branch head and CI.
- [ ] Commit `test: verify free-roam intelligence presentation`.

## Deferred Until Immediately After This Plan

**Final battlefield freeze:** exact cross footprint, node count/coordinates, starting army cells, 3+3 fortification cells, opening ownership footprint, and final world-to-art projection. That is the final structural gate before the asset pipeline becomes the primary workstream.

## Exit Condition

The player can freely navigate a battlefield larger than the viewport, zoom without changing game truth, select logical cells under transformed projection, see observed/remembered/unknown intelligence states, see stale ghost contacts without hidden truth leakage, and the full CI gate is green.
