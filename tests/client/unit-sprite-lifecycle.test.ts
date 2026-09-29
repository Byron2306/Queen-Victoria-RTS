import { describe, expect, it, vi } from 'vitest';
import { removeStaleUnitSprites } from '../../src/client/phaser/unit-sprite-lifecycle';

describe('unit sprite lifecycle', () => {
  it('destroys and removes sprites for units absent from the authoritative frame', () => {
    const deadDestroy = vi.fn();
    const liveDestroy = vi.fn();
    const sprites = new Map<string, { destroy: () => void }>([
      ['victoria-rook', { destroy: liveDestroy }],
      ['obsidian-pawn', { destroy: deadDestroy }],
    ]);

    const removed = removeStaleUnitSprites(
      sprites,
      new Set(['victoria-rook']),
    );

    expect(removed).toEqual(['obsidian-pawn']);
    expect(deadDestroy).toHaveBeenCalledOnce();
    expect(liveDestroy).not.toHaveBeenCalled();
    expect(sprites.has('obsidian-pawn')).toBe(false);
    expect(sprites.has('victoria-rook')).toBe(true);
  });
});
