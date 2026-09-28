import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  loadGame,
  saveGame,
  SAVE_KEY,
  SAVE_VERSION,
  type StorageLike,
} from '../../src/client/persistence/save-game';

import {
  createWorld,
} from '../../src/sim/world';

import {
  enqueueTacticalOrder,
  type MoveOrder,
  type GuardOrder,
} from '../../src/sim/orders';

class MemoryStorage
  implements StorageLike {
  private readonly data =
    new Map<string, string>();

  getItem(
    key: string,
  ): string | null {
    return this.data.get(key)
      ?? null;
  }

  setItem(
    key: string,
    value: string,
  ): void {
    this.data.set(
      key,
      value,
    );
  }

  removeItem(
    key: string,
  ): void {
    this.data.delete(key);
  }
}

function roundThreeWorld() {
  let world =
    createWorld([
      {
        id: 'vpawn',
        faction:
          'victoria',
        kind: 'pawn',
        position: {
          x: 2,
          y: 2,
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
      royalCommandsRemaining: {
        victoria: 4,
        obsidian: 2,
      },
    },

    economy: {
      crownPower: {
        victoria: 7,
        obsidian: 5,
      },
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
        x: 2,
        y: 3,
      },
      issuedRound: 3,
      commandCost: 1,
    };

  const guard:
    GuardOrder = {
      orderId:
        'victoria-r3-o1',
      kind: 'guard',
      faction:
        'victoria',
      unitId: 'vpawn',
      anchor: {
        x: 2,
        y: 2,
      },
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
      guard,
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

describe(
  'Royal Tactical turn save-game persistence',
  () => {
    it('uses the tactical-turn save schema version', () => {
      expect(
        SAVE_VERSION,
      ).toBe(2);
    });

    it('restores round, phase, Royal Commands, and exact pending order sequence', () => {
      const storage =
        new MemoryStorage();

      const world =
        roundThreeWorld();

      saveGame(
        storage,
        world,
      );

      const loaded =
        loadGame(storage);

      expect(loaded)
        .not.toBeNull();

      expect(
        loaded!.turn.round,
      ).toBe(3);

      expect(
        loaded!.turn.phase,
      ).toBe(
        'victoria_command',
      );

      expect(
        loaded!.turn
          .royalCommandsRemaining,
      ).toEqual({
        victoria: 2,
        obsidian: 2,
      });

      expect(
        loaded!.turn
          .pendingOrderIds,
      ).toEqual([
        'victoria-r3-o0',
        'victoria-r3-o1',
      ]);

      expect(
        loaded!.pendingOrders,
      ).toEqual(
        world.pendingOrders,
      );
    });

    it('preserves the rest of authoritative world state exactly', () => {
      const storage =
        new MemoryStorage();

      const world =
        roundThreeWorld();

      saveGame(
        storage,
        world,
      );

      const loaded =
        loadGame(storage)!;

      expect(
        loaded.units,
      ).toEqual(
        world.units,
      );

      expect(
        loaded.combat,
      ).toEqual(
        world.combat,
      );

      expect(
        loaded.economy,
      ).toEqual(
        world.economy,
      );

      expect(
        loaded.production,
      ).toEqual(
        world.production,
      );

      expect(
        loaded.heroes,
      ).toEqual(
        world.heroes,
      );

      expect(
        loaded.territory,
      ).toEqual(
        world.territory,
      );
    });

    it('migrates a version-1 save without turn state to a clean initial tactical turn', () => {
      const storage =
        new MemoryStorage();

      const world =
        createWorld();

      const legacy = {
        ...world,
      } as Record<
        string,
        unknown
      >;

      delete legacy.turn;
      delete legacy.pendingOrders;

      storage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          world: legacy,
        }),
      );

      const loaded =
        loadGame(storage);

      expect(loaded)
        .not.toBeNull();

      expect(
        loaded!.turn,
      ).toEqual({
        round: 1,
        phase:
          'victoria_command',
        royalCommandsRemaining: {
          victoria: 4,
          obsidian: 4,
        },
        pendingOrderIds: [],
      });

      expect(
        loaded!.pendingOrders,
      ).toEqual([]);
    });
  },
);
