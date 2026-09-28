import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  cancelTacticalOrder,
  enqueueTacticalOrder,
  pendingOrdersForFaction,
  type MoveOrder,
} from '../../src/sim/orders';

import {
  createWorld,
} from '../../src/sim/world';

function moveOrder(
  orderId: string,
  faction:
    'victoria' | 'obsidian',
): MoveOrder {
  return {
    orderId,
    kind: 'move',
    faction,
    unitId:
      `${faction}-pawn-a`,
    destination: {
      x: 4,
      y: 4,
    },
    issuedRound: 1,
    commandCost: 1,
  };
}

describe('Royal Tactical pending orders', () => {
  it('accepts an order and consumes one Royal Command without mutating board state', () => {
    const world =
      createWorld();

    const beforeUnits =
      world.units;

    const result =
      enqueueTacticalOrder(
        world,
        moveOrder(
          'order-1',
          'victoria',
        ),
      );

    expect(result.status)
      .toBe('ACCEPTED');

    if (
      result.status !==
      'ACCEPTED'
    ) {
      throw new Error(
        'expected accepted order',
      );
    }

    expect(
      result.world
        .turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(3);

    expect(
      result.world
        .turn
        .pendingOrderIds,
    ).toEqual([
      'order-1',
    ]);

    expect(
      pendingOrdersForFaction(
        result.world,
        'victoria',
      ).map(
        order => order.orderId,
      ),
    ).toEqual([
      'order-1',
    ]);

    expect(
      result.world.units,
    ).toEqual(beforeUnits);
  });

  it('accepts four one-command orders and refuses the fifth without going negative', () => {
    let world =
      createWorld();

    for (
      let index = 1;
      index <= 4;
      index += 1
    ) {
      const result =
        enqueueTacticalOrder(
          world,
          moveOrder(
            `order-${index}`,
            'victoria',
          ),
        );

      expect(result.status)
        .toBe('ACCEPTED');

      if (
        result.status !==
        'ACCEPTED'
      ) {
        throw new Error(
          'expected accepted order',
        );
      }

      world =
        result.world;
    }

    expect(
      world.turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(0);

    const fifth =
      enqueueTacticalOrder(
        world,
        moveOrder(
          'order-5',
          'victoria',
        ),
      );

    expect(fifth.status)
      .toBe('REFUSED');

    expect(
      fifth.world
        .turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(0);

    expect(
      fifth.world
        .turn
        .pendingOrderIds,
    ).toEqual([
      'order-1',
      'order-2',
      'order-3',
      'order-4',
    ]);
  });

  it('preserves queue order', () => {
    let world =
      createWorld();

    for (
      const id of [
        'alpha',
        'beta',
        'gamma',
      ]
    ) {
      const result =
        enqueueTacticalOrder(
          world,
          moveOrder(
            id,
            'victoria',
          ),
        );

      if (
        result.status !==
        'ACCEPTED'
      ) {
        throw new Error(
          'expected accepted order',
        );
      }

      world =
        result.world;
    }

    expect(
      pendingOrdersForFaction(
        world,
        'victoria',
      ).map(
        order => order.orderId,
      ),
    ).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('cancel restores command budget and removes the pending order', () => {
    const accepted =
      enqueueTacticalOrder(
        createWorld(),
        moveOrder(
          'order-1',
          'victoria',
        ),
      );

    if (
      accepted.status !==
      'ACCEPTED'
    ) {
      throw new Error(
        'expected accepted order',
      );
    }

    const cancelled =
      cancelTacticalOrder(
        accepted.world,
        'order-1',
      );

    expect(cancelled.status)
      .toBe('ACCEPTED');

    if (
      cancelled.status !==
      'ACCEPTED'
    ) {
      throw new Error(
        'expected cancelled order',
      );
    }

    expect(
      cancelled.world
        .turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(4);

    expect(
      cancelled.world
        .turn
        .pendingOrderIds,
    ).toEqual([]);

    expect(
      pendingOrdersForFaction(
        cancelled.world,
        'victoria',
      ),
    ).toEqual([]);
  });

  it('refuses the wrong faction during Victoria command phase without consuming budget', () => {
    const world =
      createWorld();

    const result =
      enqueueTacticalOrder(
        world,
        moveOrder(
          'shadow-order',
          'obsidian',
        ),
      );

    expect(result.status)
      .toBe('REFUSED');

    expect(
      result.world
        .turn
        .royalCommandsRemaining,
    ).toEqual({
      victoria: 4,
      obsidian: 4,
    });

    expect(
      result.world
        .turn
        .pendingOrderIds,
    ).toEqual([]);
  });

  it('refuses duplicate order ids without consuming another command', () => {
    const first =
      enqueueTacticalOrder(
        createWorld(),
        moveOrder(
          'duplicate',
          'victoria',
        ),
      );

    if (
      first.status !==
      'ACCEPTED'
    ) {
      throw new Error(
        'expected accepted order',
      );
    }

    const duplicate =
      enqueueTacticalOrder(
        first.world,
        moveOrder(
          'duplicate',
          'victoria',
        ),
      );

    expect(duplicate.status)
      .toBe('REFUSED');

    expect(
      duplicate.world
        .turn
        .royalCommandsRemaining
        .victoria,
    ).toBe(3);

    expect(
      duplicate.world
        .turn
        .pendingOrderIds,
    ).toEqual([
      'duplicate',
    ]);
  });
});
