import { describe, expect, it } from 'vitest';
import { acquireGuardTarget, createWorld, refreshGuardTargets, type UnitState, type WorldState } from '../../src/sim';

const unit = (id: string, faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, faction, kind: 'pawn', position: { x, y },
});

function patchCombat(world: WorldState, id: string, patch: Partial<WorldState['combat'][string]>): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, ...patch } } };
}

describe('Phase 2 Guard targeting', () => {
  it('acquires the nearest living enemy and breaks equal-distance ties by id', () => {
    const world = createWorld([
      unit('v', 'victoria', 5, 5),
      unit('z-enemy', 'obsidian', 6, 6),
      unit('a-enemy', 'obsidian', 4, 4),
      unit('friend', 'victoria', 5, 6),
    ]);
    expect(acquireGuardTarget(world, 'v')).toBe('a-enemy');
  });

  it('ignores dead enemies while acquiring', () => {
    let world = createWorld([
      unit('v', 'victoria', 5, 5),
      unit('dead', 'obsidian', 5, 6),
      unit('live', 'obsidian', 7, 5),
    ]);
    world = patchCombat(world, 'dead', { health: 0 });
    expect(acquireGuardTarget(world, 'v')).toBe('live');
  });

  it('retains a target inside the pursuit envelope and clears one beyond it', () => {
    let nearWorld = createWorld([
      unit('v', 'victoria', 3, 3),
      unit('near', 'obsidian', 6, 6),
    ]);
    nearWorld = patchCombat(nearWorld, 'v', { guardAnchor: { x: 0, y: 0 }, targetId: 'near' });
    expect(refreshGuardTargets(nearWorld).combat.v!.targetId).toBe('near');

    let farWorld = createWorld([
      unit('v', 'victoria', 3, 3),
      unit('far', 'obsidian', 8, 8),
    ]);
    farWorld = patchCombat(farWorld, 'v', { guardAnchor: { x: 0, y: 0 }, targetId: 'far' });
    expect(refreshGuardTargets(farWorld).combat.v!.targetId).toBeNull();
  });

  it('refreshes all Guard targets deterministically', () => {
    const world = createWorld([
      unit('b', 'victoria', 10, 10),
      unit('a', 'victoria', 1, 1),
      unit('enemy-b', 'obsidian', 9, 10),
      unit('enemy-a', 'obsidian', 2, 1),
    ]);
    const refreshed = refreshGuardTargets(world);
    expect(refreshed.combat.a!.targetId).toBe('enemy-a');
    expect(refreshed.combat.b!.targetId).toBe('enemy-b');
  });
});
