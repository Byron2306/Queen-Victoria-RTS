import { describe, expect, it } from 'vitest';

import {
  FixedTickRuntime,
  SIM_TICK_MS,
} from '../../src/client/runtime/fixed-tick-runtime';
import {
  UnitMotionTracker,
} from '../../src/client/render/unit-motion-tracker';

function stageVictoriaMove(
  runtime: FixedTickRuntime,
): void {
  const queen =
    runtime.world.units['victoria-queen'];

  expect(queen).toBeDefined();

  runtime.commands.move(
    runtime.world,
    'victoria-queen',
    {
      x: queen!.position.x + 1,
      y: queen!.position.y,
    },
  );
}

describe('deterministic presentation clock gauntlet', () => {
  it('proves one presentation clock across partitioning, invalid input, command staging, world truth, and motion', () => {
    const chunked =
      new FixedTickRuntime();
    const single =
      new FixedTickRuntime();

    expect(
      chunked.presentationClock,
    ).toEqual({
      elapsedMs: 0,
      tick: 0,
      remainderMs: 0,
      alpha: 0,
    });

    const chunkedWorld =
      chunked.world;
    const singleWorld =
      single.world;

    stageVictoriaMove(chunked);
    stageVictoriaMove(single);

    const chunkedOrdersBefore =
      chunked.commands.peekTactical();
    const singleOrdersBefore =
      single.commands.peekTactical();

    chunked.advance(-10);
    chunked.advance(Number.NaN);
    chunked.advance(Number.POSITIVE_INFINITY);
    chunked.advance(0);

    expect(
      chunked.presentationClock,
    ).toEqual({
      elapsedMs: 0,
      tick: 0,
      remainderMs: 0,
      alpha: 0,
    });

    chunked.advance(20);
    chunked.advance(30);
    chunked.advance(50);
    chunked.advance(150);

    const singleResult =
      single.advance(250);

    expect(
      chunked.presentationClock,
    ).toEqual(
      single.presentationClock,
    );

    expect(
      single.presentationClock,
    ).toEqual({
      elapsedMs: 250,
      tick: 2,
      remainderMs: 50,
      alpha: 0.5,
    });

    expect(
      singleResult.steps,
    ).toBe(2);

    expect(
      chunked.presentationClock.alpha,
    ).toBeGreaterThanOrEqual(0);
    expect(
      chunked.presentationClock.alpha,
    ).toBeLessThan(1);

    expect(chunked.world).toBe(
      chunkedWorld,
    );
    expect(single.world).toBe(
      singleWorld,
    );

    expect(chunked.world.tick).toBe(0);
    expect(single.world.tick).toBe(0);

    expect(
      chunked.commands.peekTactical(),
    ).toEqual(
      chunkedOrdersBefore,
    );
    expect(
      single.commands.peekTactical(),
    ).toEqual(
      singleOrdersBefore,
    );

    const strategicChunked = {
      phase: chunked.world.turn.phase,
      crown:
        chunked.world.economy.crownPower,
      queues:
        chunked.world.production.queues,
      ready:
        chunked.world.production.ready,
      units:
        chunked.world.units,
      combat:
        chunked.world.combat,
      intelligence:
        chunked.world.intelligence,
      supply:
        chunked.world.supply,
    };

    chunked.advance(
      SIM_TICK_MS * 100,
    );

    expect(chunked.world).toBe(
      chunkedWorld,
    );
    expect(chunked.world.tick).toBe(0);
    expect(
      chunked.world.turn.phase,
    ).toBe(strategicChunked.phase);
    expect(
      chunked.world.economy.crownPower,
    ).toEqual(strategicChunked.crown);
    expect(
      chunked.world.production.queues,
    ).toEqual(strategicChunked.queues);
    expect(
      chunked.world.production.ready,
    ).toEqual(strategicChunked.ready);
    expect(
      chunked.world.units,
    ).toEqual(strategicChunked.units);
    expect(
      chunked.world.combat,
    ).toEqual(strategicChunked.combat);
    expect(
      chunked.world.intelligence,
    ).toEqual(
      strategicChunked.intelligence,
    );
    expect(
      chunked.world.supply,
    ).toEqual(strategicChunked.supply);

    const earlyClockMotion =
      new UnitMotionTracker();
    const lateClockMotion =
      new UnitMotionTracker();

    earlyClockMotion.reset(
      'unit-1',
      { x: 0, y: 0 },
      0,
    );
    lateClockMotion.reset(
      'unit-1',
      { x: 0, y: 0 },
      10_000,
    );

    earlyClockMotion.resolve(
      'unit-1',
      { x: 100, y: 40 },
      100,
    );
    lateClockMotion.resolve(
      'unit-1',
      { x: 100, y: 40 },
      10_100,
    );

    const earlyPosition =
      earlyClockMotion.resolve(
        'unit-1',
        { x: 100, y: 40 },
        350,
      );

    const latePosition =
      lateClockMotion.resolve(
        'unit-1',
        { x: 100, y: 40 },
        10_350,
      );

    expect(earlyPosition).toEqual(
      latePosition,
    );
    expect(earlyPosition).toEqual({
      x: 50,
      y: 20,
    });
  });
});
