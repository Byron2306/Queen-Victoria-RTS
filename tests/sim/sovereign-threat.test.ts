import { describe, expect, it } from 'vitest';
import { createWorld, deriveSovereignThreat, type UnitState, type WorldState } from '../../src/sim';

const unit = (id: string, faction: UnitState['faction'], kind: UnitState['kind'], x: number, y: number): UnitState => ({ id, faction, kind, position: { x, y } });
function patchHealth(world: WorldState, id: string, health: number): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, health } } };
}

describe('Phase 3 sovereign threat', () => {
  it('derives sorted RTS attack-capability provenance', () => {
    const world = createWorld([
      unit('vk', 'victoria', 'king', 5, 5),
      unit('z', 'obsidian', 'rook', 5, 9),
      unit('a', 'obsidian', 'bishop', 8, 8),
    ]);
    expect(deriveSovereignThreat(world, 'victoria')).toEqual({ kingId: 'vk', threatened: true, threateningUnitIds: ['a', 'z'] });
  });

  it('ignores out-of-range and dead attackers and handles unbound kings', () => {
    let world = createWorld([
      unit('vk', 'victoria', 'king', 1, 1),
      unit('far', 'obsidian', 'bishop', 10, 10),
      unit('dead', 'obsidian', 'rook', 1, 5),
    ]);
    world = patchHealth(world, 'dead', 0);
    expect(deriveSovereignThreat(world, 'victoria').threatened).toBe(false);
    expect(deriveSovereignThreat(world, 'obsidian')).toEqual({ kingId: null, threatened: false, threateningUnitIds: [] });
  });
});
