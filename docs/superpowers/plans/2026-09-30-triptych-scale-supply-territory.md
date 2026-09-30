# Triptych Scale, Supply and Territory Coalescence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Use TDD for every behavioral change and keep each task independently green.

**Goal:** Migrate the Royal War Triptych to a 32x32 battlefield, fix logical east/west movement semantics, coalesce all territorial claiming behind one authority, and add deterministic connected-supply attrition that punishes sustained unsupported rushing without forbidding raids.

**Architecture:** One 32x32 topology owns simulation geometry. Territory claims from explicit annex orders and unit settlement call the same `canFactionClaimTile`/`claimFactionTile` authority. Supply is computed as an orthogonally connected network rooted in each faction's home realm plus explicitly legal anchors. Owned-but-disconnected territory remains owned but unsupplied. Unit supply status advances only at reinforcement boundaries. AI searches the actual board dimensions and scores supply risk from logical coordinates only.

**Tech Stack:** TypeScript, Vitest, immutable deterministic simulation state, Phaser projection/camera tests.

**Spec:** `docs/superpowers/specs/2026-09-30-triptych-coalesced-strategy-and-presentation.md`

## Frozen 32x32 Geometry for Implementation Review

- Board: `32 x 32`.
- Vertical spine: `x=12..19`.
- Horizontal theatre: `y=11..20`.
- Playable cells: `496`.
- Victoria home side: west. Obsidian home side: east.
- Pawn forward axis: Victoria `+x`; Obsidian `-x`. Presentation rotation never alters simulation semantics. The production projection must also prove that this logical forward step visually advances toward the opposing home, not away from it.
- Victoria opening units: King `(2,16)`, Victoria `(6,16)`, Rook `(4,13)`, Knight `(4,19)`, Pawns `(6,15)` and `(6,17)`.
- Obsidian opening units: King `(29,15)`, Queen `(25,15)`, Rook `(27,18)`, Knight `(27,12)`, Pawns `(25,16)` and `(25,14)`.
- Victoria prepared forts: `(7,13)`, `(7,16)`, `(7,19)`.
- Obsidian prepared forts: `(24,18)`, `(24,15)`, `(24,12)`.
- Crown nodes: `(15,1)` and `(16,30)`.
- Minor nodes: `(12,10)`, `(19,10)`, `(13,15)`, `(18,16)`, `(12,21)`, `(19,21)`.
- Victoria opening territory: all playable theatre cells `x=0..7, y=11..20`.
- Obsidian opening territory: all playable theatre cells `x=24..31, y=11..20`.
- Remaining playable cells begin neutral.
- Camera world expansion becomes `32 / 16 = 2.0` so apparent tile/unit footprint remains close to the established 16-cell visual scale.

## Global Constraints

- No parallel 24x24 runtime mode.
- No presentation rotation may change simulation direction.
- A legal pawn-forward step must project closer to the opposing Home Deployment centre than its origin. If the inherited projection violates this, presentation projection is corrected rather than reversing simulation semantics ad hoc.
- No territorial source may bypass shared claim legality.
- Settlement annexation remains a real mechanic.
- Remote raiders remain legal and may occupy neutral ground without magically owning it.
- Enemy-controlled ground is not instantly recoloured by occupation.
- Supply connectivity is orthogonal.
- Disconnected territory remains owned but is marked unsupplied.
- Initial attrition implementation is deterministic: `0=supplied`, `1=exposed`, `2=strained`, `3+=attrition`; at each reinforcement boundary a unit at `3+` loses `10 HP`, never below zero. More combat/mobility penalties are deferred until this foundation is proven.
- Restoring supply resets `unsuppliedRounds` to zero.
- Existing banner and fortification systems are extended, not reimplemented.

## Review Focus

- Old `16` and `24` magic bounds must disappear from AI/path/promotion/opening logic where they represent board dimensions.
- The current deliberate RED board-asset test must be deferred until the final-art plan so this programme begins from a green baseline.
- All 32x32 topology, projection, intelligence-memory, replay and scenario fixtures migrate together.
- Supply calculation must not treat disconnected owned islands as supplied.
- AI must not clump into the retired 16x16 quadrant.
- The old visual-left pawn regression must have an explicit projection-aware test, not merely a changed sign in `geometry.ts`.

---

### Task 0: Restore a Green Baseline and Mark the Old Board Plan Superseded

**Files:**
- Modify: `tests/client/canonical-assets.test.ts`
- Modify: `docs/superpowers/plans/2026-09-30-triptych-board-authority.md`

- [ ] Change the premature canonical-board assertion back to the currently installed `palace-board.png`, with a comment that final `triptych-board.png` promotion belongs to the ornate-board plan after 32x32 projection freeze.
- [ ] Mark the old 24x24 board-authority plan `SUPERSEDED` and link this four-plan programme.
- [ ] Run `npx vitest run tests/client/canonical-assets.test.ts` and then `npm test && npm run typecheck && npm run build`.
- [ ] Commit: `test: defer final board authority until 32x32 freeze`.

### Task 1: Migrate the Canonical Triptych Topology to 32x32

**Files:**
- Modify: `src/sim/board-topology.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/client/render/responsive-battlefield.ts`
- Modify: `tests/sim/board-topology.test.ts`
- Modify: `tests/client/interactive-board-grid.test.ts`
- Modify: `tests/client/phaser-camera-runtime.test.ts`

- [ ] RED: assert `BOARD_WIDTH/HEIGHT === 32`, exact 496 playable cells, representative theatre/spine cells, void corners, interactive grid `32*32`, and camera expansion `2.0` with centre mapping `{x:16,y:16}`.
- [ ] Implement the new constants/topology and migrate `WorldState.width/height` from literal `24` to literal `32` or board-derived types.
- [ ] Replace `WORLD_EXPANSION=24/16` with `32/16` while preserving camera transform ownership.
- [ ] Run focused tests, then commit: `feat: migrate Triptych battlefield to 32x32`.

### Task 2: Migrate Opening Geography, Nodes, Forts and Pawn Direction

**Files:**
- Modify: `src/sim/triptych-opening.ts`
- Modify: `src/sim/triptych-territory.ts`
- Modify: `src/sim/nodes.ts`
- Modify: `src/sim/geometry.ts`
- Modify: `src/sim/ai.ts`
- Modify: `tests/sim/triptych-opening-territory.test.ts`
- Modify: `tests/sim/geometry.test.ts`
- Modify: `tests/sim/ai-strategy.test.ts`
- Modify: `tests/client/board-projection.test.ts` or create a focused pawn-facing projection test

- [ ] RED: pin the coordinates listed in this plan, mirror symmetry, all opening pieces/forts on friendly territory, and the enlarged neutral frontier.
- [ ] RED: pin pawn forward as Victoria `+x`, Obsidian `-x`; reject the old `+/-y` behavior.
- [ ] RED: for each faction, project a legal pawn-forward origin/destination and assert the destination is geometrically closer on screen to the opposing home deployment anchor than the origin. This reproduces the visible-left regression as a presentation test.
- [ ] RED: pin promotion/frontline checks to board/home semantics rather than `y>=14`/`y<=1`.
- [ ] Implement the migrated opening and pawn-axis semantics. If the inherited projection makes logical forward visually retreat, correct the production projection/orientation rather than adding faction-specific visual hacks.
- [ ] Commit: `feat: align Triptych opening and pawns to east west war`.

### Task 3: Create One Faction-Claim Authority

**Files:**
- Modify: `src/sim/territory.ts`
- Modify: `src/sim/resolve-orders.ts`
- Modify: `src/client/input/strategic-targeting.ts`
- Modify: `tests/sim/annex-orders.test.ts`
- Create: `tests/sim/territory-claims.test.ts`
- Modify: `tests/client/strategic-targeting.test.ts`

**Interface:**
```ts
type ClaimSource = 'annex_command' | 'settlement' | 'banner' | 'fortification';
canFactionClaimTile(world, faction, cell, source): ClaimDecision;
claimFactionTile(world, faction, cell, source): ClaimResult;
```

- [ ] RED: explicit annex and settlement both accept the same adjacent neutral frontier cell.
- [ ] RED: remote neutral settlement leaves the unit in place but leaves tile neutral.
- [ ] RED: enemy-controlled occupation never directly flips ownership.
- [ ] Implement shared decision/mutation helpers and make `annexTile()` a thin compatibility wrapper.
- [ ] Refactor `resolveSettlement()` to call the shared authority instead of painting tiles directly.
- [ ] Make client `legalStrategicTargets(...,'annex_tile')` call the same legality function rather than duplicating adjacency logic.
- [ ] Commit: `feat: coalesce faction claims and settlement annexation`.

### Task 4: Add Connected Supply Territory

**Files:**
- Create: `src/sim/supply.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/triptych-territory.ts`
- Modify: `src/sim/fortifications.ts`
- Modify: `src/sim/polarity.ts` only if an existing banner state is used as a legal temporary supply influence
- Create: `tests/sim/supply.test.ts`

**Interfaces:**
```ts
suppliedTerritoryIds(world, faction): ReadonlySet<TileId>;
isCellSupplied(world, faction, cell): boolean;
unitSupplyState(world, unitId): 'supplied' | 'exposed' | 'strained' | 'attrition';
```

- [ ] RED: home-connected territory is supplied; an owned island separated by neutral/enemy tiles is not.
- [ ] RED: reconnecting one bridge tile restores downstream supply deterministically.
- [ ] Root each faction supply network in its opening home territory/deployment base. Fortifications may stabilize an already connected frontier but may not teleport-connect an island.
- [ ] Keep banner supply influence conservative in this first slice: no disconnected permanent supply island. If implemented, it may only extend one orthogonal step from an already supplied frontier.
- [ ] Commit: `feat: add connected Triptych supply lattice`.

### Task 5: Add Progressive Reinforcement-Boundary Attrition

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/turns.ts`
- Modify: `src/sim/combat.ts` only for safe health mutation helpers if needed
- Modify: `src/sim/replay.ts`
- Create: `tests/sim/attrition.test.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`

- [ ] Add per-unit deterministic `unsuppliedRounds` state, preferably in a dedicated supply record rather than contaminating positional truth.
- [ ] RED progression: supplied `0`; first unsupported reinforcement `1`; second `2`; third `3` and `10 HP` damage; each later unsupported reinforcement remains attrition and loses another `10 HP`; restoration resets to `0`.
- [ ] Emit explicit supply/attrition events so UI and presentation never infer damage from diffs.
- [ ] Apply attrition once per reinforcement phase, never per presentation tick.
- [ ] Include supply state in canonical replay snapshot/determinism tests.
- [ ] Commit: `feat: add deterministic unsupported unit attrition`.

### Task 6: Remove the 16x16 AI Trap and Make Strategy Supply-Aware

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: `tests/sim/ai-strategy.test.ts`
- Modify: `tests/sim/ai-tactics.test.ts`
- Modify: `tests/sim/ai-intelligence.test.ts`

- [ ] RED: an Obsidian unit in the east realm can select legal progress cells with `x>15`; planner candidate enumeration covers all playable 32x32 cells.
- [ ] Replace `for y<16 / x<16` with topology-driven `allPlayableCells()` or board constants.
- [ ] Replace hard-coded `reinforce_front {x:7,y:7}` with a topology-aware frontier objective derived from supplied territory/strategic nodes.
- [ ] Penalize moves that increase unsupported exposure, but allow a raid when no supplied alternative advances a higher-priority target.
- [ ] Ensure AI never reads hidden enemy truth while evaluating supply corridors.
- [ ] Commit: `fix: make Shadow strategy board and supply aware`.

### Task 7: Expose Supply and Frontier State to Existing Strategic Presentation

**Files:**
- Modify: `src/client/render/triptych-presentation.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: `tests/client/triptych-camera-overlay-coherence.test.ts`
- Create: `tests/client/triptych-supply-overlay.test.ts`

- [ ] Add dynamic records for supplied territory, disconnected owned territory and legal annex frontier without baking ownership into board art.
- [ ] Keep crimson/violet ownership subtle; disconnected territory receives a distinct readable treatment; legal annex frontier is a transient focus overlay.
- [ ] Prove all states stay camera-bound after pan/zoom.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Commit: `feat: present Triptych supply and frontier truth`.
