import { describe, expect, it } from 'vitest';
import { createWorld, resolveCombatTick, type UnitState, type WorldState } from '../../src/sim';

const unit = (id: string, kind: UnitState['kind'], faction: UnitState['faction'], x: number, y: number): UnitState => ({
  id, kind, faction, position: { x, y },
});

function withCombat(world: WorldState, id: string, patch: Partial<WorldState['combat'][string]>): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, ...patch } } };
}

describe('Phase 2 combat resolution', () => {
  it('gates attacks by Chebyshev range and reloads cooldown after firing', () => {
    let far = createWorld([unit('b', 'bishop', 'victoria', 0, 0), unit('o', 'pawn', 'obsidian', 5, 5)]);
    far = withCombat(far, 'b', { targetId: 'o' });
    const blocked = resolveCombatTick(far);
    expect(blocked.events).toEqual([]);
    expect(blocked.state.combat.o!.health).toBe(60);

    let near = createWorld([unit('b', 'bishop', 'victoria', 0, 0), unit('o', 'pawn', 'obsidian', 4, 4)]);
    near = withCombat(near, 'b', { targetId: 'o' });
    const fired = resolveCombatTick(near);
    expect(fired.events[0]).toMatchObject({ type: 'attack.fired', unitId: 'b', targetId: 'o', damage: 12 });
    expect(fired.state.combat.o!.health).toBe(48);
    expect(fired.state.combat.b!.cooldownTicks).toBe(15);
  });

  it('counts cooldown down and fires when it reaches readiness', () => {
    let world = createWorld([unit('v', 'pawn', 'victoria', 1, 1), unit('o', 'pawn', 'obsidian', 1, 2)]);
    world = withCombat(world, 'v', { targetId: 'o', cooldownTicks: 2 });
    const first = resolveCombatTick(world);
    expect(first.events).toEqual([]);
    expect(first.state.combat.v!.cooldownTicks).toBe(1);
    const second = resolveCombatTick(first.state);
    expect(second.events[0]).toMatchObject({ type: 'attack.fired', unitId: 'v', targetId: 'o' });
    expect(second.state.combat.v!.cooldownTicks).toBe(10);
  });

  it('resolves lethal reciprocal attacks simultaneously', () => {
    let world = createWorld([unit('a', 'pawn', 'victoria', 2, 2), unit('b', 'pawn', 'obsidian', 2, 3)]);
    world = withCombat(world, 'a', { targetId: 'b', health: 8 });
    world = withCombat(world, 'b', { targetId: 'a', health: 8 });
    const result = resolveCombatTick(world);
    expect(result.events.filter((event) => event.type === 'attack.fired')).toHaveLength(2);
    expect(result.events.filter((event) => event.type === 'unit.killed')).toHaveLength(2);
    expect(result.state.units.a).toBeUndefined();
    expect(result.state.units.b).toBeUndefined();
    expect(result.state.combat.a).toBeUndefined();
    expect(result.state.combat.b).toBeUndefined();
    expect(result.state.occupancy['2,2']).toBeUndefined();
    expect(result.state.occupancy['2,3']).toBeUndefined();
  });

  it('aggregates focus fire before applying one deterministic damage result', () => {
    let world = createWorld([
      unit('a', 'pawn', 'victoria', 4, 4),
      unit('b', 'pawn', 'victoria', 5, 4),
      unit('o', 'pawn', 'obsidian', 5, 5),
    ]);
    world = withCombat(world, 'a', { targetId: 'o' });
    world = withCombat(world, 'b', { targetId: 'o' });
    world = withCombat(world, 'o', { health: 15 });
    const result = resolveCombatTick(world);
    expect(result.events.filter((event) => event.type === 'attack.fired')).toHaveLength(2);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'unit.damaged', unitId: 'o', damage: 16, healthBefore: 15, healthAfter: 0 }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'unit.killed', unitId: 'o' }));
    expect(result.state.units.o).toBeUndefined();
  });
});
