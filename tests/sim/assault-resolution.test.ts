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

  it('lets a knight Assault along its legal chess landing geometry even beyond its real-time attack radius', () => {
    const world = createWorld([
      { id: 'knight', faction: 'victoria', kind: 'knight', position: { x: 5, y: 5 } },
      { id: 'pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 6 } },
    ]);
    const lethal = {
      ...world,
      combat: {
        ...world.combat,
        pawn: { ...world.combat.pawn!, health: 1 },
      },
    };
    const order: AssaultOrder = {
      orderId: 'knight-assault',
      kind: 'assault',
      faction: 'victoria',
      unitId: 'knight',
      targetUnitId: 'pawn',
      issuedRound: 1,
      commandCost: 1,
    };

    const result = resolveCommittedOrders(lethal, [order]);

    expect(result.outcomes[0]).toMatchObject({ status: 'RESOLVED' });
    expect(result.world.units.knight?.position).toEqual({ x: 7, y: 6 });
    expect(result.world.units.pawn).toBeUndefined();
  });
});
