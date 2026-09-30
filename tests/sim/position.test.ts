import { describe, expect, it } from 'vitest';
import {
  createWorld,
  evaluatePositionalAttack,
  OutOfBoundsError,
  resolveCombatTick,
  type UnitState,
  type WorldState,
} from '../../src/sim';

const unit = (id: string, kind: UnitState['kind'], faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, kind, faction, position: { x, y },
});

function target(world: WorldState, attackerId: string, targetId: string): WorldState {
  return { ...world, combat: { ...world.combat, [attackerId]: { ...world.combat[attackerId]!, targetId } } };
}

describe('Phase 2 positional attack bonuses', () => {
  it('uses the canonical 32x32 world bounds', () => {
    const world = createWorld([
      unit('edge', 'rook', 'victoria', 31, 15),
    ]);

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
    expect(world.units.edge?.position).toEqual({ x: 31, y: 15 });
    expect(() => createWorld([
      unit('outside', 'rook', 'victoria', 32, 15),
    ])).toThrow(OutOfBoundsError);
  });

  it('recognises a protected Pawn chain', () => {
    const world = createWorld([
      unit('p', 'pawn', 'victoria', 15, 15),
      unit('support', 'pawn', 'victoria', 14, 14),
      unit('enemy', 'pawn', 'obsidian', 16, 16),
    ]);
    expect(evaluatePositionalAttack(world, 'p', 'enemy')).toEqual({ multiplierBps: 12500, tags: ['pawn_chain'] });
  });

  it('recognises a Knight fork against at least two living enemies', () => {
    const world = createWorld([
      unit('n', 'knight', 'victoria', 15, 15),
      unit('e1', 'pawn', 'obsidian', 17, 16),
      unit('e2', 'pawn', 'obsidian', 13, 16),
    ]);
    expect(evaluatePositionalAttack(world, 'n', 'e1')).toEqual({ multiplierBps: 12500, tags: ['knight_fork'] });
  });

  it('recognises an unobstructed Bishop line and rejects a blocked one', () => {
    const bishop = unit('b', 'bishop', 'victoria', 13, 13);
    const enemy = unit('enemy', 'pawn', 'obsidian', 16, 16);
    const open = createWorld([bishop, enemy]);
    expect(evaluatePositionalAttack(open, 'b', 'enemy')).toEqual({ multiplierBps: 12500, tags: ['bishop_line'] });

    const blocked = createWorld([bishop, enemy, unit('block', 'pawn', 'victoria', 14, 14)]);
    expect(evaluatePositionalAttack(blocked, 'b', 'enemy')).toEqual({ multiplierBps: 10000, tags: [] });
  });

  it('recognises an open Rook rank/file', () => {
    const world = createWorld([
      unit('r', 'rook', 'victoria', 0, 15),
      unit('enemy', 'pawn', 'obsidian', 0, 17),
    ]);
    expect(evaluatePositionalAttack(world, 'r', 'enemy')).toEqual({ multiplierBps: 12500, tags: ['rook_open_file'] });
  });

  it('applies one non-stacking 25 percent multiplier to combat damage', () => {
    let world = createWorld([
      unit('r', 'rook', 'victoria', 0, 15),
      unit('enemy', 'pawn', 'obsidian', 0, 17),
    ]);
    world = target(world, 'r', 'enemy');
    const result = resolveCombatTick(world);
    expect(result.events[0]).toMatchObject({ type: 'attack.fired', unitId: 'r', targetId: 'enemy', damage: 22 });
    expect(result.state.combat.enemy!.health).toBe(38);
  });
});
