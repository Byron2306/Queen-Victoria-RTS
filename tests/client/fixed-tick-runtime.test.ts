import { describe, expect, it } from 'vitest';
import {
  FixedTickRuntime,
  SIM_TICK_MS,
} from '../../src/client/runtime/fixed-tick-runtime';

describe('Phase 6 fixed-tick runtime', () => {
  it('starts from the deterministic Phase 6 skirmish', () => {
    const runtime = new FixedTickRuntime();

    expect(runtime.world.tick).toBe(0);
    expect(runtime.world.width).toBe(16);
    expect(runtime.world.height).toBe(16);
  });

  it('does not advance before one complete fixed tick', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(SIM_TICK_MS - 1);

    expect(runtime.world.tick).toBe(0);
    expect(result.steps).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('advances exactly once at one complete fixed tick', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(SIM_TICK_MS);

    expect(runtime.world.tick).toBe(1);
    expect(result.steps).toBe(1);
  });

  it('carries fractional time into later advances', () => {
    const runtime = new FixedTickRuntime();

    runtime.advance(SIM_TICK_MS + 40);

    expect(runtime.world.tick).toBe(1);

    runtime.advance(SIM_TICK_MS - 40);

    expect(runtime.world.tick).toBe(2);
  });

  it('does not execute tactical movement through fixed ticks', () => {
    const runtime =
      new FixedTickRuntime();

    const before =
      runtime.world.units[
        'victoria-queen'
      ]!.position;

    runtime.commands.move(
      runtime.world,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    runtime.advance(
      SIM_TICK_MS * 2,
    );

    expect(
      runtime.world.units[
        'victoria-queen'
      ]?.position,
    ).toEqual(before);

    expect(
      runtime.world
        .turn
        .pendingOrderIds,
    ).toEqual([
      'victoria-r1-o0',
    ]);
  });

  it('performs multiple deterministic steps for accumulated time', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(SIM_TICK_MS * 3);

    expect(result.steps).toBe(3);
    expect(runtime.world.tick).toBe(3);
  });
});

describe('Royal Tactical fixed-tick authority boundary', () => {
  it('queues tactical movement without moving the unit during fixed ticks', () => {
    const runtime =
      new FixedTickRuntime();

    const before =
      runtime.world.units[
        'victoria-queen'
      ]!.position;

    runtime.commands.move(
      runtime.world,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    runtime.advance(
      SIM_TICK_MS * 3,
    );

    expect(
      runtime.world.units[
        'victoria-queen'
      ]?.position,
    ).toEqual(before);

    expect(
      runtime.world
        .turn
        .pendingOrderIds,
    ).toEqual([
      'victoria-r1-o0',
    ]);

    expect(
      runtime.world
        .turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(3);
  });
});
