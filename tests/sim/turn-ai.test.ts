import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  planShadowTurn,
} from '../../src/sim/ai';

import {
  canUnitAttackTarget,
} from '../../src/sim/combat';

import {
  validateMoveGeometry,
} from '../../src/sim/geometry';

import {
  createWorld,
} from '../../src/sim/world';

import type {
  TacticalOrder,
} from '../../src/sim/orders';

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

function shadowWorld(
  units: readonly UnitState[],
): WorldState {
  const world =
    createWorld(
      units,
      {
        aiFactions: [
          'obsidian',
        ],
      },
    );

  return {
    ...world,

    turn: {
      ...world.turn,
      phase:
        'shadow_command',
    },
  };
}

function expectOrderLegal(
  world: WorldState,
  order: TacticalOrder,
): void {
  expect(order.faction)
    .toBe('obsidian');

  expect(order.issuedRound)
    .toBe(world.turn.round);

  expect(order.commandCost)
    .toBeGreaterThan(0);

  if (
    order.kind === 'move'
  ) {
    const actor =
      world.units[
        order.unitId
      ];

    expect(actor)
      .toBeDefined();

    expect(actor?.faction)
      .toBe('obsidian');

    expect(
      world.occupancy[
        `${order.destination.x},${order.destination.y}`
      ],
    ).toBeUndefined();

    expect(
      validateMoveGeometry(
        world,
        actor!,
        order.destination,
      ).legal,
    ).toBe(true);
  }

  if (
    order.kind === 'attack'
  ) {
    expect(
      canUnitAttackTarget(
        world,
        order.unitId,
        order.targetUnitId,
      ),
    ).toBe(true);
  }

  if (
    order.kind === 'guard'
  ) {
    expect(
      world.units[
        order.unitId
      ]?.faction,
    ).toBe('obsidian');
  }

  if (
    order.kind === 'ability'
  ) {
    expect(
      world.units[
        order.unitId
      ]?.faction,
    ).toBe('obsidian');
  }
}

describe('Royal Tactical Shadow turn planner', () => {
  it('returns at most four Obsidian tactical orders', () => {
    const world =
      shadowWorld([
        unit(
          'oking',
          'obsidian',
          'king',
          14,
          14,
        ),
        unit(
          'orook',
          'obsidian',
          'rook',
          10,
          10,
        ),
        unit(
          'oknight',
          'obsidian',
          'knight',
          11,
          10,
        ),
        unit(
          'obishop',
          'obsidian',
          'bishop',
          12,
          10,
        ),
        unit(
          'opawn',
          'obsidian',
          'pawn',
          13,
          10,
        ),
        unit(
          'vking',
          'victoria',
          'king',
          2,
          2,
        ),
        unit(
          'vrook',
          'victoria',
          'rook',
          8,
          8,
        ),
      ]);

    const orders =
      planShadowTurn(
        world,
      );

    expect(orders.length)
      .toBeLessThanOrEqual(4);

    expect(
      orders.every(
        order =>
          order.faction ===
          'obsidian',
      ),
    ).toBe(true);
  });

  it('does not mutate the supplied world', () => {
    const world =
      shadowWorld([
        unit(
          'oking',
          'obsidian',
          'king',
          14,
          14,
        ),
        unit(
          'orook',
          'obsidian',
          'rook',
          8,
          8,
        ),
        unit(
          'vking',
          'victoria',
          'king',
          2,
          2,
        ),
      ]);

    const before =
      JSON.stringify(world);

    planShadowTurn(world);

    expect(
      JSON.stringify(world),
    ).toBe(before);
  });

  it('is deterministic for identical world state', () => {
    const world =
      shadowWorld([
        unit(
          'oking',
          'obsidian',
          'king',
          14,
          14,
        ),
        unit(
          'orook',
          'obsidian',
          'rook',
          8,
          8,
        ),
        unit(
          'opawn',
          'obsidian',
          'pawn',
          10,
          10,
        ),
        unit(
          'vking',
          'victoria',
          'king',
          2,
          2,
        ),
        unit(
          'vpawn',
          'victoria',
          'pawn',
          7,
          7,
        ),
      ]);

    expect(
      planShadowTurn(world),
    ).toEqual(
      planShadowTurn(world),
    );
  });

  it('returns only legal tactical orders for the supplied snapshot', () => {
    const world =
      shadowWorld([
        unit(
          'oking',
          'obsidian',
          'king',
          14,
          14,
        ),
        unit(
          'orook',
          'obsidian',
          'rook',
          7,
          7,
        ),
        unit(
          'oknight',
          'obsidian',
          'knight',
          9,
          8,
        ),
        unit(
          'vking',
          'victoria',
          'king',
          2,
          2,
        ),
        unit(
          'vpawn',
          'victoria',
          'pawn',
          7,
          9,
        ),
      ]);

    for (
      const order of
      planShadowTurn(world)
    ) {
      expectOrderLegal(
        world,
        order,
      );
    }
  });

  it('prioritizes sovereign survival when the Shadow King is threatened', () => {
    let world =
      shadowWorld([
        unit(
          'oking',
          'obsidian',
          'king',
          14,
          14,
        ),
        unit(
          'orook',
          'obsidian',
          'rook',
          14,
          12,
        ),
        unit(
          'vthreat',
          'victoria',
          'rook',
          14,
          10,
        ),
        unit(
          'vking',
          'victoria',
          'king',
          2,
          2,
        ),
      ]);

    world = {
      ...world,

      match: {
        ...world.match,

        sovereigns: {
          ...world.match
            .sovereigns,

          obsidian: {
            ...world.match
              .sovereigns
              .obsidian,
            threatened: true,
            threateningUnitIds: [
              'vthreat',
            ],
          },
        },
      },
    };

    const orders =
      planShadowTurn(
        world,
      );

    expect(
      orders.length,
    ).toBeGreaterThan(0);

    expect(
      orders[0],
    ).toMatchObject({
      kind: 'attack',
      faction:
        'obsidian',
      unitId:
        'orook',
      targetUnitId:
        'vthreat',
    });
  });
});
