import { describe, expect, it } from 'vitest';
import {
  aiFrontObjective,
  pawnIsPromotionEligible,
} from '../../src/sim/ai';
import { createWorld } from '../../src/sim/world';

describe('Triptych V2 AI directional semantics', () => {
  it('uses playable west/east minor nodes as reinforce-front objectives', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });

    expect(aiFrontObjective(world, 'victoria')).toEqual({ x: 13, y: 15 });
    expect(aiFrontObjective(world, 'obsidian')).toEqual({ x: 18, y: 16 });
  });

  it('promotes V2 pawns by east/west penetration instead of retired y ranks', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });

    expect(pawnIsPromotionEligible(world, 'victoria', { x: 30, y: 16 })).toBe(true);
    expect(pawnIsPromotionEligible(world, 'victoria', { x: 6, y: 30 })).toBe(false);
    expect(pawnIsPromotionEligible(world, 'obsidian', { x: 1, y: 15 })).toBe(true);
    expect(pawnIsPromotionEligible(world, 'obsidian', { x: 25, y: 1 })).toBe(false);
  });

  it('keeps legacy V1 promotion ranks unchanged during migration', () => {
    const world = createWorld();

    expect(pawnIsPromotionEligible(world, 'victoria', { x: 7, y: 14 })).toBe(true);
    expect(pawnIsPromotionEligible(world, 'obsidian', { x: 7, y: 1 })).toBe(true);
  });
});
