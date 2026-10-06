import { describe, expect, it } from 'vitest';

import {
  UnitMotionTracker,
} from '../../src/client/render/unit-motion-tracker';
import {
  UNIT_MOVE_VISUAL_MS,
} from '../../src/client/render/unit-motion';

describe('unit motion tracker canonical-time contract', () => {
  it('initializes directly at the authoritative presentation point', () => {
    const tracker = new UnitMotionTracker();

    expect(
      tracker.resolve(
        'unit-1',
        { x: 10, y: 20 },
        250,
      ),
    ).toEqual({
      x: 10,
      y: 20,
    });
  });

  it('starts a target transition from the current visual position', () => {
    const tracker = new UnitMotionTracker();

    tracker.resolve(
      'unit-1',
      { x: 0, y: 0 },
      0,
    );

    expect(
      tracker.resolve(
        'unit-1',
        { x: 100, y: 0 },
        100,
      ),
    ).toEqual({
      x: 0,
      y: 0,
    });

    expect(
      tracker.resolve(
        'unit-1',
        { x: 100, y: 0 },
        350,
      ),
    ).toEqual({
      x: 50,
      y: 0,
    });

    const retargeted = tracker.resolve(
      'unit-1',
      { x: 200, y: 0 },
      350,
    );

    expect(retargeted).toEqual({
      x: 50,
      y: 0,
    });

    expect(
      tracker.resolve(
        'unit-1',
        { x: 200, y: 0 },
        600,
      ),
    ).toEqual({
      x: 125,
      y: 0,
    });
  });

  it('produces equal visual positions for equal canonical time', () => {
    const a = new UnitMotionTracker();
    const b = new UnitMotionTracker();

    a.resolve('unit-1', { x: 0, y: 0 }, 0);
    b.resolve('unit-1', { x: 0, y: 0 }, 0);

    a.resolve('unit-1', { x: 100, y: 40 }, 100);
    b.resolve('unit-1', { x: 100, y: 40 }, 100);

    expect(
      a.resolve(
        'unit-1',
        { x: 100, y: 40 },
        300,
      ),
    ).toEqual(
      b.resolve(
        'unit-1',
        { x: 100, y: 40 },
        300,
      ),
    );
  });

  it('is independent of the absolute clock origin', () => {
    const early = new UnitMotionTracker();
    const late = new UnitMotionTracker();

    early.reset(
      'unit-1',
      { x: 0, y: 0 },
      1000,
    );
    late.reset(
      'unit-1',
      { x: 0, y: 0 },
      5000,
    );

    early.resolve(
      'unit-1',
      { x: 100, y: 0 },
      1100,
    );
    late.resolve(
      'unit-1',
      { x: 100, y: 0 },
      5100,
    );

    expect(
      early.resolve(
        'unit-1',
        { x: 100, y: 0 },
        1350,
      ),
    ).toEqual(
      late.resolve(
        'unit-1',
        { x: 100, y: 0 },
        5350,
      ),
    );
  });

  it('reaches the authoritative destination after the visual move duration', () => {
    const tracker = new UnitMotionTracker();

    tracker.resolve(
      'unit-1',
      { x: 0, y: 0 },
      0,
    );

    tracker.resolve(
      'unit-1',
      { x: 100, y: 40 },
      100,
    );

    expect(
      tracker.resolve(
        'unit-1',
        { x: 100, y: 40 },
        100 + UNIT_MOVE_VISUAL_MS,
      ),
    ).toEqual({
      x: 100,
      y: 40,
    });
  });

  it('does not interpolate backward before a transition start time', () => {
    const tracker = new UnitMotionTracker();

    tracker.reset(
      'unit-1',
      { x: 10, y: 20 },
      1000,
    );

    tracker.resolve(
      'unit-1',
      { x: 110, y: 20 },
      1200,
    );

    expect(
      tracker.resolve(
        'unit-1',
        { x: 110, y: 20 },
        1100,
      ),
    ).toEqual({
      x: 10,
      y: 20,
    });
  });
});
