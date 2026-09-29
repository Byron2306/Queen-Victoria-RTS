import { describe, expect, it } from 'vitest';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import type { AssaultOrder, AttackOrder } from '../../src/sim/orders';
import { createWorld } from '../../src/sim/world';

const attack = (kind: 'attack' | 'assault'): AttackOrder | AssaultOrder => ({
  orderId: `${kind}-1`,
  kind,
  faction: 'victoria',
  unitId: 'rook',
  targetUnitId: 'pawn',
  issuedRound: 1,
  commandCost: 1,
});

function combatWorld(targetHealth: number) {
  const world = createWorld([
    { id: 'rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    { id: 'pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 8 } },
  ]);
  return {
    ...world,
    combat: {
      ...world.combat,
      pawn: { ...world.combat.pawn!, health: targetHealth },
    },
  };
}

describe('Attack versus Assault resolution', () => {
  it('lethal Attack removes the defender but never moves the attacker', () => {
    const result = resolveCommittedOrders(combatWorld(1), [attack('attack')]);

    expect(result.world.units.rook?.position).toEqual({ x: 7, y: 7 });
    expect(result.world.units.pawn).toBeUndefined();
    expect(result.world.occupancy['7,8']).toBeUndefined();
  });

  it('a surviving defender bounces an Assault back to the origin', () => {
    const result = resolveCommittedOrders(combatWorld(60), [attack('assault')]);

    expect(result.world.units.rook?.position).toEqual({ x: 7, y: 7 });
    expect(result.world.units.pawn).toBeDefined();
  });

  it('a lethal legal Assault advances into the defeated defender tile', () => {
    const result = resolveCommittedOrders(combatWorld(1), [attack('assault')]);

    expect(result.world.units.rook?.position).toEqual({ x: 7, y: 8 });
    expect(result.world.units.pawn).toBeUndefined();
    expect(result.world.occupancy['7,8']).toBe('rook');
    expect(result.world.occupancy['7,7']).toBeUndefined();
  });
});
