import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type AttackCommand, type UnitState } from '../../src/sim';

const unit = (id: string, faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, faction, kind: 'pawn', position: { x, y },
});
const attack = (sequence: number, unitId: string, targetId: string): AttackCommand => ({
  type: 'attack', sequence, issuedTick: 0, unitId, targetId,
});

describe('Phase 2 explicit attack orders', () => {
  it('accepts an enemy target without applying damage during command validation', () => {
    const world = createWorld([unit('v', 'victoria', 1, 1), unit('o', 'obsidian', 1, 2)]);
    const result = stepWorld(world, [attack(1, 'v', 'o')]);
    expect(result.events[0]).toMatchObject({ type: 'attack.order.accepted', unitId: 'v', targetId: 'o' });
    expect(result.state.combat.v!.targetId).toBe('o');
    expect(result.state.combat.o!.health).toBe(60);
  });

  it.each([
    ['missing', 'ghost', 'missing_target'],
    ['self', 'v', 'self_target'],
    ['friendly', 'friend', 'friendly_target'],
  ] as const)('rejects %s targets deterministically', (_label, targetId, reason) => {
    const world = createWorld([
      unit('v', 'victoria', 1, 1),
      unit('friend', 'victoria', 2, 1),
      unit('o', 'obsidian', 1, 2),
    ]);
    const result = stepWorld(world, [attack(1, 'v', targetId)]);
    expect(result.events[0]).toMatchObject({ type: 'attack.order.rejected', unitId: 'v', targetId, reason });
    expect(result.state.combat.v!.targetId).toBeNull();
  });

  it('rejects an already-dead target and a missing attacker', () => {
    const base = createWorld([unit('v', 'victoria', 1, 1), unit('o', 'obsidian', 1, 2)]);
    const deadWorld = { ...base, combat: { ...base.combat, o: { ...base.combat.o!, health: 0 } } };
    const result = stepWorld(deadWorld, [attack(1, 'v', 'o'), attack(2, 'ghost', 'o')]);
    expect(result.events).toMatchObject([
      { type: 'attack.order.rejected', reason: 'dead_target' },
      { type: 'attack.order.rejected', reason: 'missing_unit' },
    ]);
    expect(result.state.combat.v!.targetId).toBeNull();
  });
});
