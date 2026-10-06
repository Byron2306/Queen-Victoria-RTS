# Triptych Deterministic Presentation Clock Design

**Phase:** Ideal-System Restoration — Presentation Clock  
**Status:** Design specification  
**Scope:** Client presentation time only. No strategic authority.

## Goal

Give the live Phaser client one deterministic presentation-time authority so animation,
interpolation, camera motion, transient effects, and future sprite animation can advance
smoothly without wall-clock time ever mutating Royal Tactical game truth.

The presentation clock exists beside the simulation. It does not drive the simulation.

```
browser frame delta
      ↓
presentation clock
      ↓
presentation tick + remainder + monotonic presentation time
      ↓
render interpolation / camera / transient visuals

explicit player / AI / phase APIs
      ↓
WorldState authority
```

## Doctrine

```
world truth is discrete
presentation time is continuous
frame cadence is not authority
equal elapsed presentation time yields equal presentation state
```

## Existing boundary

`FixedTickRuntime.advance(elapsedMs)` already counts 100 ms presentation steps and
does not mutate `WorldState`. This boundary is correct and remains canonical.

The gap is that the live Phaser scene currently also supplies Phaser's raw absolute
`time` value directly to `UnitMotionTracker.resolve()`. Presentation motion therefore
has a second clock source outside `FixedTickRuntime`.

The phase removes that split authority.

## Canonical clock state

```ts
type PresentationClockSnapshot = Readonly<{
  elapsedMs: number;
  tick: number;
  remainderMs: number;
  alpha: number;
}>;
```

Where:

- `elapsedMs` is cumulative accepted presentation time.
- `tick = floor(elapsedMs / SIM_TICK_MS)`.
- `remainderMs = elapsedMs % SIM_TICK_MS`.
- `alpha = remainderMs / SIM_TICK_MS`, in `[0, 1)`.

`RuntimeAdvanceResult` exposes the new snapshot in addition to the existing
`steps` and `events`.

## Input normalization

`advance(elapsedMs)` accepts presentation delta only.

- non-finite values are treated as zero;
- negative values are treated as zero;
- zero is inert;
- positive finite values are accumulated exactly;
- there is no frame-dependent strategic catch-up;
- large deltas may advance many presentation ticks but still cannot mutate `WorldState`.

No per-frame clamp is introduced because a clamp would make final presentation time
depend on frame partitioning.

## Determinism requirement

For any sequence of non-negative finite deltas whose sum is the same:

```
advance(20); advance(30); advance(50)
```

and

```
advance(100)
```

must produce the same final presentation clock snapshot.

This is presentation determinism, not deterministic browser frame cadence.

## Runtime API

`FixedTickRuntime` owns the canonical clock.

It exposes:

```ts
get presentationClock(): PresentationClockSnapshot
```

and:

```ts
advance(elapsedMs: number): RuntimeAdvanceResult
```

The existing `steps` field remains the number of whole presentation ticks crossed
during that specific call.

`world` remains referentially unchanged by clock advancement.

## Unit motion

`UnitMotionTracker` must receive canonical presentation time from
`FixedTickRuntime.presentationClock.elapsedMs`, never Phaser's raw `time`.

The motion tracker remains a presentation-only state machine:

```
authoritative screen target changes
      ↓
capture current interpolated screen position
      ↓
start transition at canonical presentation elapsedMs
      ↓
interpolate for UNIT_MOVE_VISUAL_MS
```

Equal world targets plus equal canonical presentation time must produce equal screen
positions regardless of Phaser's absolute time origin.

## Layout and camera changes

Camera pan, zoom, and resize change the projection, not world truth.

A projection/layout refresh must not manufacture strategic movement. It may rebase
presentation anchors to the newly projected authoritative positions so units do not
animate from stale pre-camera coordinates.

Keyboard camera movement may continue to use frame delta for distance, because camera
position is presentation state. It must not mutate `WorldState`.

## Transient effects

Phaser timers such as damage-label expiry are presentation-only and may remain Phaser
timers in this phase.

They must not:
- spend Crown;
- enqueue orders;
- change turn phase;
- move units in `WorldState`;
- alter intelligence truth;
- mature production;
- change combat truth.

A later visual-effects phase may migrate them onto the canonical presentation clock if
replayable visual capture is required.

## Scene authority

The base battlefield scene update becomes:

```
controller.update(delta)
      ↓
FixedTickRuntime advances canonical presentation clock
      ↓
read canonical presentation elapsedMs
      ↓
resolve unit visual motion
```

The Phaser `time` argument becomes non-authoritative and must not be supplied to unit
motion.

## Architecture tripwires

Tests must pin that:

1. `FixedTickRuntime.advance()` never mutates `WorldState`.
2. equal total deltas produce equal clock snapshots.
3. invalid/negative deltas cannot rewind or corrupt presentation time.
4. the scene does not pass Phaser `time` into `UnitMotionTracker.resolve()`.
5. motion depends on canonical presentation time only.
6. presentation ticks do not drain tactical or legacy commands.
7. presentation ticks do not run AI, production, reinforcement, combat, or turn transitions.
8. camera input remains presentation-only.

## Acceptance gauntlet

The integrated presentation-clock gauntlet must prove:

- a fresh runtime starts at elapsed 0, tick 0, remainder 0, alpha 0;
- 40 + 60 ms equals one 100 ms advance;
- 250 ms yields tick 2, remainder 50, alpha 0.5;
- chunked and unchunked elapsed time yield identical snapshots;
- negative/NaN/Infinity inputs are inert;
- `WorldState` identity and strategic truth are unchanged;
- staged tactical commands remain staged;
- a motion transition gives the same visual position for equal canonical time even when
  the external Phaser time origin differs.

## Non-goals

This phase does not:

- make strategic simulation real-time;
- change `WorldState.tick`;
- add new combat animation art;
- add walking/attack sprite sheets;
- redesign easing curves;
- make visual effects part of replay truth;
- change camera feel;
- change AI;
- change turn resolution.

Those belong to later presentation/art passes.

## Completion rule

The phase is complete only when the presentation clock is single-authority,
frame-partition deterministic, proven not to mutate strategic truth, wired into live
unit interpolation, and the full repository test/typecheck/build gauntlet remains green.
