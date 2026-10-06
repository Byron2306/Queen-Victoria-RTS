import { describe, expect, it } from 'vitest';

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  createPhaserShellDescriptor,
} from '../../src/client/phaser/shell';

describe('restored mobile shell presentation authority', () => {
  it('uses the working 16:9 battlefield shell rather than the stale 4:3 Phase 6 shell', () => {
    expect(GAME_WIDTH).toBe(1600);
    expect(GAME_HEIGHT).toBe(900);
    expect(GAME_WIDTH / GAME_HEIGHT)
      .toBeCloseTo(16 / 9, 6);
  });

  it('keeps responsive resize ownership', () => {
    const shell =
      createPhaserShellDescriptor();

    expect(shell.resizePolicy).toBe('resize');
    expect(shell.autoCenter).toBe(true);
  });

  it('does not change runtime authority while correcting presentation geometry', () => {
    const shell =
      createPhaserShellDescriptor();

    expect(shell.runtimeOwner)
      .toBe('battlefield');

    expect(shell.runtimeKind)
      .toBe('fixed-tick');
  });
});
