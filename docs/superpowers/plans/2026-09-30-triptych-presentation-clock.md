# Triptych Deliberate Movement and Combat Presentation Clock Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Use TDD for every behavioral change and keep deterministic simulation authority separate from presentation.

**Goal:** Replace unreadable teleport-like movement and combat deltas with one ordered presentation clock that makes movement, attacks, impacts, deaths, deployment and annexation causally readable without changing deterministic simulation truth.

**Architecture:** Simulation continues to resolve atomically through existing order/round authorities. `BattlefieldSceneController.endTurn()` produces a deterministic resolution transcript alongside the final world. A pure presentation planner converts the transcript into typed cues. `FixedTickRuntime`, already presentation-only, owns cue timing. Phaser consumes cues and animates sprites/effects while authoritative logical positions remain simulation-owned. The scene may hold a transient visual pose/world cursor, but presentation never rewrites outcomes.

**Tech Stack:** TypeScript, Vitest, Phaser, existing `FixedTickRuntime`, `UnitMotionTracker`, order resolver events and camera projection.

**Spec:** `docs/superpowers/specs/2026-09-30-triptych-coalesced-strategy-and-presentation.md`

## Presentation Contract

Typed cue family:

```ts
type PresentationCue =
  | MoveStartCue
  | MoveTravelCue
  | MoveArriveCue
  | AttackWindupCue
  | AttackTravelCue
  | MeleeStrikeCue
  | ImpactCue
  | HitReactionCue
  | DamageRevealCue
  | DeathCue
  | AssaultAdvanceCue
  | RecoverCue
  | DeployStartCue
  | DeployCompleteCue
  | AnnexPulseCue;
```

Target cadence:

- Pawn movement: `400 ms/tile`.
- King/Queen/Rook/Bishop movement: `350 ms/tile` baseline.
- Knight leap: `700 ms` total.
- Attack wind-up: `450 ms` baseline.
- Ranged travel: `250..800 ms` based on projected distance.
- Impact hold: `120 ms`.
- Hit reaction: `400 ms`.
- Death: `1000 ms`.
- Recovery: `250 ms`.

These values live in one presentation timing table and are not simulation timings.

## Global Constraints

- Normal attacks never change attacker logical position.
- Melee lunge is presentation-only and returns to the attacker's tile.
- Assault advances only when the authoritative assault result moved the attacker.
- Ranged attackers remain planted; only projectile/effect travels.
- Knight movement uses wind-up/leap/landing, not fake intermediate chess cells.
- No wall-clock tick mutates strategic `WorldState`.
- Camera transforms may alter cue screen positions but not logical cue endpoints.
- Presentation cannot reveal hidden information earlier than allowed by the resolved information transcript.
- If animations are skipped/fast-forwarded later, final visuals must land on the same authoritative world.

## Review Focus

- The existing `showCombatDelta()` text-only afterthought must stop being primary combat presentation.
- The existing direct `UnitMotionTracker` 500 ms endpoint interpolation is a primitive to consolidate, not a second parallel animator.
- Multi-order rounds must preserve causal ordering.
- Shadow attacks must be just as readable as Victoria attacks.
- A player must always be able to identify attacker, origin, impact, damage and death cause.

---

### Task 1: Capture a Deterministic Round Resolution Transcript

**Files:**
- Modify: `src/client/phaser/battlefield-scene.ts`
- Modify: `src/sim/resolve-orders.ts` only if a missing movement/result event must be emitted
- Create: `src/client/presentation/resolution-transcript.ts`
- Create: `tests/client/resolution-transcript.test.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`

**Interface target:**
```ts
type RoundResolutionTranscript = Readonly<{
  before: WorldState;
  victoria: FactionResolutionTrace;
  shadow: FactionResolutionTrace;
  reinforcementBefore: WorldState;
  after: WorldState;
}>;
```

- [ ] RED: `endTurn()` can expose Victoria orders/outcomes/events, Shadow orders/outcomes/events, phase snapshots and final world in deterministic order.
- [ ] Preserve the existing final world exactly; transcript is evidence, not a second resolver.
- [ ] Add explicit resolved move metadata/events if presentation cannot reconstruct from order + snapshots.
- [ ] Commit: `feat: capture deterministic round presentation transcript`.

### Task 2: Build a Pure Presentation Planner

**Files:**
- Create: `src/client/presentation/presentation-cues.ts`
- Create: `src/client/presentation/presentation-plan.ts`
- Create: `tests/client/presentation-plan.test.ts`

- [ ] RED: a resolved one-tile Pawn move yields `MOVE_START -> MOVE_TRAVEL -> MOVE_ARRIVE` with logical endpoints and `400 ms` travel.
- [ ] RED: Rook/Bishop/Queen multi-cell moves calculate a legal visual path length and duration per tile without creating gameplay waypoints.
- [ ] RED: Knight move yields one leap cue, never walk cues through intermediate cells.
- [ ] RED: a melee attack yields `ATTACK_WINDUP -> MELEE_STRIKE -> IMPACT -> HIT_REACTION -> DAMAGE_REVEAL -> RECOVER`, adding `DEATH` when lethal.
- [ ] RED: a ranged attack yields planted attacker + `ATTACK_TRAVEL` effect to target.
- [ ] RED: normal attack cues contain no logical attacker relocation; successful assault adds `ASSAULT_ADVANCE` only after impact/death.
- [ ] Implement planner as pure data transformation with no Phaser calls.
- [ ] Commit: `feat: plan readable Triptych presentation cues`.

### Task 3: Promote FixedTickRuntime into the Single Presentation Clock

**Files:**
- Modify: `src/client/runtime/fixed-tick-runtime.ts`
- Create: `src/client/presentation/presentation-clock.ts`
- Create: `tests/client/presentation-clock.test.ts`

**Interface target:**
```ts
runtime.enqueuePresentation(cues): void;
runtime.advance(elapsedMs): RuntimeAdvanceResult & {
  presentation: PresentationFrame;
};
```

- [ ] RED: advancing time changes cue progress only, never `runtime.world`.
- [ ] RED: cue completion advances deterministically to next cue; overshoot consumes remaining elapsed time correctly.
- [ ] RED: zero/huge elapsed values clamp safely; `finishPresentation()` lands on final cue state without changing gameplay truth.
- [ ] Preserve `SIM_TICK_MS` only if still useful as a presentation frame quantum; no strategic mutation returns.
- [ ] Commit: `feat: make fixed tick runtime the presentation clock`.

### Task 4: Consolidate UnitMotionTracker into Cue-Driven Movement

**Files:**
- Modify: `src/client/render/unit-motion.ts`
- Modify: `src/client/render/unit-motion-tracker.ts`
- Modify: `src/client/phaser/phaser-scene.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Create: `tests/client/unit-motion-tracker.test.ts`

- [ ] RED: sprite begins at authoritative pre-move anchor, visibly traverses, then lands exactly on current projected destination.
- [ ] RED: camera pan/zoom during an active movement reprojects logical endpoints and does not detach sprite from world geometry.
- [ ] Remove autonomous “authoritative endpoint changed, interpolate 500 ms” timing ownership; tracker becomes a renderer/helper for active cues.
- [ ] Commit: `refactor: drive unit motion from presentation cues`.

### Task 5: Implement the Actual MOER Melee Sequence

**Files:**
- Create: `src/client/render/combat-presentation.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Create: `tests/client/combat-presentation.test.ts`

- [ ] RED: melee lunge never exceeds a bounded fraction of the attacker-target projected gap and always returns to original anchor for normal attack.
- [ ] Add wind-up pose hook, short lunge, strike/contact hook, 120 ms impact hold, target recoil, damage reveal and recovery.
- [ ] On lethal result, play death phase before removing/hiding target sprite.
- [ ] Asset hook must accept later sprite-sheet animations without changing cue semantics. Until final animation assets arrive, deterministic tween/scale/rotation placeholders may represent the phases.
- [ ] Commit: `feat: add readable melee MOER presentation`.

### Task 6: Implement Ranged Travel and Assault Advance

**Files:**
- Modify: `src/client/render/combat-presentation.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: `tests/client/combat-presentation.test.ts`
- Modify: `tests/sim/assault-resolution.test.ts` only for characterization if needed

- [ ] RED: ranged attacker anchor never changes during normal attack.
- [ ] Render a transient projectile/effect from attacker to target with duration clamped to `250..800 ms`.
- [ ] RED: assault that kills and advances plays attack/death first, then `ASSAULT_ADVANCE`; failed/non-advancing assault never visually moves attacker into target tile.
- [ ] Commit: `feat: present ranged attacks and assault advance causally`.

### Task 7: Progressively Present Intelligence During Movement

**Files:**
- Create: `src/client/presentation/intelligence-reveal.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: `src/client/intelligence/presented-world.ts` only if a presentation cursor API is required
- Create: `tests/client/progressive-intelligence-reveal.test.ts`

- [ ] Compute reveal slices from before/after faction memory plus the moving unit's logical visual path.
- [ ] During animation, reveal only the subset assigned to reached path progress; authoritative world remains fully resolved underneath.
- [ ] Ensure newly revealed enemy cannot be clicked to alter an already committed resolution.
- [ ] At presentation completion, visible intelligence exactly matches authoritative post-resolution intelligence.
- [ ] Commit: `feat: peel battlefield intelligence with movement`.

### Task 8: Fold Deployment and Annexation into the Same Clock

**Files:**
- Modify: `src/client/presentation/presentation-plan.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Modify: tests from READY deployment plan
- Create/modify: `tests/client/strategic-presentation.test.ts`

- [ ] READY placement yields `DEPLOY_START -> DEPLOY_COMPLETE`, then unit settles into idle.
- [ ] Successful territory claim yields `ANNEX_PULSE` on the exact camera-bound tile.
- [ ] Supply-state changes may display status after annexation, never before the authoritative claim cue.
- [ ] Commit: `feat: sequence deployment and annex presentation`.

### Task 9: Retire Text-Only Combat Delta as Primary Authority and Run the Readability Gauntlet

**Files:**
- Modify: `src/client/phaser/royal-battlefield-scene.ts`
- Modify: `src/client/phaser/triptych-battlefield-scene.ts`
- Create: `tests/client/triptych-presentation-gauntlet.test.ts`

- [ ] Remove or demote `showCombatDelta()` so `DEFEATED`/`-HP` labels supplement cues instead of being the only visible causality.
- [ ] Gauntlet scenario: Victoria movement, Shadow movement, melee hit, ranged hit, lethal hit, assault advance, camera pan mid-animation, annex pulse and READY deployment.
- [ ] Assert no cue causes a normal attacker to end on a different logical tile.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Commit: `test: lock deliberate Triptych battle presentation`.
