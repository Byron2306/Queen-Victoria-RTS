import { describe, expect, it } from 'vitest';
import { createWorld, type UnitState } from '../../src/sim';

const king = (id: string, faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, faction, kind: 'king', position: { x, y },
});

describe('Phase 3 sovereign state', () => {
  it('binds both sovereign Kings and starts active', () => {
    const world = createWorld([king('vk', 'victoria', 1, 1), king('ok', 'obsidian', 14, 14)]);
    expect(world.match.status).toBe('active');
    expect(world.match.sovereigns.victoria.kingId).toBe('vk');
    expect(world.match.sovereigns.obsidian.kingId).toBe('ok');
  });

  it('keeps missing sovereigns explicitly unbound without inventing defeat', () => {
    const world = createWorld([king('vk', 'victoria', 1, 1)]);
    expect(world.match.status).toBe('active');
    expect(world.match.victor).toBeNull();
    expect(world.match.sovereigns.obsidian.kingId).toBeNull();
  });
});
