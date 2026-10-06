import { describe, expect, it } from 'vitest';

import sceneSource from '../../src/client/phaser/phaser-scene.ts?raw';
import { UnitMotionTracker } from '../../src/client/render/unit-motion-tracker';

function layoutSource(): string {
  const start = sceneSource.indexOf(
    '    layoutBattlefield(): void {',
  );
  expect(start).toBeGreaterThanOrEqual(0);

  const end = sceneSource.indexOf(
    '    update(\n',
    start,
  );
  expect(end).toBeGreaterThan(start);

  return sceneSource.slice(start, end);
}

describe('presentation layout rebase authority', () => {
  it('rebases unit motion to the newly projected authoritative anchor', () => {
    const tracker = new UnitMotionTracker();

    tracker.reset(
      'unit-1',
      { x: 100, y: 100 },
      1000,
    );

    tracker.resolve(
      'unit-1',
      { x: 200, y: 100 },
      1100,
    );

    const midMove = tracker.resolve(
      'unit-1',
      { x: 200, y: 100 },
      1350,
    );

    expect(midMove).toEqual({
      x: 150,
      y: 100,
    });

    const rebased = tracker.reset(
      'unit-1',
      { x: 420, y: 260 },
      1350,
    );

    expect(rebased).toEqual({
      x: 420,
      y: 260,
    });

    expect(
      tracker.resolve(
        'unit-1',
        { x: 420, y: 260 },
        1366,
      ),
    ).toEqual({
      x: 420,
      y: 260,
    });
  });

  it('starts later strategic motion from the rebased presentation anchor', () => {
    const tracker = new UnitMotionTracker();

    tracker.reset(
      'unit-1',
      { x: 420, y: 260 },
      1350,
    );

    tracker.resolve(
      'unit-1',
      { x: 520, y: 260 },
      1400,
    );

    expect(
      tracker.resolve(
        'unit-1',
        { x: 520, y: 260 },
        1650,
      ),
    ).toEqual({
      x: 470,
      y: 260,
    });
  });

  it('keeps layout rebase inside presentation state rather than WorldState', () => {
    const layout = layoutSource();

    expect(layout).toContain(
      'this.motion.reset(',
    );

    expect(layout).not.toContain(
      'this.controller.runtime.world =',
    );
    expect(layout).not.toContain(
      'this.controller.world =',
    );
    expect(layout).not.toContain(
      'stepWorld(',
    );
    expect(layout).not.toContain(
      'transitionTurnPhase(',
    );
  });

  it('does not route camera or projection changes through strategic commands', () => {
    const layout = layoutSource();

    expect(layout).not.toContain(
      '.commands.move(',
    );
    expect(layout).not.toContain(
      '.commands.attack(',
    );
    expect(layout).not.toContain(
      'enqueueTacticalOrder(',
    );
    expect(layout).not.toContain(
      'deployReadyUnit(',
    );
  });
});
