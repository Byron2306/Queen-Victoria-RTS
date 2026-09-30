# Triptych READY Home Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Use TDD for every behavioral change and keep each task independently green.

**Goal:** Preserve Crown purchasing and production queues while replacing silent auto-spawn with an explicit READY recruit lifecycle and deterministic 5x5 world-grounded Home Deployment Zones for both factions.

**Architecture:** Recruitment purchase remains authoritative in `queueRecruitment()`. Reinforcement resolution no longer chooses a map cell. Instead it moves eligible queue heads into faction `ready` lists. A separate deterministic deployment authority validates a specific READY entry against the faction's fixed 5x5 zone, occupancy, topology and node/fort constraints. Human deployment is drag/drop through this authority; AI chooses from the same legal cells deterministically.

**Tech Stack:** TypeScript, Vitest, Phaser pointer input, existing Crown/capacity/production systems.

**Spec:** `docs/superpowers/specs/2026-09-30-triptych-coalesced-strategy-and-presentation.md`

## Frozen Deployment Geometry for Implementation Review

After Plan 1's 32x32 migration:

- Victoria Home Deployment center: `(3,16)`.
- Victoria 5x5 zone: `x=1..5, y=14..18`.
- Obsidian Home Deployment center: `(28,15)`.
- Obsidian 5x5 zone: `x=26..30, y=13..17`.
- Only playable, empty zone cells are deployable.
- A READY recruit never silently falls back to a different cell.
- Human deployment does **not** consume an additional Royal Command. Crown/capacity commitment happened at purchase.
- AI obeys identical zone legality.

## State Contract

Extend production state to:

```ts
type ProductionState = Readonly<{
  queues: Readonly<Record<Faction, readonly ProductionQueueEntry[]>>;
  ready: Readonly<Record<Faction, readonly ProductionQueueEntry[]>>;
  nextEntryOrdinal: Readonly<Record<Faction, number>>;
  reinforcementAnchors: Readonly<Record<Faction, Coord>>; // retained as home-zone centres
}>;
```

Deployment API target:

```ts
legalDeploymentCells(world, faction): readonly Coord[];
prepareReinforcements(world): DeploymentPreparationResult;
deployReadyRecruit(world, faction, queueEntryId, cell): DeploymentResult;
```

## Global Constraints

- Crown spending, unlocks, capacity and hard caps remain unchanged.
- One eligible queue head per faction advances to READY at each reinforcement boundary, preserving current reinforcement cadence unless tests prove a different existing contract.
- READY units count toward reserved capacity/piece caps exactly as queued units do.
- READY entries persist across rounds until deployed.
- Deployment is world state, not presentation fiction.
- Invalid deployment never consumes/removes a READY entry.
- No human-facing `findReinforcementSpawn()` authority remains after this plan.
- Hero respawn or unrelated spawn users must be audited before deleting the helper itself.

## Review Focus

- A purchase receipt must distinguish QUEUED from READY from DEPLOYED.
- A fully blocked 5x5 zone leaves the recruit READY rather than lost/refunded/teleported.
- Camera movement must not detach deployment highlights or drag ghost from logical cells.
- Touch input must work without requiring tiny sprite precision.
- AI must not get a privileged spawn path.

---

### Task 1: Add READY Production State Without Changing Purchase Economics

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/production.ts`
- Modify: `src/sim/economy.ts` if queue/capacity accounting currently inspects only `queues`
- Modify: `src/sim/replay.ts`
- Modify: `tests/sim/production-queue.test.ts`
- Create: `tests/sim/ready-production.test.ts`

- [ ] RED: accepted recruitment still spends Crown immediately and remains FIFO in `queues`.
- [ ] RED: reinforcement preparation moves one legal head from `queues[faction]` to `ready[faction]` without creating a unit or occupancy entry.
- [ ] RED: READY entries remain reserved in capacity/piece-cap calculations.
- [ ] Add `production.ready` initialized empty for both factions and include it in replay snapshots.
- [ ] Replace `deployReinforcements()` auto-placement semantics with `prepareReinforcements()`; keep a compatibility wrapper only if required by untouched callers during migration.
- [ ] Emit `production.ready` event containing faction, entry id and unit kind.
- [ ] Commit: `feat: promote completed recruits to READY state`.

### Task 2: Define Fixed 5x5 Home Deployment Zones

**Files:**
- Create: `src/sim/deployment.ts`
- Modify: `src/sim/world.ts`
- Create: `tests/sim/deployment-zone.test.ts`

**Interfaces:**
```ts
homeDeploymentZone(faction): readonly Coord[];
legalDeploymentCells(world, faction): readonly Coord[];
canDeployReadyRecruit(world, faction, entryId, cell): DeploymentDecision;
```

- [ ] RED: each faction has exactly 25 zone coordinates before occupancy filtering and the coordinates match the frozen geometry above.
- [ ] RED: off-zone, void, occupied, node-centre and hostile-rule cells are refused with stable reasons.
- [ ] RED: legal cell ordering is deterministic (`y`, then `x`).
- [ ] Implement zone authority from logical coordinates, not screen pixels.
- [ ] Commit: `feat: define five by five home deployment zones`.

### Task 3: Add Explicit READY Deployment Mutation

**Files:**
- Modify: `src/sim/deployment.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/deploy-ready-recruit.test.ts`

- [ ] RED: deploying a READY Pawn onto a legal Victoria cell creates exactly `unit:<queueEntryId>` at that cell, initializes combat/military state through existing placement authority, and removes only that READY entry.
- [ ] RED: invalid drop leaves world byte-for-byte unchanged.
- [ ] RED: attempting to deploy another faction's READY entry is refused.
- [ ] Emit `reinforcement.deployed` only after explicit placement, preserving downstream event compatibility.
- [ ] Commit: `feat: deploy READY recruits only to chosen home cells`.

### Task 4: Make Reinforcement Phase Prepare Rather Than Teleport

**Files:**
- Modify: `src/sim/turns.ts`
- Modify: `src/client/phaser/battlefield-scene.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`
- Modify or create reinforcement-phase tests under `tests/sim/`

- [ ] RED: completing a round can make a recruit READY but does not increase `world.units` until an explicit deployment action occurs.
- [ ] Wire reinforcement phase to `prepareReinforcements()` and Plan 1's attrition/supply update in deterministic order.
- [ ] Keep round reset behavior and Royal Command budgets unchanged.
- [ ] Commit: `refactor: stop reinforcement phase from auto spawning units`.

### Task 5: Give AI the Same Deployment Legality

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: `tests/sim/ai-strategy.test.ts`
- Create: `tests/sim/ai-deployment.test.ts`

- [ ] RED: Obsidian with a READY unit selects only from `legalDeploymentCells(world,'obsidian')`.
- [ ] Deterministic choice order: prefer supplied empty cell closest to current strategic objective; tie break `y`, then `x`.
- [ ] If no legal cell exists, leave recruit READY and issue no deployment mutation.
- [ ] No call to `findReinforcementSpawn()` is permitted in AI recruitment/deployment.
- [ ] Commit: `feat: make Shadow deploy READY units by home zone rules`.

### Task 6: Add Client READY Tray and Drag/Drop State Machine

**Files:**
- Create: `src/client/input/deployment-drag.ts`
- Modify: `src/client/runtime/command-bridge.ts`
- Modify: `src/client/phaser/royal-battlefield-scene.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: `tests/client/strategic-command-bridge.test.ts`
- Create: `tests/client/deployment-drag.test.ts`

**Client state:** `idle -> dragging_ready(entryId) -> dropped_valid | cancelled`.

- [ ] RED: selecting a READY tray item arms drag state without mutating sim.
- [ ] RED: drag ghost maps pointer through current camera projection to a logical cell.
- [ ] RED: valid release stages/executes explicit READY deployment; invalid release cancels and preserves READY entry.
- [ ] Make the entire tray slot touch-friendly, not just the unit illustration.
- [ ] Commit: `feat: drag READY recruits onto home deployment cells`.

### Task 7: Render Camera-Bound 5x5 Deployment Guidance

**Files:**
- Create: `src/client/render/deployment-zone-overlay.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: `src/client/phaser/royal-battlefield-guidance.ts`
- Modify: `tests/client/royal-battlefield-guidance.test.ts`
- Create: `tests/client/deployment-zone-overlay.test.ts`

- [ ] Highlight the 5x5 home zone only while a READY recruit is selected/dragged.
- [ ] Distinguish legal empty cells from blocked/invalid cells.
- [ ] Guidance after purchase says QUEUED; after reinforcement says `PAWN READY · DRAG TO HOME ZONE`; after successful placement says DEPLOYED.
- [ ] Prove overlay polygons recompute from current projection after pan/zoom.
- [ ] Commit: `feat: show world grounded READY deployment zone`.

### Task 8: Retire Silent Spawn Authority and Run the Deployment Gauntlet

**Files:**
- Modify/delete only after usage audit: `src/sim/spawn.ts`
- Modify exports: `src/sim/index.ts`
- Update affected tests.

- [ ] Search all uses of `findReinforcementSpawn`. Remove it from ordinary recruitment. Keep or rename only if a genuinely separate hero-respawn requirement remains.
- [ ] Full scenario: buy Pawn -> Crown deducted -> round reinforcement -> Pawn READY -> no new unit yet -> drag to legal 5x5 cell -> one Pawn appears exactly there -> blocked/off-zone attempts never move it.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Commit: `test: lock explicit home deployment lifecycle`.
