import { describe, expect, it } from 'vitest';
import {
  buildThreatMap, canonicalSnapshot, createWorld, resolveCombatTick, runReplay,
  type AttackCommand, type MoveCommand, type UnitState, type WorldState,
} from '../../src/sim';

const unit = (id: string, kind: UnitState['kind'], faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, kind, faction, position: { x, y },
});
const move = (sequence: number, unitId: string, x: number, y: number, issuedTick = 0): MoveCommand => ({
  type: 'move', sequence, issuedTick, unitId, to: { x, y },
});
const attack = (sequence: number, unitId: string, targetId: string, issuedTick = 0): AttackCommand => ({
  type: 'attack', sequence, issuedTick, unitId, targetId,
});

function patchCombat(world: WorldState, id: string, patch: Partial<WorldState['combat'][string]>): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, ...patch } } };
}

describe('Phase 2 acceptance replay', () => {
  it('is byte-equivalent across movement, Guard, explicit targeting, positional damage and death', () => {
    let initial = createWorld([
      unit('r', 'rook', 'victoria', 0, 0),
      unit('victim', 'pawn', 'obsidian', 0, 2),
      unit('p', 'pawn', 'victoria', 5, 5),
      unit('remote', 'pawn', 'obsidian', 10, 10),
    ]);
    initial = patchCombat(initial, 'victim', { health: 22 });

    const frames = [
      [move(1, 'p', 5, 6), attack(2, 'p', 'remote')],
      [],
      [],
      [],
    ] as const;

    const first = runReplay(initial, frames);
    const second = runReplay(initial, frames);
    expect(canonicalSnapshot(first)).toBe(canonicalSnapshot(second));
    expect(first.state.tick).toBe(4);
    expect(first.state.units.victim).toBeUndefined();
    expect(first.state.occupancy['0,2']).toBeUndefined();
    expect(first.state.combat.victim).toBeUndefined();
    expect(first.state.units.p!.position).toEqual({ x: 5, y: 6 });
    expect(first.eventsByTick.flat()).toContainEqual(expect.objectContaining({
      type: 'attack.fired', unitId: 'r', targetId: 'victim', damage: 22,
    }));
    expect(first.eventsByTick.flat()).toContainEqual(expect.objectContaining({
      type: 'unit.killed', unitId: 'victim',
    }));
    expect(first.eventsByTick.flat()).toContainEqual(expect.objectContaining({
      type: 'attack.order.accepted', unitId: 'p', targetId: 'remote',
    }));
  });

  it('does not mutate Phase 1 threat maps when combat changes health but not board occupancy', () => {
    let world = createWorld([
      unit('b', 'bishop', 'victoria', 2, 2),
      unit('enemy', 'pawn', 'obsidian', 5, 5),
      unit('other', 'rook', 'victoria', 8, 8),
    ]);
    world = patchCombat(world, 'b', { targetId: 'enemy' });

    const victoriaBefore = buildThreatMap(world, 'victoria');
    const obsidianBefore = buildThreatMap(world, 'obsidian');
    const resolved = resolveCombatTick(world);

    expect(resolved.state.combat.enemy!.health).toBeLessThan(world.combat.enemy!.health);
    expect(resolved.state.units.enemy).toBeDefined();
    expect(buildThreatMap(resolved.state, 'victoria')).toEqual(victoriaBefore);
    expect(buildThreatMap(resolved.state, 'obsidian')).toEqual(obsidianBefore);
  });
});
