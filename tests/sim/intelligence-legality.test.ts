import { describe, expect, it } from 'vitest';

import { refreshFactionIntelligence, getTileMemory } from '../../src/sim/intelligence';
import { validateMoveKnowledge, targetIsObserved } from '../../src/sim/knowledge-legality';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { createWorld } from '../../src/sim/world';
import type { AssaultOrder, AttackOrder, MoveOrder } from '../../src/sim/orders';
import type { UnitState, WorldState } from '../../src/sim/types';

function unit(
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState {
  return { id, faction, kind, position: { x, y } };
}

function move(unitId: string, x: number, y: number): MoveOrder {
  return {
    orderId: `move-${unitId}-${x}-${y}`,
    kind: 'move',
    faction: 'victoria',
    unitId,
    destination: { x, y },
    issuedRound: 1,
    commandCost: 1,
  };
}

function attack(kind: 'attack' | 'assault', targetUnitId: string): AttackOrder | AssaultOrder {
  return {
    orderId: `${kind}-enemy`,
    kind,
    faction: 'victoria',
    unitId: 'victoria-queen',
    targetUnitId,
    issuedRound: 1,
    commandCost: 1,
  } as AttackOrder | AssaultOrder;
}

function reposition(
  world: WorldState,
  unitId: string,
  x: number,
  y: number,
): WorldState {
  const actor = world.units[unitId]!;
  const occupancy = { ...world.occupancy };
  delete occupancy[`${actor.position.x},${actor.position.y}`];
  occupancy[`${x},${y}`] = unitId;
  return {
    ...world,
    units: { ...world.units, [unitId]: { ...actor, position: { x, y } } },
    occupancy,
    combat: {
      ...world.combat,
      [unitId]: { ...world.combat[unitId]!, guardAnchor: { x, y } },
    },
  };
}

describe('knowledge-bounded movement', () => {
  it('rejects an unknown destination but allows the same destination once remembered', () => {
    let world = createWorld([
      unit('victoria-rook', 'victoria', 'rook', 7, 7),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(validateMoveKnowledge(world, 'victoria', { x: 7, y: 7 }, { x: 7, y: 11 }, 'rook'))
      .toEqual({ legal: false, reason: 'unknown_destination' });

    world = reposition(world, 'victoria-rook', 7, 8);
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', { x: 7, y: 11 }).visibility).toBe('observed');

    world = reposition(world, 'victoria-rook', 7, 7);
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', { x: 7, y: 11 }).visibility).toBe('remembered');
    expect(validateMoveKnowledge(world, 'victoria', { x: 7, y: 7 }, { x: 7, y: 11 }, 'rook'))
      .toEqual({ legal: true });
  });

  it('rejects a sliding move through an unknown required path cell', () => {
    let world = createWorld([
      unit('victoria-rook', 'victoria', 'rook', 7, 7),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    const intelligence = world.intelligence.byFaction.victoria;
    world = {
      ...world,
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...intelligence,
            '7,9': {
              visibility: 'unknown',
              lastSeenRound: null,
              lastKnownPolarity: null,
              lastKnownControl: null,
              lastKnownUnitId: null,
              lastKnownFortificationId: null,
              lastKnownBannerId: null,
            },
            '7,11': {
              ...intelligence['7,10']!,
              visibility: 'remembered',
            },
          },
        },
      },
    };

    expect(validateMoveKnowledge(world, 'victoria', { x: 7, y: 7 }, { x: 7, y: 11 }, 'rook'))
      .toEqual({ legal: false, reason: 'unknown_path' });
  });

  it('queen_cannot_leeeeroooy_through_unknown_territory', () => {
    let world = createWorld([
      unit('victoria-queen', 'victoria', 'queen', 7, 7),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    const result = resolveCommittedOrders(world, [move('victoria-queen', 7, 12)]);

    expect(result.outcomes[0]).toEqual({
      orderId: 'move-victoria-queen-7-12',
      status: 'REFUSED',
      reason: 'unknown_destination',
    });
    expect(result.world.units['victoria-queen']!.position).toEqual({ x: 7, y: 7 });
  });

  it('lets a knight use an observed L-hop window without knowing intervening cells', () => {
    let world = createWorld([
      unit('victoria-knight', 'victoria', 'knight', 7, 7),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(getTileMemory(world, 'victoria', { x: 8, y: 7 }).visibility).toBe('unknown');
    expect(getTileMemory(world, 'victoria', { x: 9, y: 8 }).visibility).toBe('observed');
    expect(validateMoveKnowledge(world, 'victoria', { x: 7, y: 7 }, { x: 9, y: 8 }, 'knight'))
      .toEqual({ legal: true });
  });
});

describe('knowledge-bounded targeting', () => {
  it('allows observed targets and refuses the same real enemy once it becomes unobserved', () => {
    let world = createWorld([
      unit('victoria-queen', 'victoria', 'queen', 7, 7),
      unit('enemy', 'obsidian', 'pawn', 7, 10),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(targetIsObserved(world, 'victoria', 'enemy')).toBe(true);
    expect(resolveCommittedOrders(world, [attack('attack', 'enemy')]).outcomes[0]?.status)
      .toBe('RESOLVED');

    world = reposition(world, 'enemy', 7, 12);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(targetIsObserved(world, 'victoria', 'enemy')).toBe(false);
    expect(resolveCommittedOrders(world, [attack('attack', 'enemy')]).outcomes[0])
      .toMatchObject({ status: 'REFUSED', reason: 'target_not_observed' });
    expect(resolveCommittedOrders(world, [attack('assault', 'enemy')]).outcomes[0])
      .toMatchObject({ status: 'REFUSED', reason: 'target_not_observed' });
  });
});
