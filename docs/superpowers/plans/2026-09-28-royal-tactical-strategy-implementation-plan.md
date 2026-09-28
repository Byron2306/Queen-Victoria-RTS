# Royal Tactical Strategy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Queen Victoria from real-time strategic authority into a deterministic turn-based Royal Tactical Strategy game while preserving the existing board, combat data, economy, hero systems, visual assets, and renderer-independence.

**Architecture:** Strategic authority moves into an explicit round/phase state machine, typed pending tactical orders, and a single deterministic resolver. Existing real-time systems are migrated behind those boundaries rather than deleted wholesale. Phaser becomes a presentation layer for command previews and resolved events; it never decides legality or mutates strategic truth.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, Phaser 4.2.1, Vite 7.3.6, deterministic simulation modules under `src/sim`, Phaser/client modules under `src/client`.

**Spec:** `docs/superpowers/specs/2026-09-28-royal-tactical-strategy-design.md`

## Global Constraints

- Initial Royal Command budget is exactly **4 per side per round**.
- Command Capacity remains separate from Royal Commands.
- Command phases enqueue pending orders; only resolution mutates authoritative board state.
- Initial resolution order is the committed order sequence.
- One logical unit per cell remains authoritative.
- Player and Shadow AI must use the same tactical-order and resolver interfaces.
- Existing renderer-independent simulation boundaries remain intact.
- Victoria pieces face right; Shadow pieces are mirrored to face left, presentation-only.
- The bottom HUD is a presentation exclusion band; simulation legality must not depend on HUD pixels.
- Existing `REINFORCEMENT_PULSE_TICKS` real-time semantics must not survive unchanged into the final turn-based model.
- Touch-first interaction remains canonical.
- No multiplayer, fog of war, hidden simultaneous orders, new unit classes, networking authority, or campaign systems in this migration.

## Review Focus

- A pending order references a unit that dies before its order resolves: resolver must return an explicit non-mutating outcome.
- The player tries to enqueue a fifth command: queue must refuse it without driving budget negative.
- A terminal sovereign victory occurs mid-resolution: later orders must not mutate the terminal match.
- A saved game is restored during a command phase with pending orders: phase, budget, queue order, and world state must restore deterministically.
- A resize/orientation change occurs with units near the lower board edge: renderer must preserve logical selection mapping and keep units above the HUD exclusion band.

---

## File Structure

### New simulation files

- `src/sim/turns.ts` — phase machine, round state, Royal Command budget, legal transitions.
- `src/sim/orders.ts` — tactical-order types and pending-order queue operations.
- `src/sim/resolve-orders.ts` — authoritative deterministic tactical-order resolver and outcomes.
- `src/sim/tactical-bonuses.ts` — geometry-derived Knight Fork, Open File, Royal Alignment, and Sovereign Line detection.

### Existing simulation files modified

- `src/sim/types.ts` — world-state additions and shared turn/order types.
- `src/sim/world.ts` — initialize turn state.
- `src/sim/commands.ts` — route player strategic commands into pending tactical orders.
- `src/sim/step.ts` — remove continuous strategic authority once round migration is complete.
- `src/sim/combat.ts` — expose deterministic attack helpers used by order resolution.
- `src/sim/guard.ts` — convert guard behavior to deterministic reaction semantics.
- `src/sim/abilities.ts` — expose order-resolvable hero ability effects.
- `src/sim/hero.ts` — round-based hero progression/cooldown advancement.
- `src/sim/ai.ts` — plan Shadow tactical orders without mutating world.
- `src/sim/economy.ts` — round-based Crown/node economy hooks.
- `src/sim/production.ts` — round-based recruitment/reinforcement progression.
- `src/sim/nodes.ts` — explicit round-phase control updates if required.
- `src/sim/sovereign.ts` — terminal checks usable during resolver boundaries.
- `src/sim/replay.ts` — record/replay committed order sequences.
- `src/client/persistence/save-game.ts` — persist round, phase, budget, and pending orders.

### Existing client files modified

- `src/client/runtime/command-bridge.ts` — issue/cancel/commit tactical orders instead of immediate strategic mutation.
- `src/client/runtime/fixed-tick-runtime.ts` — retain animation timing, remove strategic authority.
- `src/client/input/battlefield-input.ts` — turn-aware selection and order preview flow.
- `src/client/input/legal-destinations.ts` — derive previews from authoritative legal-order helpers.
- `src/client/hud/model.ts` — expose round, phase, Royal Commands, pending orders.
- `src/client/hud/text-model.ts` — format turn-aware HUD labels.
- `src/client/render/responsive-battlefield.ts` — reserve the lower visual exclusion band.
- `src/client/phaser/scene-rendering.ts` — resolution-event presentation.
- `src/client/phaser/phaser-scene.ts` — End Turn controls, pending-order visuals, unit facing, exclusion-band layout.
- `src/client/phaser/battlefield-scene.ts` — coordinate command-phase controller flow.

---

### Task 1: Turn-State Foundation

**Files:**
- Create: `src/sim/turns.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Test: `tests/sim/turns.test.ts`

**Interfaces:**
- Produces: `TurnPhase`, `TurnState`, `createInitialTurnState()`, `canTransitionTurnPhase()`, `transitionTurnPhase()`, `ROYAL_COMMANDS_PER_ROUND`.
- Consumers: Tasks 2–10.

- [ ] **Step 1: Write failing turn-state tests**

Cover these assertions in `tests/sim/turns.test.ts`:

```ts
expect(createInitialTurnState()).toEqual({
  round: 1,
  phase: 'victoria_command',
  royalCommandsRemaining: {
    victoria: 4,
    obsidian: 4,
  },
  pendingOrderIds: [],
});

expect(
  canTransitionTurnPhase(
    'victoria_command',
    'victoria_resolve',
  ),
).toBe(true);

expect(
  canTransitionTurnPhase(
    'victoria_command',
    'shadow_resolve',
  ),
).toBe(false);
```

Also assert:
- `reinforcement -> victoria_command` increments round.
- entering a new round resets both factions to 4 commands.
- illegal transition leaves state unchanged or returns an explicit refusal result.

- [ ] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/sim/turns.test.ts
```

Expected: FAIL because `src/sim/turns.ts` and turn state do not exist.

- [ ] **Step 3: Implement minimal turn-state types and transitions**

Add exact exported signatures:

```ts
export const ROYAL_COMMANDS_PER_ROUND = 4;

export type TurnPhase =
  | 'victoria_command'
  | 'victoria_resolve'
  | 'shadow_command'
  | 'shadow_resolve'
  | 'reinforcement';

export interface TurnState {
  round: number;
  phase: TurnPhase;
  royalCommandsRemaining: Record<Faction, number>;
  pendingOrderIds: string[];
}

export function createInitialTurnState(): TurnState;
export function canTransitionTurnPhase(
  from: TurnPhase,
  to: TurnPhase,
): boolean;

export function transitionTurnPhase(
  state: TurnState,
  to: TurnPhase,
): TurnState;
```

Add `turn: TurnState` to `WorldState` and initialize it in world creation.

- [ ] **Step 4: Run GREEN and regression**

```bash
npx vitest run tests/sim/turns.test.ts tests/sim/world.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/turns.ts src/sim/types.ts src/sim/world.ts tests/sim/turns.test.ts
git commit -m "feat: add royal tactical turn state"
```

---

### Task 2: Typed Pending Tactical Orders

**Files:**
- Create: `src/sim/orders.ts`
- Modify: `src/sim/types.ts`
- Test: `tests/sim/orders.test.ts`

**Interfaces:**
- Consumes: `TurnState`, `Faction`, existing board/unit/ability/recruit types.
- Produces: `TacticalOrder`, `enqueueTacticalOrder()`, `cancelTacticalOrder()`, `clearPendingOrders()`, `pendingOrdersForFaction()`.

- [ ] **Step 1: Write failing queue tests**

Test:
- first order consumes one Royal Command;
- four one-command orders are accepted;
- fifth order is refused and budget remains zero;
- cancel restores the command cost before commit;
- order sequence is preserved;
- Victoria cannot enqueue during Shadow command phase and vice versa;
- an invalid/refused enqueue does not consume budget.

Use exact result vocabulary:

```ts
type OrderQueueResult =
  | { status: 'ACCEPTED'; world: WorldState }
  | { status: 'REFUSED'; world: WorldState; reason: string };
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/orders.test.ts
```

Expected: FAIL because order queue does not exist.

- [ ] **Step 3: Implement order types and queue operations**

Define:

```ts
export type TacticalOrder =
  | MoveOrder
  | AttackOrder
  | GuardOrder
  | AbilityOrder
  | RecruitOrder;

export function enqueueTacticalOrder(
  world: WorldState,
  order: TacticalOrder,
): OrderQueueResult;

export function cancelTacticalOrder(
  world: WorldState,
  orderId: string,
): OrderQueueResult;

export function clearPendingOrders(
  world: WorldState,
): WorldState;

export function pendingOrdersForFaction(
  world: WorldState,
  faction: Faction,
): readonly TacticalOrder[];
```

Do not mutate board units, combat, nodes, Crown Power, or production when enqueuing.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/sim/orders.test.ts tests/sim/turns.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/orders.ts src/sim/types.ts tests/sim/orders.test.ts
git commit -m "feat: add pending tactical order queue"
```

---

### Task 3: Deterministic Order Resolver

**Files:**
- Create: `src/sim/resolve-orders.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/sovereign.ts`
- Test: `tests/sim/resolve-orders.test.ts`

**Interfaces:**
- Consumes: `TacticalOrder[]`, `WorldState`.
- Produces: `resolveCommittedOrders()`, `OrderResolutionOutcome`, deterministic resolution events.

- [ ] **Step 1: Write failing resolver tests**

Required cases:
- two move orders resolve in committed sequence;
- occupied destination is explicitly `REFUSED`;
- order for a unit killed earlier in the sequence is `SKIPPED`;
- same starting world + same orders produces deep-equal world and outcomes;
- terminal sovereign defeat stops later strategic mutations.

Define expected API:

```ts
export type OrderResolutionStatus =
  | 'RESOLVED'
  | 'REFUSED'
  | 'SKIPPED'
  | 'INTERRUPTED';

export interface OrderResolutionOutcome {
  orderId: string;
  status: OrderResolutionStatus;
  reason?: string;
}

export interface OrderResolutionResult {
  world: WorldState;
  outcomes: readonly OrderResolutionOutcome[];
  events: readonly ResolutionEvent[];
}

export function resolveCommittedOrders(
  world: WorldState,
  orders: readonly TacticalOrder[],
): OrderResolutionResult;
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/resolve-orders.test.ts
```

- [ ] **Step 3: Implement sequential deterministic resolution**

Reuse existing geometry/combat/sovereign helpers. Revalidate each order against the current resolution world immediately before applying it. Stop mutation after terminal match state.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/sim/resolve-orders.test.ts tests/sim/geometry.test.ts tests/sim/combat.test.ts tests/sim/sovereign.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/resolve-orders.ts src/sim/combat.ts src/sim/sovereign.ts tests/sim/resolve-orders.test.ts
git commit -m "feat: resolve tactical orders deterministically"
```

---

### Task 4: Convert Movement, Attack, and Guard to Orders

**Files:**
- Modify: `src/sim/commands.ts`
- Modify: `src/sim/guard.ts`
- Modify: `src/client/runtime/command-bridge.ts`
- Modify: `src/client/input/legal-destinations.ts`
- Test: `tests/sim/tactical-core-orders.test.ts`
- Test: `tests/client/turn-command-bridge.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 order queue and resolver.
- Produces: player-facing move/attack/guard order creation and deterministic guard reaction resolution.

- [ ] **Step 1: Write failing core-action tests**

Assert:
- issuing move during Victoria command phase queues it and leaves unit position unchanged;
- committing/resolving moves the unit;
- attack order leaves target health unchanged until resolution;
- guard order establishes reaction state only on resolution;
- guard reaction is deterministic and cannot recurse indefinitely;
- client command bridge sends typed orders rather than mutating world directly.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/tactical-core-orders.test.ts tests/client/turn-command-bridge.test.ts
```

- [ ] **Step 3: Implement command routing**

Add explicit command constructors or bridge methods:

```ts
issueMoveOrder(unitId: string, destination: BoardPosition): OrderQueueResult
issueAttackOrder(unitId: string, targetUnitId: string): OrderQueueResult
issueGuardOrder(unitId: string, anchor: BoardPosition): OrderQueueResult
```

Guard resolution must use a bounded reaction count defined in simulation, not renderer timing.

- [ ] **Step 4: Verify GREEN plus existing interaction tests**

```bash
npx vitest run \
  tests/sim/tactical-core-orders.test.ts \
  tests/client/turn-command-bridge.test.ts \
  tests/client/legal-destinations.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/commands.ts src/sim/guard.ts src/client/runtime/command-bridge.ts src/client/input/legal-destinations.ts tests/sim/tactical-core-orders.test.ts tests/client/turn-command-bridge.test.ts
git commit -m "feat: route core actions through tactical orders"
```

---

### Task 5: Victoria Abilities and Crown Spending

**Files:**
- Modify: `src/sim/abilities.ts`
- Modify: `src/sim/hero.ts`
- Modify: `src/sim/orders.ts`
- Modify: `src/sim/resolve-orders.ts`
- Test: `tests/sim/turn-abilities.test.ts`

**Interfaces:**
- Consumes: `AbilityOrder`, Crown economy, Victoria hero state.
- Produces: deterministic turn-resolved ability activation and round-based cooldown advancement.

- [ ] **Step 1: Write failing ability-order tests**

Cover each canonical ability:
- Royal Decree
- Hold the Crown
- Sovereign Line
- Imperial Gambit

Assert:
- enqueue does not spend Crown or alter ability state;
- resolution performs cost/effect atomically;
- insufficient Crown yields explicit refusal;
- inactive/cooldown states are deterministic;
- cooldown progression advances during round/reinforcement semantics, not fixed real-time strategic ticks.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/turn-abilities.test.ts
```

- [ ] **Step 3: Implement turn-resolved ability hooks**

Expose:

```ts
export function resolveAbilityOrder(
  world: WorldState,
  order: AbilityOrder,
): AbilityResolutionResult;

export function advanceHeroRoundState(
  world: WorldState,
): WorldState;
```

Do not add balance features beyond current ability semantics unless required for turn conversion.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/sim/turn-abilities.test.ts tests/sim/hero.test.ts tests/sim/abilities.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/abilities.ts src/sim/hero.ts src/sim/orders.ts src/sim/resolve-orders.ts tests/sim/turn-abilities.test.ts
git commit -m "feat: resolve Victoria abilities by turn"
```

---

### Task 6: Shadow Turn Planner

**Files:**
- Modify: `src/sim/ai.ts`
- Test: `tests/sim/turn-ai.test.ts`

**Interfaces:**
- Consumes: legal tactical-order helpers, Shadow world snapshot, 4-command budget.
- Produces: `planShadowTurn(world): readonly TacticalOrder[]`.

- [ ] **Step 1: Write failing AI tests**

Assert:
- planner returns at most 4 commands;
- planner does not mutate supplied world;
- every planned order belongs to `obsidian`;
- planner uses only legal tactical orders;
- planner is deterministic for identical world state;
- sovereign survival is preferred over lower-priority positional improvement in a crafted threat fixture.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/turn-ai.test.ts
```

- [ ] **Step 3: Implement minimal deterministic priority planner**

Exact signature:

```ts
export function planShadowTurn(
  world: WorldState,
): readonly TacticalOrder[];
```

Initial priorities:
1. sovereign survival,
2. immediate legal attacks,
3. node capture/defense,
4. tactical bonus opportunities,
5. recruitment if legal,
6. positional improvement.

No search tree or probabilistic behavior in this migration.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/sim/turn-ai.test.ts tests/sim/ai.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/ai.ts tests/sim/turn-ai.test.ts
git commit -m "feat: plan deterministic Shadow turns"
```

---

### Task 7: Reinforcement, Economy, Nodes, and Production Phase

**Files:**
- Modify: `src/sim/economy.ts`
- Modify: `src/sim/production.ts`
- Modify: `src/sim/nodes.ts`
- Modify: `src/sim/hero.ts`
- Modify: `src/sim/turns.ts`
- Modify: `src/sim/step.ts`
- Test: `tests/sim/reinforcement-phase.test.ts`

**Interfaces:**
- Consumes: world after Shadow resolution.
- Produces: `resolveReinforcementPhase(world): WorldState`.

- [ ] **Step 1: Write failing reinforcement-phase tests**

Assert:
- Crown/node income advances exactly once per round;
- production queue advances exactly once per round;
- recruit unlocks/caps/command capacity remain enforced;
- hero cooldown/respawn progression advances by round semantics;
- entering next Victoria command phase increments round and restores both Royal Command budgets to 4;
- no legacy five-second reinforcement pulse changes strategic state between command phases.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/reinforcement-phase.test.ts
```

- [ ] **Step 3: Implement explicit reinforcement phase**

Add:

```ts
export function resolveReinforcementPhase(
  world: WorldState,
): WorldState;
```

Retire `REINFORCEMENT_PULSE_TICKS` from strategic authority. If retained for animation/UI compatibility during migration, label and isolate it as presentation-only until removed.

- [ ] **Step 4: Verify GREEN and economy regressions**

```bash
npx vitest run \
  tests/sim/reinforcement-phase.test.ts \
  tests/sim/economy.test.ts \
  tests/sim/production.test.ts \
  tests/sim/nodes.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/economy.ts src/sim/production.ts src/sim/nodes.ts src/sim/hero.ts src/sim/turns.ts src/sim/step.ts tests/sim/reinforcement-phase.test.ts
git commit -m "feat: add round reinforcement phase"
```

---

### Task 8: Persistence and Replay of Turn State

**Files:**
- Modify: `src/client/persistence/save-game.ts`
- Modify: `src/sim/replay.ts`
- Test: `tests/client/turn-save-game.test.ts`
- Test: `tests/sim/turn-replay.test.ts`

**Interfaces:**
- Consumes: world including turn state and pending orders.
- Produces: deterministic save/restore and committed-order replay.

- [ ] **Step 1: Write failing persistence tests**

Assert a save during `victoria_command` round 3 restores:
- round 3;
- current phase;
- both Royal Command counters;
- exact pending order sequence and IDs;
- units/combat/economy/production/hero/territory unchanged.

Replay test must show:

```text
same starting world + same committed order sequence
= same resulting world + same outcomes
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/client/turn-save-game.test.ts tests/sim/turn-replay.test.ts
```

- [ ] **Step 3: Extend persistence and replay schemas**

Persist explicit turn/order fields. Add migration handling for existing saves that lack turn state by initializing `createInitialTurnState()` only for old schema versions.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/client/turn-save-game.test.ts tests/sim/turn-replay.test.ts tests/client/save-game.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/client/persistence/save-game.ts src/sim/replay.ts tests/client/turn-save-game.test.ts tests/sim/turn-replay.test.ts
git commit -m "feat: persist and replay tactical turns"
```

---

### Task 9: Turn-Aware HUD and Input

**Files:**
- Modify: `src/client/hud/model.ts`
- Modify: `src/client/hud/text-model.ts`
- Modify: `src/client/input/battlefield-input.ts`
- Modify: `src/client/runtime/command-bridge.ts`
- Modify: `src/client/phaser/battlefield-scene.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Test: `tests/client/hud-turn-model.test.ts`
- Test: `tests/client/phaser-turn-controls.test.ts`
- Test: `tests/client/turn-input.test.ts`

**Interfaces:**
- Consumes: turn state, pending orders, queue/cancel/commit APIs.
- Produces: phase-aware HUD, Royal Commands display, pending-order preview, End Turn / Commit flow.

- [ ] **Step 1: Write failing HUD/input tests**

HUD model must expose:

```ts
turn: {
  round: number;
  phase: TurnPhase;
  royalCommandsRemaining: number;
  royalCommandsMaximum: 4;
  pendingOrders: readonly TacticalOrder[];
}
```

Text model at initial world must include:
- `ROUND 1`
- `VICTORIA COMMAND`
- `ROYAL COMMANDS 4/4`

Input tests:
- selecting and targeting queues a preview/order instead of moving immediately;
- cancel removes pending order and restores budget;
- End Turn commits Victoria orders, transitions through Victoria resolution, then invokes Shadow planning/resolution;
- touch and mouse share the same command abstraction.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/client/hud-turn-model.test.ts tests/client/phaser-turn-controls.test.ts tests/client/turn-input.test.ts
```

- [ ] **Step 3: Implement turn-aware client flow**

Do not add visual polish beyond the GOD mockup requirements. Replace `WAVE` strategic text with round/phase/Royal Commands once reinforcement semantics are round-based.

- [ ] **Step 4: Verify GREEN plus HUD regressions**

```bash
npx vitest run \
  tests/client/hud-turn-model.test.ts \
  tests/client/phaser-turn-controls.test.ts \
  tests/client/turn-input.test.ts \
  tests/client/hud-live-model.test.ts \
  tests/client/hud-live-text.test.ts \
  tests/client/phaser-live-hud-text.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/client/hud/model.ts src/client/hud/text-model.ts src/client/input/battlefield-input.ts src/client/runtime/command-bridge.ts src/client/phaser/battlefield-scene.ts src/client/phaser/phaser-scene.ts tests/client/hud-turn-model.test.ts tests/client/phaser-turn-controls.test.ts tests/client/turn-input.test.ts
git commit -m "feat: add Royal Tactical command HUD"
```

---

### Task 10: GOD Composition, HUD Exclusion Band, and Faction Facing

**Files:**
- Modify: `src/client/render/responsive-battlefield.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Modify: `src/client/phaser/scene-rendering.ts`
- Test: `tests/client/battlefield-hud-exclusion.test.ts`
- Test: `tests/client/phaser-unit-facing.test.ts`
- Test: `tests/client/phaser-unit-footprint.test.ts`

**Interfaces:**
- Consumes: existing projection and render-unit faction.
- Produces: presentation-safe battlefield region and presentation-only faction facing.

- [ ] **Step 1: Write failing composition tests**

Assert:
- every projected playable cell center lies above the top edge of the bottom HUD exclusion region;
- unit sprite anchors for legal cells remain above the HUD deck;
- pointer-to-board mapping remains correct after exclusion-band projection;
- Victoria sprites have non-mirrored horizontal scale;
- Obsidian sprites have mirrored horizontal scale;
- mirroring does not change sprite position, selection anchor, projected cell, or simulation state;
- resize/orientation recalculation preserves these invariants.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/client/battlefield-hud-exclusion.test.ts tests/client/phaser-unit-facing.test.ts tests/client/phaser-unit-footprint.test.ts
```

- [ ] **Step 3: Implement render-only exclusion and facing**

Extend responsive layout with an explicit presentation-safe battlefield rectangle derived from the HUD band. Derive projection from that safe rectangle while keeping the logical 16×16 board unchanged.

Apply horizontal mirror only at sprite presentation:

```ts
victoria => positive X scale
obsidian => negative X scale
```

Preserve vertical scale/origin and unit visual footprint.

- [ ] **Step 4: Verify GREEN plus responsive regressions**

```bash
npx vitest run \
  tests/client/battlefield-hud-exclusion.test.ts \
  tests/client/phaser-unit-facing.test.ts \
  tests/client/phaser-unit-footprint.test.ts \
  tests/client/responsive-battlefield.test.ts \
  tests/client/responsive-battlefield-hud-bands.test.ts \
  tests/client/landscape-gameplay-layout.test.ts \
  tests/client/phaser-resize-hud.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/client/render/responsive-battlefield.ts src/client/phaser/phaser-scene.ts src/client/phaser/scene-rendering.ts tests/client/battlefield-hud-exclusion.test.ts tests/client/phaser-unit-facing.test.ts tests/client/phaser-unit-footprint.test.ts
git commit -m "feat: match GOD battlefield composition"
```

---

### Task 11: Geometry-Derived Tactical Chess Bonuses

**Files:**
- Create: `src/sim/tactical-bonuses.ts`
- Modify: `src/sim/resolve-orders.ts`
- Modify: `src/sim/economy.ts`
- Test: `tests/sim/tactical-bonuses.test.ts`

**Interfaces:**
- Consumes: authoritative world geometry after order resolution.
- Produces: pure detection functions and explicit bonus events.

- [ ] **Step 1: Write failing tactical-geometry tests**

Define and test pure detectors:

```ts
export function detectKnightFork(
  world: WorldState,
  unitId: string,
): TacticalBonus | null;

export function detectOpenFile(
  world: WorldState,
  unitId: string,
): TacticalBonus | null;

export function detectRoyalAlignment(
  world: WorldState,
  faction: Faction,
): readonly TacticalBonus[];

export function detectSovereignLine(
  world: WorldState,
  faction: Faction,
): readonly TacticalBonus[];
```

Fixtures must prove:
- geometry creates bonus;
- one blocking piece removes Open File;
- moving one target removes Knight Fork;
- renderer state is irrelevant;
- same world yields same bonuses.

Do not assign large balance rewards yet. Use explicit minimal bonus events first.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/tactical-bonuses.test.ts
```

- [ ] **Step 3: Implement pure geometry-derived detectors**

Integrate detection after relevant resolution boundaries. Any Crown reward must be explicit and covered by tests.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run tests/sim/tactical-bonuses.test.ts tests/sim/resolve-orders.test.ts tests/sim/economy.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/tactical-bonuses.ts src/sim/resolve-orders.ts src/sim/economy.ts tests/sim/tactical-bonuses.test.ts
git commit -m "feat: add chess-derived tactical bonuses"
```

---

### Task 12: Remove Real-Time Strategic Authority and Run the Full Gauntlet

**Files:**
- Modify: `src/sim/step.ts`
- Modify: `src/client/runtime/fixed-tick-runtime.ts`
- Modify: legacy tests that specifically encode obsolete strategic ticking
- Create: `tests/sim/royal-tactical-round-gauntlet.test.ts`

**Interfaces:**
- Consumes: Tasks 1–11.
- Produces: one complete deterministic round and a runtime in which fixed ticks are presentation-only.

- [ ] **Step 1: Write the full-round failing gauntlet**

One scenario must prove:

1. Victoria starts Round 1 with 4 Royal Commands.
2. Four Victoria orders can be queued without moving units immediately.
3. A fifth is refused.
4. Commit resolves in sequence.
5. Shadow planner produces legal bounded orders.
6. Shadow resolution uses the same resolver.
7. Reinforcement phase advances economy/production/hero state once.
8. Round becomes 2 and Royal Commands reset to 4/4.
9. Replaying the same start + committed orders yields identical world/outcomes.
10. No fixed-tick call between command phases changes strategic board/economy/production state.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/sim/royal-tactical-round-gauntlet.test.ts
```

- [ ] **Step 3: Remove remaining strategic tick authority**

`fixed-tick-runtime.ts` may drive animation/interpolation/UI time only. `src/sim/step.ts` must no longer progress strategic movement, attacks, economy, AI, production, hero cooldowns, or victory simply because wall-clock ticks passed.

Migrate legacy tests that asserted obsolete real-time strategic behavior to the new round APIs. Do not delete unrelated regression coverage.

- [ ] **Step 4: Run focused and full verification**

```bash
npx vitest run tests/sim/royal-tactical-round-gauntlet.test.ts
npm test
npm run typecheck
npm run build
```

Expected:
- gauntlet PASS;
- full Vitest suite PASS;
- TypeScript PASS;
- Vite production build PASS;
- existing Phaser chunk-size warning is acceptable if unchanged.

- [ ] **Step 5: Manual visual acceptance at 100% browser zoom**

Verify in landscape:

- Victoria army faces right.
- Shadow army faces left.
- units do not pass behind the bottom command deck;
- top HUD shows round, phase, Crown, nodes, Command Capacity, Royal Commands;
- pending orders are visible/revisable;
- End Turn commits the sequence;
- resolved movement/attacks animate from authoritative results;
- no strategic action occurs while the player simply waits.

- [ ] **Step 6: Commit**

```bash
git add src/sim/step.ts src/client/runtime/fixed-tick-runtime.ts tests
git commit -m "feat: complete Royal Tactical Strategy migration"
```

---

## Final Branch Verification

After all 12 tasks:

```bash
git status --short
git log --oneline --decorate -15
npm test
npm run typecheck
npm run build
```

Then inspect the branch diff against the pre-migration anchor:

```bash
git diff --stat 10c2ff6..HEAD
git diff --check 10c2ff6..HEAD
```

Required completion evidence:

- all tests pass;
- typecheck passes;
- build passes;
- `git diff --check` is clean;
- no uncommitted migration work remains;
- manual 100% landscape acceptance matches the GOD composition;
- fixed ticks no longer carry strategic authority.
