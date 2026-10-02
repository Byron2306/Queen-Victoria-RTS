import { describe, expect, it } from 'vitest';
import {
  FixedTickRuntime,
  SIM_TICK_MS,
} from '../../src/client/runtime/fixed-tick-runtime';

describe('Royal Tactical fixed-tick runtime', () => {
  it('starts from deterministic skirmish state', () => {
    const runtime = new FixedTickRuntime();

    expect(runtime.world.tick).toBe(0);
    expect(runtime.world.width).toBe(32);
    expect(runtime.world.height).toBe(32);
  });

  it('does nothing before one presentation tick', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const result = runtime.advance(SIM_TICK_MS - 1);

    expect(result.steps).toBe(0);
    expect(result.events).toEqual([]);
    expect(runtime.world).toBe(before);
  });

  it('counts presentation time without strategic mutation', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const result = runtime.advance(SIM_TICK_MS);

    expect(result.steps).toBe(1);
    expect(result.events).toEqual([]);
    expect(runtime.world).toBe(before);
    expect(runtime.world.tick).toBe(0);
  });

  it('carries fractional presentation time', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const first = runtime.advance(SIM_TICK_MS + 40);
    const second = runtime.advance(SIM_TICK_MS - 40);

    expect(first.steps).toBe(1);
    expect(second.steps).toBe(1);
    expect(runtime.world).toBe(before);
    expect(runtime.world.tick).toBe(0);
  });

  it('does not drain tactical commands', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;
    const position = runtime.world.units['victoria-queen']!.position;

    runtime.commands.move(runtime.world, 'victoria-queen', { x: 5, y: 16 });

    const result = runtime.advance(SIM_TICK_MS * 2);

    expect(result.steps).toBe(2);
    expect(result.events).toEqual([]);
    expect(runtime.world).toBe(before);
    expect(runtime.world.units['victoria-queen']?.position).toEqual(position);
    expect(runtime.world.turn.pendingOrderIds).toEqual([]);
    expect(runtime.world.turn.royalCommandsRemaining.victoria).toBe(4);
    expect(runtime.commands.drainTactical().map(order => order.orderId)).toEqual([
      'victoria-r1-o0',
    ]);
  });

  it('counts multiple presentation steps without strategic authority', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const result = runtime.advance(SIM_TICK_MS * 3);

    expect(result.steps).toBe(3);
    expect(runtime.world).toBe(before);
    expect(runtime.world.tick).toBe(0);
  });
});
