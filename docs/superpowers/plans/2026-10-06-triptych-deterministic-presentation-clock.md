# Triptych Deterministic Presentation Clock Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-06-triptych-deterministic-presentation-clock-design.md`  
**Branch:** `agent/triptych-ideal-system-restoration`

## Objective

Replace split presentation timing with one canonical clock owned by
`FixedTickRuntime`, then route live unit interpolation through that clock while
preserving the hard boundary that presentation time cannot mutate `WorldState`.

## Execution discipline

Every production change follows RED -> GREEN.

Do not weaken strategic-authority tests to make presentation code pass.

Do not change:
- turn semantics;
- `WorldState.tick`;
- AI authority;
- production maturation;
- command budgets;
- combat;
- reinforcement timing.

## Task 1: Canonical Presentation Clock State

### RED

Extend `tests/client/fixed-tick-runtime.test.ts` with tests that require:

- a fresh runtime exposes:
  - `elapsedMs = 0`
  - `tick = 0`
  - `remainderMs = 0`
  - `alpha = 0`
- `advance(40)` then `advance(60)` yields:
  - total elapsed 100
  - tick 1
  - remainder 0
  - alpha 0
- `advance(250)` yields:
  - tick 2
  - remainder 50
  - alpha 0.5
- the returned `RuntimeAdvanceResult` includes the current presentation snapshot.

Expected RED: `presentationClock` and/or returned snapshot do not yet exist.

### GREEN

Modify `src/client/runtime/fixed-tick-runtime.ts`.

Add:

```ts
export interface PresentationClockSnapshot {
  elapsedMs: number;
  tick: number;
  remainderMs: number;
  alpha: number;
}
```

Add a readonly getter:

```ts
get presentationClock(): PresentationClockSnapshot
```

Track canonical cumulative elapsed presentation time.

Keep `steps` semantics as “whole 100 ms presentation ticks crossed during this call.”

Include the current snapshot in `RuntimeAdvanceResult`.

### Verification

Run:

```bash
npx vitest run tests/client/fixed-tick-runtime.test.ts
```

---

## Task 2: Clock Input Normalization and Partition Determinism

### RED

Add tests proving:

- `advance(-10)` is inert;
- `advance(NaN)` is inert;
- `advance(Infinity)` is inert;
- `advance(20); advance(30); advance(50)` produces the same final snapshot as
  `advance(100)`;
- `advance(250)` produces the same final snapshot as
  `advance(100); advance(100); advance(50)`;
- zero delta is inert;
- no accepted presentation delta changes `runtime.world` identity.

Expected RED: invalid values currently corrupt the accumulator or partition equality is
not yet explicitly guaranteed by the public snapshot.

### GREEN

Normalize input inside `FixedTickRuntime.advance()`:

```ts
const acceptedMs =
  Number.isFinite(elapsedMs) && elapsedMs > 0
    ? elapsedMs
    : 0;
```

Advance only accepted finite positive time.

Compute snapshot fields from canonical cumulative elapsed time.

Avoid per-frame clamping.

### Verification

Run the fixed-tick runtime suite again.

---

## Task 3: Motion Tracker Canonical-Time Contract

### RED

Create `tests/client/unit-motion-tracker.test.ts`.

Pin:

- initialization returns the authoritative point;
- a target change starts interpolation from the current visual position;
- equal canonical `nowMs` produces equal positions;
- absolute clock origin does not matter when the same elapsed presentation interval is
  used after reset/start;
- movement reaches the authoritative destination at `UNIT_MOVE_VISUAL_MS`;
- negative elapsed time cannot move backward past the start position.

Expected outcome may be partially GREEN because the tracker already receives a numeric
time source. The purpose is to freeze the contract before changing the scene.

### GREEN

Only patch `UnitMotionTracker` or `interpolateUnitMotion` if the RED demonstrates a
real defect.

Do not add strategic state.

### Verification

Run:

```bash
npx vitest run \
  tests/client/unit-motion-tracker.test.ts \
  tests/client/fixed-tick-runtime.test.ts
```

---

## Task 4: Remove Phaser Absolute Time from Unit Motion Authority

### RED

Create an architecture test, e.g.
`tests/client/presentation-clock-authority.test.ts`, importing
`src/client/phaser/phaser-scene.ts?raw`.

Require:

- battlefield update calls `controller.update(delta)`;
- unit motion reads
  `controller.runtime.presentationClock.elapsedMs`;
- the `time` argument is not passed to `motion.resolve()`;
- no direct `Date.now`, `performance.now`, or Phaser clock lookup is used for unit
  interpolation.

Expected RED: current source passes `time` directly to `motion.resolve()`.

### GREEN

Patch `src/client/phaser/phaser-scene.ts`.

After:

```ts
this.controller.update(delta);
```

read:

```ts
const presentationNow =
  this.controller.runtime.presentationClock.elapsedMs;
```

Use `presentationNow` in every per-frame `motion.resolve()`.

The Phaser `time` parameter remains accepted by the scene signature but becomes
non-authoritative for unit motion.

### Verification

Run:

```bash
npx vitest run \
  tests/client/presentation-clock-authority.test.ts \
  tests/client/battlefield-scene.test.ts \
  tests/client/fixed-tick-runtime.test.ts
```

---

## Task 5: Layout/Projection Rebase Without Strategic Motion

### RED

Add tests around motion + layout behavior.

Pin that a layout/camera rebase:

- resets a unit motion anchor to the newly projected authoritative position;
- does not change `WorldState`;
- does not create an interpolation trail from pre-camera screen coordinates;
- does not alter staged tactical commands.

Where practical, test the pure motion behavior directly and use an architecture test for
the scene's `layoutBattlefield()` reset call.

Expected outcome may already be GREEN because `layoutBattlefield()` currently calls
`motion.reset()`.

### GREEN

If necessary, make the reset use canonical presentation elapsed time rather than literal
`0`, but only if tests show the current reset creates a discontinuity in subsequent
motion timing.

Do not animate camera projection changes as unit movement.

### Verification

Run relevant motion, camera, and battlefield scene tests.

---

## Task 6: Presentation Clock Strategic-Authority Tripwires

### RED

Create or extend architecture tests that prove:

- `FixedTickRuntime.advance` does not import/call:
  - `stepWorld`
  - `planShadowTurn`
  - `resolveReinforcementPhase`
  - `queueRecruitment`
  - `deployReadyUnit`
  - `resolveCommittedOrders`
- `advance()` does not drain tactical commands;
- `advance()` does not drain legacy commands;
- repeated presentation ticks do not change:
  - turn phase;
  - Crown;
  - production queues;
  - READY;
  - combat health;
  - unit positions;
  - intelligence;
  - supply;
  - `WorldState.tick`.

Some tests should pass immediately. Keep them as architectural tripwires.

### GREEN

Production patch only if any tripwire reveals an actual leak.

### Verification

Run fixed-tick runtime + architecture suites.

---

## Task 7: Integrated Deterministic Presentation Clock Gauntlet

### RED

Create:
`tests/client/deterministic-presentation-clock-gauntlet.test.ts`.

One integrated test should prove:

1. fresh snapshot is zeroed;
2. chunked and unchunked deltas produce equal final snapshots;
3. invalid values are inert;
4. staged tactical orders remain staged;
5. world object identity remains unchanged;
6. strategic fields remain unchanged;
7. unit motion at equal canonical elapsed time is identical even when external Phaser
   absolute times differ;
8. presentation alpha remains in `[0, 1)`;
9. large positive deltas advance presentation ticks only.

Expected RED depends on which prior tasks are complete.

### GREEN

Minimal fixes only.

### Verification

Run the integrated gauntlet plus the focused presentation cluster.

---

## Task 8: Full Repository Verification and Scope Audit

Run:

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run build
```

Then audit the diff for forbidden scope.

Confirm:

- no strategic API is now driven by frame delta;
- `WorldState.tick` semantics are unchanged;
- no AI/economy/reinforcement logic was moved into presentation runtime;
- no camera code gained strategic authority;
- no raw Phaser absolute time remains an authority for unit interpolation;
- no legacy scheduler path was reactivated;
- no architecture tripwire was weakened.

## Completion evidence

The phase is complete only with:

- all focused clock/motion tests green;
- integrated presentation-clock gauntlet green;
- full repository green;
- typecheck green;
- build green;
- scope audit clean.

## Deferred work

Explicitly defer to the later art/animation phase:

- walking sprite sheets;
- attack sprite sheets;
- animation-state selection;
- attack hit timing visuals;
- death animation;
- easing polish;
- camera juice;
- replayable transient visual effects;
- audio synchronization.
