import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  canonicalSnapshot,
} from '../../src/sim/replay';

import {
  createWorld,
} from '../../src/sim/world';

import {
  enqueueTacticalOrder,
  type AttackOrder,
  type MoveOrder,
} from '../../src/sim/orders';

import {
  resolveCommittedOrders,
} from '../../src/sim/resolve-orders';

function preparedWorld() {
  let world =
    createWorld([
      {
        id: 'vrogue',
        faction:
          'victoria',
        kind: 'rook',
        position: {
          x: 3,
          y: 3,
        },
      },
      {
        id: 'vpawn',
        faction:
          'victoria',
        kind: 'pawn',
        position: {
          x: 5,
          y: 5,
        },
      },
      {
        id: 'opawn',
        faction:
          'obsidian',
        kind: 'pawn',
        position: {
          x: 3,
          y: 6,
        },
      },
      {
        id: 'vking',
        faction:
          'victoria',
        kind: 'king',
        position: {
          x: 1,
          y: 1,
        },
      },
      {
        id: 'oking',
        faction:
          'obsidian',
        kind: 'king',
        position: {
          x: 14,
          y: 14,
        },
      },
    ]);

  world = {
    ...world,

    turn: {
      ...world.turn,
      round: 3,
      phase:
        'victoria_command',
    },
  };

  const move:
    MoveOrder = {
      orderId:
        'victoria-r3-o0',
      kind: 'move',
      faction:
        'victoria',
      unitId: 'vpawn',
      destination: {
        x: 5,
        y: 6,
      },
      issuedRound: 3,
      commandCost: 1,
    };

  const attack:
    AttackOrder = {
      orderId:
        'victoria-r3-o1',
      kind: 'attack',
      faction:
        'victoria',
      unitId:
        'vrogue',
      targetUnitId:
        'opawn',
      issuedRound: 3,
      commandCost: 1,
    };

  const first =
    enqueueTacticalOrder(
      world,
      move,
    );

  if (
    first.status !==
    'ACCEPTED'
  ) {
    throw new Error(
      first.reason,
    );
  }

  const second =
    enqueueTacticalOrder(
      first.world,
      attack,
    );

  if (
    second.status !==
    'ACCEPTED'
  ) {
    throw new Error(
      second.reason,
    );
  }

  return second.world;
}

function asReplayResult(
  state:
    ReturnType<
      typeof preparedWorld
    >,
) {
  return {
    state,
    eventsByTick: [],
  };
}

describe(
  'Royal Tactical turn replay',
  () => {
    it('includes turn state and pending tactical orders in canonical replay truth', () => {
      const world =
        preparedWorld();

      const parsed =
        JSON.parse(
          canonicalSnapshot(
            asReplayResult(
              world,
            ),
          ),
        );

      expect(
        parsed.state.turn,
      ).toEqual(
        world.turn,
      );

      expect(
        parsed.state
          .pendingOrders,
      ).toEqual(
        world.pendingOrders,
      );
    });

    it('same starting world plus same committed order sequence produces identical world and outcomes', () => {
      const aWorld =
        preparedWorld();

      const bWorld =
        preparedWorld();

      const a =
        resolveCommittedOrders(
          aWorld,
          aWorld.pendingOrders,
        );

      const b =
        resolveCommittedOrders(
          bWorld,
          bWorld.pendingOrders,
        );

      expect(a)
        .toEqual(b);

      expect(
        canonicalSnapshot({
          state: a.world,
          eventsByTick: [
            a.events,
          ],
        }),
      ).toBe(
        canonicalSnapshot({
          state: b.world,
          eventsByTick: [
            b.events,
          ],
        }),
      );
    });

    it('preserves committed pending-order sequence in canonical truth before resolution', () => {
      const world =
        preparedWorld();

      const snapshot =
        JSON.parse(
          canonicalSnapshot(
            asReplayResult(
              world,
            ),
          ),
        );

      expect(
        snapshot.state
          .turn
          .pendingOrderIds,
      ).toEqual([
        'victoria-r3-o0',
        'victoria-r3-o1',
      ]);

      expect(
        snapshot.state
          .pendingOrders
          .map(
            (
              order: {
                orderId:
                  string;
              },
            ) =>
              order.orderId,
          ),
      ).toEqual([
        'victoria-r3-o0',
        'victoria-r3-o1',
      ]);
    });
  },
);
