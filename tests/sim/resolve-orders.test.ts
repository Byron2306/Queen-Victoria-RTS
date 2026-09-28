import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveCommittedOrders,
} from '../../src/sim/resolve-orders';

import type {
  AttackOrder,
  MoveOrder,
  TacticalOrder,
} from '../../src/sim/orders';

import {
  createWorld,
} from '../../src/sim/world';

import type {
  UnitState,
  WorldState,
} from '../../src/sim/types';

function unit(
  id: string,
  faction: 'victoria' | 'obsidian',
  kind:
    | 'pawn'
    | 'knight'
    | 'bishop'
    | 'rook'
    | 'queen'
    | 'king',
  x: number,
  y: number,
): UnitState {
  return {
    id,
    faction,
    kind,
    position: { x, y },
  };
}

function move(
  orderId: string,
  unitId: string,
  x: number,
  y: number,
): MoveOrder {
  return {
    orderId,
    kind: 'move',
    faction: 'victoria',
    unitId,
    destination: { x, y },
    issuedRound: 1,
    commandCost: 1,
  };
}

function attack(
  orderId: string,
  faction: 'victoria' | 'obsidian',
  unitId: string,
  targetUnitId: string,
): AttackOrder {
  return {
    orderId,
    kind: 'attack',
    faction,
    unitId,
    targetUnitId,
    issuedRound: 1,
    commandCost: 1,
  };
}

function withHealth(
  world: WorldState,
  unitId: string,
  health: number,
): WorldState {
  return {
    ...world,
    combat: {
      ...world.combat,
      [unitId]: {
        ...world.combat[unitId]!,
        health,
      },
    },
  };
}

describe('Royal Tactical deterministic order resolution', () => {
  it('resolves move orders in committed sequence', () => {
    const world = createWorld([
      unit(
        'victoria-rook',
        'victoria',
        'rook',
        1,
        1,
      ),
    ]);

    const result =
      resolveCommittedOrders(
        world,
        [
          move(
            'move-1',
            'victoria-rook',
            1,
            3,
          ),
          move(
            'move-2',
            'victoria-rook',
            1,
            5,
          ),
        ],
      );

    expect(
      result.world.units[
        'victoria-rook'
      ]?.position,
    ).toEqual({
      x: 1,
      y: 5,
    });

    expect(
      result.outcomes.map(
        outcome =>
          outcome.status,
      ),
    ).toEqual([
      'RESOLVED',
      'RESOLVED',
    ]);
  });

  it('refuses a move into an occupied destination', () => {
    const world = createWorld([
      unit(
        'victoria-rook',
        'victoria',
        'rook',
        1,
        1,
      ),
      unit(
        'victoria-pawn',
        'victoria',
        'pawn',
        1,
        3,
      ),
    ]);

    const result =
      resolveCommittedOrders(
        world,
        [
          move(
            'blocked',
            'victoria-rook',
            1,
            3,
          ),
        ],
      );

    expect(
      result.outcomes[0],
    ).toMatchObject({
      orderId: 'blocked',
      status: 'REFUSED',
    });

    expect(
      result.world.units[
        'victoria-rook'
      ]?.position,
    ).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('skips an order for a unit killed earlier in the same sequence', () => {
    let world = createWorld([
      unit(
        'victoria-rook',
        'victoria',
        'rook',
        1,
        1,
      ),
      unit(
        'obsidian-pawn',
        'obsidian',
        'pawn',
        1,
        2,
      ),
    ]);

    world = withHealth(
      world,
      'obsidian-pawn',
      1,
    );

    const orders:
      readonly TacticalOrder[] = [
        attack(
          'kill',
          'victoria',
          'victoria-rook',
          'obsidian-pawn',
        ),
        {
          ...move(
            'dead-move',
            'obsidian-pawn',
            1,
            4,
          ),
          faction: 'obsidian',
        },
      ];

    const result =
      resolveCommittedOrders(
        world,
        orders,
      );

    expect(
      result.outcomes[0]?.status,
    ).toBe('RESOLVED');

    expect(
      result.outcomes[1],
    ).toMatchObject({
      orderId: 'dead-move',
      status: 'SKIPPED',
    });

    expect(
      result.world.units[
        'obsidian-pawn'
      ],
    ).toBeUndefined();
  });

  it('is deterministic for identical start state and order sequence', () => {
    const world = createWorld([
      unit(
        'victoria-rook',
        'victoria',
        'rook',
        1,
        1,
      ),
    ]);

    const orders = [
      move(
        'move-1',
        'victoria-rook',
        1,
        3,
      ),
    ];

    const first =
      resolveCommittedOrders(
        world,
        orders,
      );

    const second =
      resolveCommittedOrders(
        world,
        orders,
      );

    expect(second)
      .toEqual(first);
  });

  it('stops later strategic mutation after sovereign defeat', () => {
    let world = createWorld([
      unit(
        'victoria-rook',
        'victoria',
        'rook',
        5,
        5,
      ),
      unit(
        'obsidian-king',
        'obsidian',
        'king',
        5,
        6,
      ),
      unit(
        'victoria-pawn',
        'victoria',
        'pawn',
        2,
        2,
      ),
    ]);

    world = withHealth(
      world,
      'obsidian-king',
      1,
    );

    const result =
      resolveCommittedOrders(
        world,
        [
          attack(
            'king-kill',
            'victoria',
            'victoria-rook',
            'obsidian-king',
          ),
          move(
            'after-victory',
            'victoria-pawn',
            2,
            3,
          ),
        ],
      );

    expect(
      result.world.match.status,
    ).toBe('victoria_won');

    expect(
      result.outcomes[0]?.status,
    ).toBe('RESOLVED');

    expect(
      result.outcomes[1],
    ).toMatchObject({
      orderId:
        'after-victory',
      status:
        'INTERRUPTED',
    });

    expect(
      result.world.units[
        'victoria-pawn'
      ]?.position,
    ).toEqual({
      x: 2,
      y: 2,
    });
  });
});
