# Final Ornate Triptych Board and Visual Gauntlet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Use TDD for geometry/presentation behavior. Final binary art may require an explicit asset handoff, but geometry and runtime authority must be green before and after it.

**Goal:** After the 32x32 topology, supply, deployment and presentation systems are frozen, replace the legacy board with a genuinely ornate Victorian Royal War Triptych while proving every dynamic world layer stays aligned to the same projection.

**Architecture:** The neutral battlefield texture is decorative substrate only. Logical topology/projection remains code-owned. Territory, supply, deployment zones, nodes, banners, fortifications, units, intelligence, movement and attack effects are dynamic camera-bound layers. The final `triptych-board.png` is authored to the frozen 32x32 projection and becomes the sole board asset only after it exists in the repository and passes projection/coherence tests.

**Tech Stack:** TypeScript, Phaser, Vitest, Vite, PNG production art, existing free-roam camera/projection.

**Spec:** `docs/superpowers/specs/2026-09-30-triptych-coalesced-strategy-and-presentation.md`

## Art Direction Contract

The final battlefield should read as a grand Victorian palace bridge/cross suspended over dark water/abyss:

- ornate gold/brass rails, filigree, architectural trim and ceremonial details,
- marble/ivory/dark-stone tile field with strong cell readability,
- western Royal atmosphere using crimson/gold accents,
- eastern Shadow atmosphere using obsidian/violet/silver accents,
- north/south royal corridors visually prestigious but mechanically neutral,
- corners unmistakably void/non-playable,
- architecture may surround and frame the cross but never intrude over playable tile centres,
- no baked units, nodes, banners, forts, territory ownership, deployment highlights, command markers, UI text or legends,
- no decorative mark may create a fake playable cell.

**Doctrine:** Art conforms to grid. Grid never bends to art.

## Global Constraints

- Plan 1 must have frozen 32x32 topology and projection before final asset authoring.
- Plan 2 deployment zones and Plan 3 presentation cues remain dynamic overlays/effects.
- Canonical asset path changes atomically with installation of the final binary.
- The current proof board is not accepted as final art merely because its geometry is correct.
- `palace-board.png` is deleted only after successful deployment of the final board.
- Board, tiles, units, nodes, banners, forts, territory, supply overlays, deployment zones, intelligence, movement and combat effects all derive from one current camera projection.

## Review Focus

- Ornateness must live around/below tactical readability, not obscure it.
- Extreme pan/zoom must not reveal geometry drift.
- Dynamic territory must remain visually distinct from baked west/east atmosphere.
- The 5x5 deployment zones must be obvious only when active.
- Attack effects must originate/land at current projected anchors even during camera movement.

---

### Task 1: Freeze the 32x32 Production Projection Contract

**Files:**
- Modify: `tests/client/board-geometry.test.ts`
- Modify: `tests/client/phaser-camera-runtime.test.ts`
- Modify: `tests/client/board-projection.test.ts`
- Modify only if RED: `src/client/render/responsive-battlefield.ts`

- [ ] Pin the production authoring canvas/projection used for the final 32x32 board. Preserve a 16:9 source canvas unless implementation evidence demands another ratio.
- [ ] Pin representative cells: both home realms, both Crown nodes, all necks, central theatre, four void corners and deployment-zone corners.
- [ ] Verify exact round-trip cell-to-screen-to-cell mapping before and after pan/zoom.
- [ ] Commit: `test: freeze final 32x32 Triptych art projection`.

### Task 2: Write a Board Asset Acceptance Contract Before Generating Art

**Files:**
- Create: `docs/art/triptych-board-production-contract.md`
- Create: `tests/client/triptych-board-contract.test.ts` if runtime-verifiable metadata is useful

- [ ] Record canvas dimensions, projection corners, cross topology, safe ornament zones, prohibited baked dynamic content and required transparent/opaque behavior.
- [ ] Record visual direction above as acceptance criteria.
- [ ] Require human visual approval of the rendered candidate before canonical promotion.
- [ ] Commit: `docs: freeze ornate Triptych board production contract`.

### Task 3: Produce the Actual Ornate Neutral Board Asset

**Files:**
- Create binary: `public/assets/battlefield/triptych-board.png`

- [ ] Generate/illustrate an ornate decorative substrate using the frozen production contract.
- [ ] Enforce the exact playable cross with deterministic mask/geometry after any generative art step. Generative art may decorate, but it may not decide cell coordinates.
- [ ] Inspect at full resolution for fake cells, ornament intrusion, muddy tile centres, baked territory or clipped rails.
- [ ] Obtain human visual approval before moving to Task 4.
- [ ] Commit binary: `assets: install final ornate 32x32 Triptych battlefield`.

### Task 4: Atomically Promote the Final Board to Canonical Authority

**Files:**
- Modify: `src/client/assets/canonical.ts`
- Modify: `tests/client/canonical-assets.test.ts`

- [ ] RED: canonical test requires `/Queen-Victoria-RTS/assets/battlefield/triptych-board.png` and rejects `palace-board`.
- [ ] Confirm the binary exists at that exact repository path before changing runtime authority.
- [ ] Change only the canonical board entry.
- [ ] Run `npx vitest run tests/client/canonical-assets.test.ts && npm run build`.
- [ ] Commit: `assets: make ornate Triptych board canonical`.

### Task 5: Run the Whole-World Projection Coherence Gauntlet

**Files:**
- Modify: `tests/client/triptych-camera-overlay-coherence.test.ts`
- Modify: `tests/client/triptych-unit-grounding.test.ts`
- Create: `tests/client/triptych-final-visual-gauntlet.test.ts`
- Modify only if RED: `src/client/phaser/triptych-battlefield-scene.ts`

- [ ] At base camera and non-zero pan/zoom, assert fresh projection equality for: selected unit, legal destination, owned territory, disconnected territory, annex frontier, one deployment-zone cell, node, fort, banner, ghost/intelligence marker, active movement cue endpoint and active attack-effect endpoint.
- [ ] Assert all four corner regions remain non-playable and non-interactive.
- [ ] Assert unit bottom-centre anchors land exactly on tile centres after animation completion.
- [ ] Commit: `test: lock final ornate battlefield coherence`.

### Task 6: Tune Dynamic Strategic Art Against the Final Board

**Files:**
- Modify: `src/client/render/triptych-presentation.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify/add focused presentation tests.

- [ ] Tune persistent Victoria/Obsidian ownership to remain subtle over ornate marble.
- [ ] Make disconnected/unsupplied territory readable without looking like enemy ownership.
- [ ] Keep annex/deployment/target highlights high-signal and temporary.
- [ ] Ensure banners, forts and nodes remain visually dominant enough to read but do not hide grid centres.
- [ ] Commit: `style: tune Triptych strategic layers for ornate board`.

### Task 7: Retire the Legacy Board and Superseded Proof Art

**Files:**
- Delete after successful Pages deployment: `public/assets/battlefield/palace-board.png`
- Delete any temporary proof board only if it was committed under another name and has no runtime/reference value.
- Modify: `docs/superpowers/plans/2026-09-30-triptych-board-authority.md` status if not already marked superseded.

- [ ] Search repository for `palace-board` and old 24x24 art authority references.
- [ ] Confirm Pages build on the final canonical asset succeeds before deletion.
- [ ] Delete legacy board.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Commit: `chore: retire legacy Triptych board art`.

### Task 8: Final Playability and Readability Acceptance

**Files:**
- Create: `tests/client/triptych-final-acceptance.test.ts`
- Update docs only if acceptance exposes an actual contract correction.

- [ ] Acceptance flow: recruit -> READY -> drag deploy -> annex by settlement -> explicit annex -> supply cut -> attrition warning/damage -> banner/fort -> scout with progressive reveal -> deliberate move -> melee MOER -> ranged attack -> lethal death -> assault advance.
- [ ] Verify all consequential events remain understandable at normal presentation speed.
- [ ] Run full `npm test && npm run typecheck && npm run build` and verify Pages deployment.
- [ ] Commit: `test: complete Royal War Triptych final acceptance gauntlet`.
