# Phase 4 Economy, Territory & Reinforcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn territorial control into a deterministic Crown economy and Battle-Cats-like reinforcement loop with unlocks, Command Capacity, hard caps, production pulses, and Pawn promotion while preserving all Phase 0–3 simulation guarantees.

**Architecture:** Add focused `nodes.ts`, `economy.ts`, `production.ts`, and `promotion.ts` subsystems with immutable state carried in `WorldState`; keep `step.ts` as orchestration only. Combat remains authoritative for damage and death, with one narrow provenance extension so economy can consume positional-kill truth instead of recomputing it. Production and promotion commands are collected during the command phase, then applied at their specified later transaction stages.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, existing deterministic fixed-tick simulation.

**Spec:** `docs/superpowers/specs/2026-09-28-phase4-economy-territory-reinforcements-design.md`

## Global Constraints

- The 16×16 board has exactly seven fixed capture nodes, each with a 3×3 capture zone; Kings never contribute capture presence.
- `NODE_CAPTURE_TICKS = 30`, `CROWN_INCOME_INTERVAL_TICKS = 30`, `REINFORCEMENT_PULSE_TICKS = 50`; because state starts at tick 0, interval boundaries use `(tick + 1) % interval === 0` so the first payout/pulse occurs after 30/50 processed ticks rather than immediately at tick 0.
- Enemy-owned nodes require a full neutralization timer followed by a second full capture timer; contested progress pauses; abandoned/hostile progress unwinds one tick at a time before a different faction can accumulate its own progress.
- Crown Power is non-negative integer state. Minor node income is +1; Crown Node income is +2. Kill rewards are Pawn 5, Knight 10, Bishop 10, Rook 14, Queen 25, King 0; positional lethal provenance adds floored +25%.
- Unlock thresholds by owned-node count are Pawn 0, Knight 2, Bishop 3, Rook 4. Losing territory blocks future recruitment but never deletes living units.
- Command Capacity is base 6, +2 per owned minor node, +1 for the Crown Node, hard-capped at 16. Weights are Pawn 1, Knight 2, Bishop 2, Rook 3, King 0.
- Hard piece caps, counting living plus queued reservations, are Pawn 6, Knight 2, Bishop 2, Rook 2.
- Recruitment costs are Pawn 10, Knight 24, Bishop 24, Rook 38. Crown is spent when recruitment is accepted, queue order is FIFO, and blocked queue heads never leapfrog.
- Promotion costs are deltas: Pawn→Knight 14, Pawn→Bishop 14, Pawn→Rook 28. Promotion never creates a Queen and resolves only on reinforcement-pulse boundaries.
- No Phase 4 action creates retroactive same-tick combat. Terminal matches remain exactly frozen under Phase 3 semantics.
- No renderer, wall clock, randomness, hero abilities, AI strategy, multiplayer, or Phase 5 behavior enters authoritative state.

## Fixed map values

The default Phase 4 map uses these immutable node centers (0-based coordinates):

```ts
crown:    { x: 7,  y: 7  }
minor-nw: { x: 3,  y: 3  }
minor-ne: { x: 12, y: 3  }
minor-w:  { x: 3,  y: 8  }
minor-e:  { x: 12, y: 7  }
minor-sw: { x: 3,  y: 12 }
minor-se: { x: 12, y: 12 }
```

Reinforcement anchors are Victoria `{ x: 1, y: 1 }` and Obsidian `{ x: 14, y: 14 }`. Spawn search checks the anchor first, then increasing Chebyshev rings, sorting candidate cells by `y` then `x`; occupied cells, out-of-bounds cells, and capture-node center cells are illegal spawn destinations.

## Shared ordering rules

Existing move/attack tie behavior must be preserved. Add `compareSimCommands(a, b)` with ordering: `sequence`, then actor key, then command type. Actor key is `unitId` for move/attack, `faction` for recruit, and `pawnId` for promote. Economy commands are collected in this order but mutate only at their Phase 4 transaction stage.

Faction iteration is always `victoria`, then `obsidian`. Node iteration is always lexicographic `nodeId`. Queue order is array order. Promotion requests resolve by `(sequence, pawnId, targetKind)`.

## Review Focus

1. A faction changing sides on a partially progressed node must first unwind the old faction's progress to zero, with no inherited capture work.
2. Territory loss that makes existing living+queued usage exceed Command Capacity must not delete/refund anything; recruitment and deployment remain blocked until legality returns.
3. A positional focus-fire kill must receive exactly one kill reward for the defeated piece, with +25% applied if at least one lethal-tick contributing attacker carried combat-owned positional tags.
4. Spawn congestion must preserve FIFO: an undeployable queue head remains first and later entries do not deploy around it.
5. Promotion must not heal a damaged Pawn or reset its tactical state: the promoted unit keeps the same ID, coordinate, health, cooldown, target, stance, and guard anchor; only `kind` changes.

---

### Task 1: Phase 4 world contracts and fixed map configuration

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/index.ts`
- Create: `src/sim/nodes.ts`
- Create: `tests/sim/phase4-state.test.ts`

**Interfaces:**
- Consumes: existing `Coord`, `Faction`, `UnitKind`, `WorldState` construction.
- Produces: `CaptureNodeState`, `TerritoryState`, `EconomyState`, `RecruitableUnitKind`, `ProductionQueueEntry`, `ProductionState`, `PromotableUnitKind`, `PendingPromotion`, `PromotionState`, `createInitialTerritoryState()`, and initialized Phase 4 state on every `createWorld()`.

Use these state shapes:

```ts
export type CaptureNodeState = Readonly<{ id: string; kind: 'minor' | 'crown'; center: Coord; owner: Faction | null; capturingFaction: Faction | null; captureProgressTicks: number; contested: boolean }>;
export type TerritoryState = Readonly<{ nodes: Readonly<Record<string, CaptureNodeState>> }>;
export type EconomyState = Readonly<{ crownPower: Readonly<Record<Faction, number>> }>;
export type RecruitableUnitKind = 'pawn' | 'knight' | 'bishop' | 'rook';
export type ProductionQueueEntry = Readonly<{ id: string; faction: Faction; unitKind: RecruitableUnitKind; cost: number; capacityWeight: number; queuedTick: number }>;
export type ProductionState = Readonly<{ queues: Readonly<Record<Faction, readonly ProductionQueueEntry[]>>; nextEntryOrdinal: Readonly<Record<Faction, number>>; reinforcementAnchors: Readonly<Record<Faction, Coord>> }>;
export type PromotableUnitKind = 'knight' | 'bishop' | 'rook';
export type PendingPromotion = Readonly<{ faction: Faction; pawnId: string; targetKind: PromotableUnitKind; sequence: number; requestedTick: number }>;
export type PromotionState = Readonly<{ pending: readonly PendingPromotion[] }>;
```

Add `territory`, `economy`, `production`, and `promotions` to `WorldState`.

- [ ] **Step 1: Write failing construction tests**

Test `createWorld()` has exactly seven node IDs/centers, neutral zero-progress state, Crown balances `0/0`, empty queues/promotion list, entry ordinals `1/1`, and fixed reinforcement anchors. Assert node configuration is deterministic under repeated construction.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/phase4-state.test.ts`
Expected: FAIL because Phase 4 contracts/state do not exist.

- [ ] **Step 3: Implement minimal contracts and initialization**

Create `DEFAULT_CAPTURE_NODES` and `createInitialTerritoryState()` in `nodes.ts`; initialize the remaining Phase 4 state in `world.ts`. Export the new module from `index.ts`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/phase4-state.test.ts tests/sim/kernel.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/world.ts src/sim/index.ts src/sim/nodes.ts tests/sim/phase4-state.test.ts
git commit -m "phase4: add territory economy production state"
```

### Task 2: Node occupation, contest, decay, neutralization, and capture

**Files:**
- Modify: `src/sim/nodes.ts`
- Modify: `src/sim/types.ts`
- Create: `tests/sim/nodes.test.ts`

**Interfaces:**
- Consumes: `WorldState.territory`, living `units/combat`, fixed node configuration.
- Produces: `NODE_CAPTURE_TICKS = 30`, `isInsideCaptureZone(coord, node)`, `evaluateNodeControl(world): { state: WorldState; events: readonly SimEvent[] }`.

- [ ] **Step 1: Write failing node-state-machine tests**

Cover: inside 3×3 advances; immediately outside does not; King presence does not count; neutral capture occurs exactly on the 30th processed capture tick; contested progress pauses and emits exactly one `node.contested`; relief from contest emits one `node.uncontested`; abandonment decays by one; opposite-faction presence unwinds old progress to zero before starting its own; enemy-owned node emits `node.neutralized` after one full timer and `node.captured` only after a second full timer.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/nodes.test.ts`
Expected: FAIL because node evaluation/events do not exist.

- [ ] **Step 3: Implement the deterministic node state machine**

Add event variants:

```ts
{ type: 'node.contested'; tick: number; nodeId: string }
{ type: 'node.uncontested'; tick: number; nodeId: string }
{ type: 'node.neutralized'; tick: number; nodeId: string; previousOwner: Faction; byFaction: Faction }
{ type: 'node.captured'; tick: number; nodeId: string; owner: Faction }
```

When hostile progress reaches zero during an ownership switch, do not also advance the new faction in that same tick.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/nodes.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/nodes.ts src/sim/types.ts tests/sim/nodes.test.ts
git commit -m "phase4: add deterministic node control"
```

### Task 3: Crown income, unlocks, capacity, and combat-owned kill provenance

**Files:**
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/types.ts`
- Create: `src/sim/economy.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/economy.test.ts`
- Modify: `tests/sim/combat-resolution.test.ts`

**Interfaces:**
- Consumes: node ownership, `unit.killed`/`attack.fired` combat truth, pre-combat unit registry.
- Produces: `CROWN_INCOME_INTERVAL_TICKS = 30`, `KILL_REWARD`, `RECRUIT_UNLOCK_NODE_COUNT`, `CAPACITY_WEIGHT`, `ownedNodeCount`, `isRecruitUnlocked`, `commandCapacity`, `capacityUsage`, `pieceCountWithQueue`, `applyCrownIncome`, `applyKillRewards`.

- [ ] **Step 1: Write failing economy and provenance tests**

Assert minor/Crown income +1/+2 only on `(tick + 1) % 30 === 0`; no off-boundary income; rewards 5/10/10/14/25/0; focus-fire pays once; positional contributor produces floored +25%; unlock thresholds 0/2/3/4; capacity formula caps at 16; capacity and piece counts include queued reservations.

Extend combat regression with `attack.fired.positionalTags` and `unit.killed.positionalBonusApplied`; for focus fire, the kill flag is true if any contributing lethal-tick attack has non-empty positional tags.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/economy.test.ts tests/sim/combat-resolution.test.ts`
Expected: FAIL because economy helpers/provenance fields do not exist.

- [ ] **Step 3: Extend combat provenance minimally**

Change attack intent/event to carry sorted `positionalTags`; aggregate the boolean onto `unit.killed`. Do not move positional evaluation into economy.

- [ ] **Step 4: Implement economy derivations and mutation helpers**

`applyCrownIncome(world)` and `applyKillRewards(world, preCombatWorld, combatEvents)` return immutable `{ state, events }`. Kill reward faction comes from the first sorted `byUnitIds` attacker in `preCombatWorld`; all contributors are already enemy units of the defeated target. Emit at most one `crown.kill_reward` per `unit.killed` event.

- [ ] **Step 5: Verify Phase 2 compatibility**

Run: `npm test -- tests/sim/economy.test.ts tests/sim/combat-resolution.test.ts tests/sim/position.test.ts tests/sim/phase2-replay.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/combat.ts src/sim/types.ts src/sim/economy.ts src/sim/index.ts tests/sim/economy.test.ts tests/sim/combat-resolution.test.ts
git commit -m "phase4: add Crown economy and combat reward provenance"
```

### Task 4: Recruitment commands, deterministic ordering, and FIFO reservations

**Files:**
- Modify: `src/sim/types.ts`
- Create: `src/sim/commands.ts`
- Create: `src/sim/production.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/production-queue.test.ts`
- Modify: `tests/sim/kernel.test.ts`

**Interfaces:**
- Consumes: economy unlock/capacity/piece helpers and Crown balances.
- Produces: `RecruitCommand`, `RECRUITMENT_COST`, `compareSimCommands`, `queueRecruitment(world, command): { state; events }`.

`RecruitCommand`:

```ts
{ type: 'recruit'; sequence: number; issuedTick: number; faction: Faction; unitKind: RecruitableUnitKind }
```

Queue IDs are `${faction}-recruit-${ordinal}` using per-faction `nextEntryOrdinal` starting at 1.

- [ ] **Step 1: Write failing queue tests**

Cover: legal Pawn at 0 nodes; Knight/Bishop/Rook lock thresholds; insufficient Crown no mutation; accepted recruit emits `crown.spent` then `production.queued`, spends immediately, reserves capacity and piece cap, increments ordinal, and preserves FIFO; capacity exceeded; queued piece cap reached; territory loss prevents newly relocked recruitment without deleting existing units/queue.

Add command-order tests proving old move/attack same-sequence unit-ID ordering is unchanged and mixed commands are deterministic.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/sim/production-queue.test.ts tests/sim/kernel.test.ts`
Expected: FAIL because recruitment and shared command ordering do not exist.

- [ ] **Step 3: Implement recruitment validation and queue mutation**

Validation order: active match → unlocked → sufficient Crown → capacity → piece cap. Add `production.rejected` reasons `match_ended | locked | insufficient_crown | capacity_exceeded | piece_cap_reached`.

- [ ] **Step 4: Implement shared command comparator**

Use `compareSimCommands` everywhere `step.ts` currently has an inline command sort once Task 7 integrates orchestration.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/production-queue.test.ts tests/sim/kernel.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/types.ts src/sim/commands.ts src/sim/production.ts src/sim/index.ts tests/sim/production-queue.test.ts tests/sim/kernel.test.ts
git commit -m "phase4: add deterministic recruitment queues"
```

### Task 5: Reinforcement pulse and deterministic spawn search

**Files:**
- Modify: `src/sim/production.ts`
- Modify: `src/sim/types.ts`
- Create: `tests/sim/reinforcements.test.ts`

**Interfaces:**
- Consumes: production queue, current unlock/capacity/piece state, occupancy, fixed anchors, `placeUnit`.
- Produces: `REINFORCEMENT_PULSE_TICKS = 50`, `findReinforcementSpawn(world, faction): Coord | null`, `deployReinforcements(world): { state; events }`.

- [ ] **Step 1: Write failing pulse/spawn tests**

Cover: no deployment before tick 49; deployment at tick 49; anchor-first spawn; occupied anchor chooses deterministic nearest legal tile by Chebyshev radius then `y/x`; node centers are skipped; fully blocked search leaves head queued; blocked head prevents second entry leapfrog; territory/capacity relock leaves head queued without refund; deployed unit uses ID `unit:${queueEntryId}` and starts with normal combat state.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/reinforcements.test.ts`
Expected: FAIL because deployment/spawn helpers do not exist.

- [ ] **Step 3: Implement spawn search and one-head-per-faction pulse**

On a pulse, evaluate Victoria then Obsidian. Revalidation failure or no spawn emits no deployment event and leaves the queue unchanged. Successful deployment removes only the head and emits `reinforcement.deployed`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/reinforcements.test.ts tests/sim/combat-state.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/production.ts src/sim/types.ts tests/sim/reinforcements.test.ts
git commit -m "phase4: add reinforcement pulse deployment"
```

### Task 6: Pawn promotion requests and pulse-boundary resolution

**Files:**
- Create: `src/sim/promotion.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/promotion.test.ts`

**Interfaces:**
- Consumes: `PromoteCommand`, Crown balances, unlock/capacity/piece helpers, reinforcement-pulse boundary.
- Produces: `PROMOTION_COST`, `queuePromotionRequest(world, command): { state; events }`, `resolvePromotions(world): { state; events }`.

`PromoteCommand`:

```ts
{ type: 'promote'; sequence: number; issuedTick: number; faction: Faction; pawnId: string; targetKind: PromotableUnitKind }
```

Promotion eligibility ranks are Victoria `y >= 14`, Obsidian `y <= 1`. Only one pending request per Pawn is allowed; a second request rejects with `already_pending`.

- [ ] **Step 1: Write failing promotion tests**

Cover: far-two-rank eligibility; wrong faction/missing/non-Pawn rejection; Queen is unrepresentable by the type; accepted request emits `promotion.requested` but spends nothing immediately; no resolution before pulse; pulse rechecks unlock/Crown/target cap/capacity delta; costs 14/14/28; rejection spends nothing and removes the pending request; success emits `crown.spent` then `promotion.completed`.

Pin Review Focus #5: successful promotion retains the same unit ID and position and preserves current `health`, `cooldownTicks`, `targetId`, `stance`, and `guardAnchor` while changing only `unit.kind`; this prevents promotion healing/reset exploits and guarantees no retroactive combat.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/promotion.test.ts`
Expected: FAIL because promotion helpers do not exist.

- [ ] **Step 3: Implement request and pulse resolution**

Immediate request validation: active match, Pawn exists, faction matches, Pawn is in promotion zone, no pending request. Boundary resolution order is `(sequence, pawnId, targetKind)`; each request sees state mutations from earlier resolved requests in that same boundary.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sim/promotion.test.ts tests/sim/combat-state.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/promotion.ts src/sim/types.ts src/sim/index.ts tests/sim/promotion.test.ts
git commit -m "phase4: add deterministic Pawn promotion"
```

### Task 7: Integrate the complete Phase 4 tick transaction

**Files:**
- Modify: `src/sim/step.ts`
- Modify: `src/sim/types.ts`
- Create: `tests/sim/phase4-ordering.test.ts`
- Modify: `tests/sim/terminal-match.test.ts`

**Interfaces:**
- Consumes: node, economy, production, promotion, sovereign, combat, Guard, and command-order helpers.
- Produces: authoritative Phase 4 `stepWorld` ordering.

Required transaction:

```text
terminal guard
→ Guard refresh
→ combat
→ sovereign outcome
→ stop if terminal
→ ordered move/attack execution + collect recruit/promote intents
→ node control
→ Crown income then kill rewards
→ apply recruit commands in collected order
→ queue promote commands in collected order
→ reinforcement pulse
→ promotion resolution
→ sovereign threat
→ advance tick
```

- [ ] **Step 1: Write failing orchestration tests**

Prove: a decisive King death prevents node/economy/production/promotion mutations; a movement command can enter a capture zone and progress it in the same tick but cannot retroactively fight; same-tick scheduled income/kill rewards can fund a later recruitment command because economy precedes queue mutation; a newly deployed unit cannot fire until a later tick; promotion can alter tick-end sovereign threat but not earlier combat; terminal recruit emits `production.rejected(match_ended)` and terminal promote emits `promotion.rejected(match_ended)` while existing move/attack terminal `command.rejected` behavior remains byte-stable.

- [ ] **Step 2: Run focused integration tests and confirm RED**

Run: `npm test -- tests/sim/phase4-ordering.test.ts tests/sim/terminal-match.test.ts`
Expected: FAIL because `stepWorld` has not orchestrated Phase 4.

- [ ] **Step 3: Refactor `stepWorld` into orchestration only**

Replace the inline sort with `compareSimCommands`; execute move/attack exactly as Phase 3 does, collect economy commands, then call subsystem helpers in the required order. Do not duplicate node/economy/production/promotion rules in `step.ts`.

- [ ] **Step 4: Verify Phase 0–3 regression seam**

Run: `npm test -- tests/sim/phase4-ordering.test.ts tests/sim/terminal-match.test.ts tests/sim/sovereign-outcome.test.ts tests/sim/sovereign-transitions.test.ts tests/sim/guard.test.ts tests/sim/kernel.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/step.ts src/sim/types.ts tests/sim/phase4-ordering.test.ts tests/sim/terminal-match.test.ts
git commit -m "phase4: integrate territory economy reinforcement tick"
```

### Task 8: Canonical Phase 4 replay truth

**Files:**
- Modify: `src/sim/replay.ts`
- Create: `tests/sim/phase4-replay.test.ts`

**Interfaces:**
- Consumes: all new Phase 4 authoritative state and event streams.
- Produces: canonical snapshots with sorted nodes, Crown state, FIFO queues, deterministic ordinals/anchors, and ordered pending promotions.

- [ ] **Step 1: Write failing replay tests**

Create two identical multi-tick histories traversing node capture, an income boundary, kill reward, recruitment, a 50-tick deployment pulse, and Pawn promotion; assert identical `eventsByTick` and byte-identical `canonicalSnapshot`. Include a replay where a queue head stays blocked across pulses and a pending promotion rejects deterministically.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/phase4-replay.test.ts`
Expected: FAIL because canonical snapshots omit Phase 4 state.

- [ ] **Step 3: Normalize Phase 4 state in `canonicalSnapshot`**

Sort node IDs; emit Crown fields in fixed faction order; preserve queue FIFO; include `nextEntryOrdinal`, fixed anchors, and promotions sorted by `(sequence, pawnId, targetKind)`. No renderer/platform state.

- [ ] **Step 4: Verify replay regressions**

Run: `npm test -- tests/sim/phase4-replay.test.ts tests/sim/phase3-replay.test.ts tests/sim/phase2-replay.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/replay.ts tests/sim/phase4-replay.test.ts
git commit -m "phase4: include economy territory in deterministic replay"
```

### Task 9: Full regression and Phase 4 acceptance receipt

**Files:**
- Create: `docs/PHASE4_ECONOMY_TERRITORY_REINFORCEMENTS_ACCEPTANCE.md`

**Interfaces:**
- Consumes: complete Phase 4 branch and the 36-case spec acceptance matrix.
- Produces: human-readable verification receipt with exact test count, typecheck result, commit SHA, and any non-blocking warnings.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: every Phase 0–4 test file PASS, zero failed tests.

- [ ] **Step 2: Run TypeScript verification**

Run: `npm run typecheck`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 3: Audit all 36 acceptance cases against named tests**

For each numbered item in the spec matrix, record the exact test file/test name that proves it. If any item lacks proof, add the smallest missing test under TDD before writing the receipt.

- [ ] **Step 4: Write the acceptance receipt**

Record: branch/head SHA, environment, exact Vitest file/test totals, typecheck result, all 36 case mappings, and confirmation that Phase 0–3 regressions remain green. Do not claim GitHub CI until a workflow on the exact final head completes successfully.

- [ ] **Step 5: Commit**

```bash
git add docs/PHASE4_ECONOMY_TERRITORY_REINFORCEMENTS_ACCEPTANCE.md
git commit -m "docs: record Phase 4 economy acceptance"
```

- [ ] **Step 6: Final external gate**

Push/open the Phase 4 PR only with the user's normal repository workflow, then verify GitHub Actions on the exact final head. A local/Termux green suite plus clean typecheck is necessary but not a substitute for the final CI receipt when CI is available.
