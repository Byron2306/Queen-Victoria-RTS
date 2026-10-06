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


  it('exposes a zeroed canonical presentation clock at startup', () => {
    const runtime = new FixedTickRuntime();

    expect(runtime.presentationClock).toEqual({
      elapsedMs: 0,
      tick: 0,
      remainderMs: 0,
      alpha: 0,
    });
  });

  it('accumulates canonical presentation time across advances', () => {
    const runtime = new FixedTickRuntime();

    const first = runtime.advance(40);
    const second = runtime.advance(60);

    expect(first.presentationClock).toEqual({
      elapsedMs: 40,
      tick: 0,
      remainderMs: 40,
      alpha: 0.4,
    });

    expect(second.presentationClock).toEqual({
      elapsedMs: 100,
      tick: 1,
      remainderMs: 0,
      alpha: 0,
    });

    expect(runtime.presentationClock).toEqual(
      second.presentationClock,
    );
  });

  it('reports tick, remainder, and alpha from cumulative presentation time', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(250);

    expect(result.steps).toBe(2);
    expect(result.presentationClock).toEqual({
      elapsedMs: 250,
      tick: 2,
      remainderMs: 50,
      alpha: 0.5,
    });
  });


  it('treats negative, NaN, Infinity, and zero presentation deltas as inert', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const negative = runtime.advance(-10);
    const nan = runtime.advance(Number.NaN);
    const infinity = runtime.advance(Number.POSITIVE_INFINITY);
    const zero = runtime.advance(0);

    for (const result of [
      negative,
      nan,
      infinity,
      zero,
    ]) {
      expect(result.steps).toBe(0);
      expect(result.presentationClock).toEqual({
        elapsedMs: 0,
        tick: 0,
        remainderMs: 0,
        alpha: 0,
      });
    }

    expect(runtime.world).toBe(before);
  });

  it('is deterministic across equivalent frame partitions', () => {
    const chunked = new FixedTickRuntime();
    const single = new FixedTickRuntime();

    chunked.advance(20);
    chunked.advance(30);
    chunked.advance(50);

    single.advance(100);

    expect(chunked.presentationClock).toEqual(
      single.presentationClock,
    );

    const chunkedLarge = new FixedTickRuntime();
    const singleLarge = new FixedTickRuntime();

    chunkedLarge.advance(100);
    chunkedLarge.advance(100);
    chunkedLarge.advance(50);

    singleLarge.advance(250);

    expect(chunkedLarge.presentationClock).toEqual(
      singleLarge.presentationClock,
    );
  });

  it('never changes world identity while accumulating accepted presentation time', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    runtime.advance(25);
    runtime.advance(75);
    runtime.advance(150);

    expect(runtime.world).toBe(before);
    expect(runtime.presentationClock).toEqual({
      elapsedMs: 250,
      tick: 2,
      remainderMs: 50,
      alpha: 0.5,
    });
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
