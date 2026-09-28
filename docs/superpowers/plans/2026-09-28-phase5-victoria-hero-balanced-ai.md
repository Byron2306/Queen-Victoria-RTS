# Phase 5 Victoria Hero + Balanced AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic persistent hero mechanics for Queen Victoria and a fair balanced AI commander that uses the same simulation rules as the player, without changing verified Phase 0-4 behavior when hero/AI features are disabled.

**Architecture:** Add focused `hero.ts`, `abilities.ts`, and `ai.ts` simulation layers around the existing combat/economy/production spine. Combat remains authoritative for damage and kills; hero layers interpret those receipts and derive temporary combat modifiers, while the AI reads only authoritative world state and schedules ordinary legal commands one tick ahead. `step.ts` remains the orchestrator and replay snapshots normalize all Phase 5 state.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, existing deterministic fixed-tick simulation.

**Spec:** `docs/superpowers/specs/2026-09-28-phase5-victoria-hero-balanced-ai-design.md`

## Global Constraints

- Phase 2 remains authoritative for simultaneous combat, damage, kills, Guard, cooldowns, and positional combat provenance.
- Phase 3 remains authoritative for King defeat, sovereign outcome, terminal freezing, and threat truth.
- Phase 4 remains authoritative for nodes, Crown Power, recruitment, reinforcement pulses, Command Capacity, piece caps, promotion, and economy receipts.
- Generic worlds with no hero binding and no AI enablement must preserve Phase 0-4 behavior.
- A bound hero is an ordinary `queen` unit while alive; death removes the unit/combat record but not hero metadata.
- Hero XP uses nearby combat deaths only, Chebyshev radius 5, values Pawn 10, Knight/Bishop 18, Rook 28, Queen 40, King 0.
- Level thresholds are total XP 40, 100, 180, 280 for Levels 2-5.
- Hero abilities spend no Crown Power and only one timed hero ability may be active at once.
- Royal Decree: 40 ticks, cooldown 120, radius 4, +15% allied damage, +1 Guard acquisition/leash; Level 4 radius 5 and +20% damage.
- Hold the Crown: 30 ticks, cooldown 140, radius 4, hero -50% incoming damage, allies -20% (-25% Level 4+), +2 Guard leash, hero movement locked.
- Sovereign Line: 50 ticks, cooldown 160, requires two other aligned allies within 5; +1 attack range and +10% damage (+15% Level 4+).
- Imperial Gambit: Level 5 only, 35 ticks, cooldown 300, radius 5, +30% allied damage, attack reload `max(1, floor(base * .75))`, hero receives +30% incoming damage.
- Newly activated ability counters and newly created respawn counters are not decremented on their creation tick.
- Hero respawn timer is exactly 120 ticks; blocked respawn enters `ready_to_respawn` and retries deterministically.
- Balanced AI evaluates every 10 ticks, selects at most 3 intentions and schedules at most 6 concrete commands per evaluation.
- AI commitments last 30 ticks unless invalidated or sovereign defence takes priority at the next evaluation.
- AI-generated commands execute no earlier than the next simulation tick and use the same validators as external commands.
- No AI cheating, randomness, minimax/MCTS, difficulty bonuses, Phase 6 rendering/input work, or personality overlays in Phase 5.

## Review Focus

1. **Creation-tick counters:** newly activated abilities and newly defeated heroes must retain exact full counters until the following tick; pin in Tasks 3 and 5.
2. **Simultaneous hero/combat outcomes:** a hero dying in the same resolution as nearby enemies may receive XP, but King terminal outcome must still short-circuit Phase 5 lifecycle; pin in Tasks 2 and 8.
3. **Derived modifier leakage:** expired/dead hero effects must not permanently alter combat profiles, Guard ranges, or future cooldown reloads; pin in Task 4.
4. **AI temporal fairness:** evaluation on tick T may only schedule commands for T+1, and object insertion order must not change selected schedules; pin in Tasks 6-8 and 10.
5. **Blocked respawn and replay custody:** `ready_to_respawn`, pending AI commands, commitments, cooldowns, and active durations must survive repeated blocked ticks and canonical replay byte-identically; pin in Tasks 5 and 9.

---

### Task 1: Authoritative hero and AI world state

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/commands.ts`
- Modify: `src/sim/index.ts`
- Create: `src/sim/hero.ts`
- Create: `src/sim/ai.ts`
- Create: `tests/sim/phase5-state.test.ts`

**Interfaces:**
- Consumes: existing `Faction`, `UnitState`, `WorldState`, `SimCommand`, Phase 4 reinforcement anchors.
- Produces: `HeroStatus`, `HeroAbilityId`, `HeroAbilityState`, `HeroState`, `StrategicIntention`, `StrategicCommitment`, `AICommanderState`, `WorldOptions`, `createInitialHeroState(units, heroIds)`, `createInitialAIState(aiFactions)`, and optional `createWorld(units, options)` construction.

- [ ] **Step 1: Write failing construction tests**

Add `tests/sim/phase5-state.test.ts` covering:
- `createWorld(units)` produces two inert `unbound` heroes and two disabled AI commanders;
- explicit `heroIds` bind only matching same-faction `queen` units and initialize Level 1, XP 0, cooldowns 0;
- `aiFactions: ['obsidian']` enables only Obsidian with profile `balanced`, empty commitments/pending commands, deterministic ordinal 1;
- an ordinary unbound queen remains an ordinary Phase 2-4 queen.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/phase5-state.test.ts`
Expected: FAIL because Phase 5 state/options do not exist.

- [ ] **Step 3: Add typed state and construction helpers**

Add the spec types to `types.ts`. Use `heroUnitId: string | null`, status union `unbound | alive | respawning | ready_to_respawn`, all four named ability slots, and AI state for both factions. `WorldState` gains `heroes` and `ai`. `createWorld` gains optional `WorldOptions` while preserving all old callers.

Invalid hero IDs must resolve to unbound rather than auto-discovering another queen; Phase 5 binding is explicit.

- [ ] **Step 4: Extend command ordering surface without changing behavior**

Add `HeroAbilityCommand` to the exported command model and teach `compareSimCommands` a deterministic actor key (`heroId`) while preserving ordering of existing command variants. AI state may store `readonly SimCommand[]` after the command union is widened.

- [ ] **Step 5: Verify focused tests, old construction tests, and typecheck**

Run: `npm test -- tests/sim/phase5-state.test.ts tests/sim/kernel.test.ts tests/sim/phase4-state.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim tests/sim/phase5-state.test.ts
git commit -m "phase5: add authoritative hero and AI state"
```

### Task 2: Hero defeat, XP, and deterministic leveling

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/hero.ts`
- Create: `tests/sim/hero-progression.test.ts`

**Interfaces:**
- Consumes: pre-combat world, post-combat world, Phase 2 `unit.killed` events, bound hero state.
- Produces: `interpretHeroCombat(beforeCombat, afterCombat, combatEvents): { state: WorldState; events: readonly SimEvent[] }`, `heroLevelForXp(xp)`, and hero progression events.

- [ ] **Step 1: Write failing progression tests**

Cover acceptance cases 5-12 and 40-46 that belong to combat interpretation:
- exact XP values at radius <=5 and none at >5;
- no King XP and no last-hit requirement;
- same-resolution XP when the hero also dies;
- thresholds 40/100/180/280 with no heal/cooldown reset;
- multiple crossed levels emit one `hero.leveled` event per crossed level in ascending order;
- ordinary combat kill events precede `hero.defeated` when integrated later;
- defeat sets status `respawning`, timer 120, clears active ability, preserves XP/level/cooldowns;
- unbound queens never get hero lifecycle semantics.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/hero-progression.test.ts`
Expected: FAIL because hero combat interpretation/events do not exist.

- [ ] **Step 3: Implement progression and defeat interpretation**

Use killed unit positions from the pre-combat world. Iterate qualifying killed events deterministically in their combat-event order; evaluate factions in fixed order `victoria`, then `obsidian`. A defeated hero remains eligible for same-resolution XP if it was alive in `beforeCombat`.

Add exact events:
`hero.xp_gained`, `hero.leveled`, `hero.defeated`.

Do not create a second Crown bounty. Do not process hero defeat if the caller has already determined the match terminal.

- [ ] **Step 4: Verify focused test + combat/economy regressions**

Run: `npm test -- tests/sim/hero-progression.test.ts tests/sim/combat-resolution.test.ts tests/sim/economy.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/hero.ts tests/sim/hero-progression.test.ts
git commit -m "phase5: add hero defeat XP and leveling"
```

### Task 3: Ability legality, activation, counters, and expiry

**Files:**
- Modify: `src/sim/types.ts`
- Create: `src/sim/abilities.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/hero-abilities.test.ts`

**Interfaces:**
- Consumes: `HeroAbilityCommand`, bound `HeroState`, unit positions, current level.
- Produces: `activateHeroAbility(world, command): { state; events }`, `advanceHeroAbilityLifecycle(world, skipDecrementFactions?): { state; events }`, `qualifiesForSovereignLine(world, faction)`, and ability activation/rejection/expiry events.

- [ ] **Step 1: Write failing legality/lifecycle tests**

Cover acceptance 13-18 plus exact duration/cooldown creation:
- locked level, cooldown, dead/unbound/wrong hero, active-ability rejection;
- Sovereign Line requires at least two other friendly living units aligned by rank/file/diagonal within 5;
- activation writes exact full duration/cooldown and does not decrement either on creation tick;
- natural expiry emits exactly one `hero.ability.expired` and clears `activeAbility`;
- dead hero cannot activate; defeat cancellation does not emit expiry.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/hero-abilities.test.ts`
Expected: FAIL because ability activation/lifecycle helpers do not exist.

- [ ] **Step 3: Implement ability tables and activation**

Keep one canonical immutable config keyed by ability with unlock level, duration, cooldown, and level-dependent values. Activation only mutates hero state, never combat profiles or Crown Power.

Add exact events `hero.ability.activated`, `hero.ability.rejected`, `hero.ability.expired`.

- [ ] **Step 4: Implement counter advancement with creation-tick protection**

`advanceHeroAbilityLifecycle` decrements existing cooldown/active counters exactly once per active simulation tick, can skip newly activated factions for that tick, and expires at the deterministic zero transition.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/hero-abilities.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/types.ts src/sim/abilities.ts src/sim/index.ts tests/sim/hero-abilities.test.ts
git commit -m "phase5: add deterministic hero ability lifecycle"
```

### Task 4: Derived hero combat and Guard effects

**Files:**
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/guard.ts`
- Modify: `src/sim/step.ts`
- Modify: `src/sim/abilities.ts`
- Create: `tests/sim/hero-combat-effects.test.ts`

**Interfaces:**
- Consumes: active hero state and geometry from Task 3.
- Produces: pure helpers `outgoingHeroDamageBps(world, attackerId)`, `incomingHeroDamageBps(world, defenderId)`, `effectiveAttackRange(world, attackerId)`, `effectiveGuardRanges(world, unitId)`, and `effectiveCooldownReload(world, attackerId)` used by combat/Guard.

- [ ] **Step 1: Write failing combat-effect tests**

Cover acceptance 19-39:
- Royal Decree exact radius/damage and Level 4 improvement, including self-aura and +1 acquisition/leash;
- Hold movement lock, hero -50% incoming, allies -20/-25%, +2 leash, minimum damage 1;
- Sovereign Line rank/file/diagonal dynamic membership, +1 range, +10/+15% damage;
- Imperial Gambit +30% outgoing, 25% shorter new reload, no retroactive cooldown shrink, hero +30% incoming;
- modifier order is base -> positional -> outgoing hero -> incoming defender normalization;
- expiry/death returns all derived values to base behavior without profile mutation.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/hero-combat-effects.test.ts`
Expected: FAIL because combat/Guard do not consult Phase 5 effects.

- [ ] **Step 3: Implement pure derived-effect helpers**

Use integer basis points. Outgoing and incoming helpers must derive from current unit positions and active hero state on every combat evaluation. Sovereign Line membership is dynamic. Do not cache modifiers into `UnitCombatState` or mutate `UNIT_COMBAT_PROFILES`.

- [ ] **Step 4: Wire combat/Guard to effective values**

`canUnitAttackTarget` uses effective range. `resolveCombatTick` applies fixed modifier order and loads effective cooldown only for attacks fired during Gambit. Guard target acquisition/leash uses derived effective ranges. Existing positional tags/provenance remain unchanged.

Add `hero_anchored` to move rejection semantics and reject bound hero movement while Hold the Crown is active; attack orders remain legal.

- [ ] **Step 5: Verify focused + Phase 2 regression**

Run: `npm test -- tests/sim/hero-combat-effects.test.ts tests/sim/combat-resolution.test.ts tests/sim/guard.test.ts tests/sim/position.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim tests/sim/hero-combat-effects.test.ts
git commit -m "phase5: derive hero combat and Guard effects"
```

### Task 5: Respawn lifecycle and deterministic return

**Files:**
- Modify: `src/sim/hero.ts`
- Modify: `src/sim/abilities.ts`
- Modify: `src/sim/production.ts` only to expose/reuse the deterministic spawn finder if needed
- Create: `tests/sim/hero-respawn.test.ts`

**Interfaces:**
- Consumes: hero defeat state, Phase 4 `findReinforcementSpawn`, queen base combat profile.
- Produces: `advanceHeroRespawn(world, skipDecrementFactions?): { state; events }`, `attemptHeroRespawns(world): { state; events }`, `hero.respawn.ready`, `hero.respawned`.

- [ ] **Step 1: Write failing respawn tests**

Cover acceptance 43-50 and Review Focus creation-tick semantics:
- freshly defeated hero remains at 120 on death tick, then counts down once per later active tick;
- cooldowns continue while respawning/ready;
- successful respawn uses same ID, kind queen, full 180 HP, target null, Guard anchor at spawn, preserved XP/level/cooldowns;
- blocked spawn transitions once to `ready_to_respawn`, emits one ready event, retries without duplicate ready receipts, then emits one respawn event when space opens;
- Imperial Gambit death still uses 120 ticks.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/hero-respawn.test.ts`
Expected: FAIL because respawn lifecycle/receipts do not exist.

- [ ] **Step 3: Implement countdown and ready transition**

Fixed faction order. Timer decrement and ability cooldown decrement remain separate responsibilities, but the step orchestrator can call them in one lifecycle stage. Use a skip set for factions defeated on the current tick.

- [ ] **Step 4: Reuse deterministic Phase 4 spawn policy for respawn**

Do not duplicate ring-search ordering. Respawn must use the faction reinforcement anchor and cannot displace occupancy or node-center exclusions already enforced by the shared finder.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/hero-respawn.test.ts tests/sim/reinforcements.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim tests/sim/hero-respawn.test.ts
git commit -m "phase5: add exact hero respawn lifecycle"
```

### Task 6: Balanced AI cadence, utilities, and commitments

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/ai.ts`
- Create: `tests/sim/ai-strategy.test.ts`

**Interfaces:**
- Consumes: public `WorldState`, sovereign threat, node/economy/production/hero state.
- Produces: `evaluateBalancedAI(world, faction): { state; events }`, `scoreStrategicIntentions(world, faction)`, deterministic `StrategicCommitment[]`, and AI observability events.

- [ ] **Step 1: Write failing strategy tests**

Cover acceptance 51-64 strategy/cadence portions:
- disabled by default and no evaluation when disabled;
- evaluates only at exact 10-tick cadence;
- selects no more than 3 intentions;
- commitment `expiresTick` preserves valid objective for 30 ticks across later cadence evaluations;
- invalid objective can be replaced at next cadence;
- threatened King forces `defend_king` first at next cadence but never out-of-cadence;
- deterministic scenarios select `capture_node`, `reinforce_front`, `pressure_position`, and `attack_king` when their documented public conditions dominate;
- strategic ties stable under reversed object insertion order.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/ai-strategy.test.ts`
Expected: FAIL because balanced evaluator/commitments do not exist.

- [ ] **Step 3: Implement explicit utility channels**

Represent shared channels `kingSafety`, `nodeControl`, `formationValue`, `mobilityPressure`, `materialRisk`, `attackOpportunity`, `heroThreat` with deterministic integer scores. Keep profile weights in a `balanced` profile table rather than scattering constants through branches so Phase 7 can later add persona overlays.

- [ ] **Step 4: Implement commitment lifecycle and receipts**

Intentions are chosen from exactly `defend_king | capture_node | reinforce_front | pressure_position | attack_king`, with deterministic objective IDs/tie breaks. Emit `ai.evaluated`, `ai.commitment.started`, and `ai.commitment.ended` only for actual transitions.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/ai-strategy.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/types.ts src/sim/ai.ts tests/sim/ai-strategy.test.ts
git commit -m "phase5: add balanced AI strategic commitments"
```

### Task 7: AI tactical command generation and hero heuristics

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: `src/sim/commands.ts`
- Create: `tests/sim/ai-tactics.test.ts`

**Interfaces:**
- Consumes: commitments from Task 6, existing legal movement/attack/recruit/promote/ability surfaces.
- Produces: `commandsForCommitments(world, faction, commitments): readonly SimCommand[]` and pending commands capped at 6 per evaluation.

- [ ] **Step 1: Write failing tactical tests**

Cover acceptance 54-70:
- command budget max 6 and intention budget shared with hero ability use;
- deterministic target priority King opportunity -> enemy hero -> Rook -> Bishop/Knight -> Pawn, then lower HP, shorter distance, ID;
- legal movement improves objective progress and uses deterministic coordinate/unit-ID ties;
- balanced recruitment uses ordinary Crown/unlock/capacity/cap/queue truth and avoids blindly repeating a full role;
- promotion chooses only legal target kinds with deterministic contextual preference;
- Royal Decree requires >=2 useful nearby allies, Hold can defend threatened sovereign/important node, Sovereign Line requires already-valid formation, Gambit requires favourable local pressure plus meaningful sovereign/territorial opportunity;
- generated commands are ordinary `SimCommand` values, not privileged AI actions.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/ai-tactics.test.ts`
Expected: FAIL because tactical generation does not exist.

- [ ] **Step 3: Implement deterministic tactical generation**

Use only current public world state and existing geometry/economy helpers. Do not simulate future combat. Assign deterministic AI command sequences from `nextCommandOrdinal` and update that ordinal only for commands actually scheduled.

- [ ] **Step 4: Emit scheduling receipts**

Add `ai.command.scheduled` with `executeTick = world.tick + 1`, actor ID, and command type. Store pending commands in canonical command order.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/sim/ai-tactics.test.ts tests/sim/production-queue.test.ts tests/sim/promotion.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim tests/sim/ai-tactics.test.ts
git commit -m "phase5: generate fair balanced AI commands"
```

### Task 8: Integrate full Phase 5 tick transaction

**Files:**
- Modify: `src/sim/step.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/commands.ts`
- Modify: `src/sim/hero.ts`
- Modify: `src/sim/ai.ts`
- Create: `tests/sim/phase5-ordering.test.ts`

**Interfaces:**
- Consumes: all Task 1-7 helpers.
- Produces: Phase 5 authoritative `stepWorld` order and one-tick-delayed AI execution.

- [ ] **Step 1: Write failing ordering tests**

Pin exact transaction consequences:
- prior-tick AI commands merge with external commands before Guard/combat but AI commands generated this tick do not execute until next tick;
- combat and sovereign outcome precede hero defeat/XP;
- King terminal outcome stops hero defeat scheduling, economy, lifecycle, respawn, and AI evaluation after the decisive gate;
- hero ability command on tick T cannot affect combat until T+1;
- ability activations process before ordinary commands, and Hold rejects same-tick hero movement after activation;
- node/economy/production/promotion remain in verified Phase 4 order;
- lifecycle runs after promotions, respawn before AI evaluation, AI evaluation before sovereign threat;
- hero respawn cannot attack on its respawn tick;
- both hero defeats resolve fixed faction order when match stays active;
- terminal world freezes hero counters and AI state and deterministically rejects hero ability commands with `match_ended`.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/phase5-ordering.test.ts`
Expected: FAIL because Phase 5 helpers are not yet orchestrated by `stepWorld`.

- [ ] **Step 3: Refactor command partitioning for Phase 5**

At step start, consume pending AI commands whose scheduled tick is current, clear them from AI state, merge them with external commands, and sort once via `compareSimCommands`. Partition hero ability commands before ordinary move/attack/recruit/promote handling without changing existing command validators.

- [ ] **Step 4: Implement the exact 21-stage spec order**

Use the spec sequence literally. Track factions that activated an ability or were defeated this tick so newly created counters are not immediately decremented. AI evaluation stores only next-tick commands.

- [ ] **Step 5: Verify Phase 5 ordering + Phase 3/4 regression**

Run: `npm test -- tests/sim/phase5-ordering.test.ts tests/sim/phase4-ordering.test.ts tests/sim/sovereign-outcome.test.ts tests/sim/terminal-match.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim tests/sim/phase5-ordering.test.ts
git commit -m "phase5: integrate hero and AI tick transaction"
```

### Task 9: Replay normalization for heroes and AI

**Files:**
- Modify: `src/sim/replay.ts`
- Create: `tests/sim/phase5-replay.test.ts`

**Interfaces:**
- Consumes: Phase 5 `WorldState.heroes`, `WorldState.ai`, pending commands/events.
- Produces: canonical snapshots normalized for all Phase 5 deterministic truth.

- [ ] **Step 1: Write failing replay tests**

Run equivalent histories through:
- ability activation/effect/expiry;
- hero death, cooldown countdown, blocked ready state, and respawn;
- AI cadence, commitment, command scheduling, and next-tick execution;
- simultaneous hero outcomes and reversed object insertion.

Assert byte-identical `canonicalSnapshot()` and identical `eventsByTick`. Also assert snapshot explicitly contains complete hero ability counters and AI commitments/pending commands/ordinal.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/sim/phase5-replay.test.ts`
Expected: FAIL because canonical snapshots omit Phase 5 state.

- [ ] **Step 3: Normalize hero and AI state**

Serialize factions in fixed order, ability IDs in fixed canonical order, commitments in semantic deterministic order, and pending commands using `compareSimCommands`. Do not serialize renderer, wall-clock, hidden reasoning, or transient candidate scores.

- [ ] **Step 4: Verify replay regressions**

Run: `npm test -- tests/sim/phase5-replay.test.ts tests/sim/phase4-replay.test.ts tests/sim/phase3-replay.test.ts tests/sim/phase2-replay.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/replay.ts tests/sim/phase5-replay.test.ts
git commit -m "phase5: preserve hero and AI replay truth"
```

### Task 10: Determinism and fairness murder chamber

**Files:**
- Create: `tests/sim/phase5-determinism.test.ts`
- Modify: implementation files only if a demonstrated determinism/fairness defect requires the smallest fix.

**Interfaces:**
- Consumes: complete Phase 5 implementation.
- Produces: adversarial evidence for Review Focus and acceptance 55-58, 71-74, 77-78.

- [ ] **Step 1: Add adversarial determinism tests**

Cover:
- reversed insertion of units/nodes/combat records produces identical AI schedules and events;
- two heroes dying simultaneously yields identical defeat/XP order under reversed insertion;
- AI has identical Crown costs, pulse cadence, capacity, cooldowns, and validators to equivalent externally issued commands;
- pending AI command can become illegal before execution and is rejected by the ordinary validator rather than force-executed;
- commitment objective invalidation changes only at the next cadence;
- no AI evaluation or counter mutation in terminal worlds;
- repeated blocked respawn remains byte-stable apart from the intended timer/status transitions.

- [ ] **Step 2: Run focused murder chamber**

Run: `npm test -- tests/sim/phase5-determinism.test.ts`
Expected: PASS if earlier tasks are exact; otherwise RED must identify a concrete determinism/fairness defect.

- [ ] **Step 3: If RED, use systematic debugging and apply only root-cause fixes**

Do not relax tests or introduce random tie breaking. Any implementation change gets an additional narrow regression assertion in this file.

- [ ] **Step 4: Run full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all Phase 0-5 tests PASS with zero failures and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/sim tests/sim/phase5-determinism.test.ts
git commit -m "phase5: harden AI and hero determinism"
```

### Task 11: Acceptance receipt and authoritative verification gate

**Files:**
- Create: `docs/PHASE5_VICTORIA_HERO_BALANCED_AI_ACCEPTANCE.md`

**Interfaces:**
- Consumes: the complete test suite and the 78-case acceptance matrix in the spec.
- Produces: durable verification receipt mapping every acceptance case to executable evidence.

- [ ] **Step 1: Audit all 78 acceptance cases against named tests**

Create a table mapping each numbered case to test file/test name. Any unmapped case is a test gap, not a documentation exception: add the missing executable test before continuing.

- [ ] **Step 2: Run fresh full verification**

Run:
```bash
npm test
npm run typecheck
git diff --check
```
Expected: zero test failures, clean typecheck, no whitespace errors.

- [ ] **Step 3: Record container evidence honestly**

The receipt records exact branch/head, test file count, test count, duration if available, and environment. If the container cannot install/run Vitest, record only the checks actually executed and mark Termux/Vitest authoritative verification pending.

- [ ] **Step 4: Commit acceptance receipt**

```bash
git add docs/PHASE5_VICTORIA_HERO_BALANCED_AI_ACCEPTANCE.md tests src
git commit -m "docs: record Phase 5 hero and AI acceptance"
```

- [ ] **Step 5: Authoritative Termux/Vitest gate**

On the exact final tree run:
```bash
npm install
npm test
npm run typecheck
```
Expected: full Phase 0-5 suite green and clean typecheck. Update the acceptance receipt with the observed authoritative counts before declaring Phase 5 VERIFIED.

## Execution notes

- Keep commits task-scoped and preserve a green branch after each completed task.
- If widening `SimCommand` creates temporary exhaustiveness breakage before `stepWorld` understands the new command type, widen the orchestrator in the same task rather than leaving an uncompilable intermediate commit.
- Do not add visual/UI concerns to make hero state easier to inspect; Phase 6 owns presentation.
- Do not implement any of the four archetype weight profiles. The balanced weight table only needs to be structurally ready for later overlays.
