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

  it('processes player commands at T+1', () => {
    const runtime = new FixedTickRuntime();

    runtime.commands.move(
      runtime.world.tick,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    runtime.advance(SIM_TICK_MS);

    expect(runtime.world.tick).toBe(1);
    expect(runtime.world.units['victoria-queen']?.position)
      .toEqual({ x: 3, y: 13 });

    const result = runtime.advance(SIM_TICK_MS);

    expect(runtime.world.tick).toBe(2);
    expect(runtime.world.units['victoria-queen']?.position)
      .toEqual({ x: 4, y: 12 });

    expect(
      result.events.some(
        event =>
          event.type === 'move.accepted' &&
          event.unitId === 'victoria-queen',
      ),
    ).toBe(true);
  });

  it('performs multiple deterministic steps for accumulated time', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(SIM_TICK_MS * 3);

    expect(result.steps).toBe(3);
    expect(runtime.world.tick).toBe(3);
  });
});
