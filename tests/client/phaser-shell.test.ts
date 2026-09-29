import { describe, expect, it } from 'vitest';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PHASER_PARENT_ID,
  createPhaserShellDescriptor,
} from '../../src/client/phaser/shell';

describe('Phase 6 Phaser shell', () => {
  it('uses the canonical 4:3 client viewport', () => {
    expect(GAME_WIDTH).toBe(1600);
    expect(GAME_HEIGHT).toBe(1200);
  });

  it('mounts into one stable browser root', () => {
    expect(PHASER_PARENT_ID).toBe('queen-victoria-rts');

    expect(createPhaserShellDescriptor().parentId)
      .toBe(PHASER_PARENT_ID);
  });

  it('declares one battlefield root scene', () => {
    const shell = createPhaserShellDescriptor();

    expect(shell.sceneKeys).toEqual([
      'battlefield',
    ]);
  });

  it('uses responsive resize ownership', () => {
    const shell = createPhaserShellDescriptor();

    expect(shell.resizePolicy).toBe('resize');
    expect(shell.autoCenter).toBe(true);
  });

  it('declares the fixed-tick runtime as scene-owned', () => {
    const shell = createPhaserShellDescriptor();

    expect(shell.runtimeOwner).toBe('battlefield');
    expect(shell.runtimeKind).toBe('fixed-tick');
  });

  it('can be inspected without a browser DOM', () => {
    expect(typeof document).toBe('undefined');

    const shell = createPhaserShellDescriptor();

    expect(shell).toMatchObject({
      width: 1600,
      height: 1200,
      background: '#100d18',
      transparent: false,
    });
  });
});
