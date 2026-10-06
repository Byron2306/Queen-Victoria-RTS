import { describe, expect, it } from 'vitest';

import sceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

function updateSource(): string {
  const start = sceneSource.indexOf(
    '    update(\n      time: number,\n      delta: number,\n    ): void {',
  );
  expect(start).toBeGreaterThanOrEqual(0);

  const end = sceneSource.indexOf(
    '    private refreshSelection(',
    start,
  );
  expect(end).toBeGreaterThan(start);

  return sceneSource.slice(start, end);
}

describe('presentation clock authority architecture', () => {
  it('advances the canonical runtime from Phaser delta', () => {
    const update = updateSource();

    expect(update).toContain(
      'this.controller.update(delta);',
    );
  });

  it('reads canonical presentation elapsed time after runtime advancement', () => {
    const update = updateSource();

    expect(update).toContain(
      'this.controller.runtime.presentationClock.elapsedMs',
    );
  });

  it('never supplies Phaser absolute time to unit motion', () => {
    const update = updateSource();

    expect(update).not.toContain(
      'unit.y,\n            },\n            time,',
    );
    expect(update).not.toMatch(
      /motion\.resolve\([\s\S]*?\btime\s*,?\s*\)/,
    );
  });

  it('keeps wall-clock APIs out of unit-motion authority', () => {
    const update = updateSource();

    expect(update).not.toContain('Date.now');
    expect(update).not.toContain('performance.now');
    expect(update).not.toContain('scene.time.now');
    expect(update).not.toContain('this.time.now');
  });
});
