# Phase 2 Real-Time Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic real-time combat layer over the verified chess-geometry kernel: health, attack cadence/range, explicit attack orders, simultaneous damage/death, Guard acquisition with chase leash, and positional attack bonuses.

**Architecture:** Keep combat renderer-independent and fixed-tick. `WorldState` gains a separate combat-state registry keyed by unit id, preserving geometry/entity identity; `combat.ts` owns stat profiles and simultaneous attack resolution; `guard.ts` owns deterministic target acquisition/leash policy; `position.ts` classifies chess-position bonuses using Phase 1 threat projection. `stepWorld` remains the single authoritative transaction boundary and advances exactly one tick.

**Tech Stack:** TypeScript, Vitest, existing deterministic simulation kernel.

**Spec:** `docs/superpowers/specs/2026-09-27-queen-victoria-real-time-chess-rts-design.md`

## Global Constraints

- Board remains exactly 16×16 with a 100 ms fixed simulation tick.
- Rendering never determines combat legality, targeting, damage or death.
- Equivalent initial state plus equivalent ordered commands must produce byte-equivalent state/events.
- Guard is the default stance.
- Units have health, attack cadence, attack range, acquisition range and chase leash.
- Guard may acquire nearby enemies but must not retain targets beyond its leash from the unit's guard anchor.
- Damage for a tick is resolved simultaneously from a pre-damage snapshot so command/unit iteration order cannot decide whether an otherwise-ready attacker gets to fire.
- Death removes the unit from occupancy and combat state atomically.
- Existing movement geometry, blocker semantics and threat maps remain authoritative.
- Phase 2 does not add Crown economy, nodes, production, reinforcement, sovereign victory, hero abilities, AI strategy or Phaser rendering.

## Initial deterministic tuning anchors

These values are deliberately data-like and may be rebalanced later without changing combat architecture.

| Kind | HP | Damage | Cooldown ticks | Range | Acquisition | Leash |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pawn | 60 | 8 | 10 | 1 | 3 | 4 |
| Knight | 90 | 14 | 12 | 1 | 4 | 5 |
| Bishop | 70 | 12 | 15 | 4 | 5 | 5 |
| Rook | 130 | 18 | 18 | 5 | 5 | 4 |
| Queen | 180 | 16 | 10 | 4 | 6 | 6 |
| King | 300 | 10 | 20 | 2 | 4 | 0 |

Positional attacks receive an initial **+25% damage** multiplier (12500 basis points) when a named positional condition is active. Damage is integer and rounded down after multiplier application.

## Review Focus

1. Two units lethal to each other on the same ready tick must both fire before deaths are applied.
2. A dead unit must disappear from `units`, `occupancy` and `combat`, and cannot be reacquired later.
3. Guard target choice must be deterministic under equal distance and independent of insertion order.
4. Friendly, missing and already-dead targets must never become valid attack targets.
5. Positional bonuses must derive from board state only and must not mutate geometry/threat state.

---

### Task 1: Combat state and profiles

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/replay.ts`
- Create: `src/sim/combat.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/combat-state.test.ts`

**Interfaces:**
- Produces `CombatProfile`, `UnitCombatState`, `UNIT_COMBAT_PROFILES`, `combatStateFor(unit)`, and `WorldState.combat`.

- [ ] Write tests proving all six unit kinds receive the exact profile values above and default combat state `{ health: maxHealth, cooldownTicks: 0, targetId: null, stance: 'guard', guardAnchor: spawnPosition }`.
- [ ] Prove `createWorld` initializes combat state without changing geometry occupancy and canonical snapshots include combat state deterministically.
- [ ] Verify RED because the combat registry/API does not exist.
- [ ] Implement the minimal combat profile/state layer.
- [ ] Run full tests and typecheck.

### Task 2: Explicit attack orders and deterministic validation

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/step.ts`
- Create: `tests/sim/attack-orders.test.ts`

**Interfaces:**
- Produces `AttackCommand` and attack-order events/rejection reasons.

- [ ] Write tests for accepting an enemy target and rejecting missing, self, friendly and already-dead targets.
- [ ] Prove accepted attack orders only set `targetId`; they do not apply immediate damage in command-resolution order.
- [ ] Verify RED.
- [ ] Implement attack command validation while preserving global `(sequence, unitId)` ordering.
- [ ] Run full tests and typecheck.

### Task 3: Simultaneous attack cadence, damage and death

**Files:**
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/step.ts`
- Create: `tests/sim/combat-resolution.test.ts`

**Interfaces:**
- Produces `resolveCombatTick(world)` returning state plus `attack.fired`, `unit.damaged`, and `unit.killed` events.

- [ ] Write tests for range gating, cooldown decrement/reload, simultaneous mutual kills, focus fire aggregation, and atomic occupancy removal on death.
- [ ] Verify RED.
- [ ] Implement combat intents from a pre-damage snapshot, aggregate damage by target, then apply damage/deaths deterministically.
- [ ] Use Chebyshev grid distance for ordinary RTS attack range in Phase 2; chess alignment is handled separately by positional bonuses.
- [ ] Run full tests and typecheck.

### Task 4: Guard acquisition and chase leash

**Files:**
- Create: `src/sim/guard.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/guard.test.ts`

**Interfaces:**
- Produces `acquireGuardTarget(world, unitId)` and `refreshGuardTargets(world)`.

- [ ] Write tests proving Guard acquires the nearest living enemy within acquisition range, breaks equal-distance ties by enemy id, ignores friendlies/dead units, and clears a retained target once it lies beyond leash distance from `guardAnchor`.
- [ ] Verify RED.
- [ ] Implement deterministic acquisition/leash policy without autonomous movement yet.
- [ ] Run full tests and typecheck.

### Task 5: Positional attack bonus engine

**Files:**
- Create: `src/sim/position.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/index.ts`
- Create: `tests/sim/position.test.ts`

**Interfaces:**
- Produces `evaluatePositionalAttack(world, attackerId, targetId)` returning `{ multiplierBps, tags }`.

- [ ] Write tests for four deterministic named conditions: `pawn_chain`, `knight_fork`, `bishop_line`, `rook_open_file`.
- [ ] Pawn chain: attacking Pawn is diagonally protected by a same-faction Pawn one rank behind relative to its forward direction.
- [ ] Knight fork: attacking Knight currently threatens at least two living enemy units.
- [ ] Bishop line: Bishop attacks a target at Chebyshev distance >= 2 on an unobstructed diagonal.
- [ ] Rook open file: Rook attacks a target at distance >= 2 on an unobstructed rank/file and no other occupied intermediate cell exists.
- [ ] Any active named condition yields 12500 bps; multiple tags do not stack in Phase 2.
- [ ] Verify RED.
- [ ] Apply the multiplier to combat intent damage using integer floor arithmetic.
- [ ] Run full tests and typecheck.

### Task 6: Full combat determinism acceptance

**Files:**
- Create: `tests/sim/phase2-replay.test.ts`
- Create: `docs/PHASE2_REAL_TIME_COMBAT_ACCEPTANCE.md`

- [ ] Build a multi-tick replay with mixed movement, explicit targeting, Guard acquisition, cooldowns, positional bonuses and at least one death.
- [ ] Prove byte-equivalent canonical snapshots and event streams across repeated runs.
- [ ] Prove combat never mutates Phase 1 threat-map results for an unchanged board state.
- [ ] Run `npm test` and `npm run typecheck` in CI.
- [ ] Record exact CI evidence, counts and deferred boundaries.

## Phase 2 Exit Gate

Phase 2 is complete only when health/cadence/range, explicit attack targeting, simultaneous deterministic damage/death, Guard acquisition/leash, named positional bonuses and replay determinism are all CI-verified without renderer/economy/sovereign/hero/AI leakage.
