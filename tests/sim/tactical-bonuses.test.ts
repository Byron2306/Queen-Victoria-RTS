import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createWorld,
} from '../../src/sim/world';

import type {
  WorldState,
} from '../../src/sim/types';

import * as bonusModule
  from '../../src/sim/tactical-bonuses';

import {
  resolveCommittedOrders,
} from '../../src/sim/resolve-orders';

import type {
  MoveOrder,
} from '../../src/sim/orders';

type TacticalBonus = Readonly<{
  kind:
    | 'knight_fork'
    | 'open_file'
    | 'royal_alignment'
    | 'sovereign_line';
  faction:
    | 'victoria'
    | 'obsidian';
  sourceUnitIds:
    readonly string[];
  targetUnitIds:
    readonly string[];
}>;

type BonusModule = Readonly<{
  detectKnightFork?: (
    world: WorldState,
    unitId: string,
  ) => TacticalBonus | null;

  detectOpenFile?: (
    world: WorldState,
    unitId: string,
  ) => TacticalBonus | null;

  detectRoyalAlignment?: (
    world: WorldState,
    faction:
      | 'victoria'
      | 'obsidian',
  ) => readonly TacticalBonus[];

  detectSovereignLine?: (
    world: WorldState,
    faction:
      | 'victoria'
      | 'obsidian',
  ) => readonly TacticalBonus[];
}>;

const bonuses =
  bonusModule as unknown as BonusModule;

function requireDetector<
  K extends keyof BonusModule,
>(
  name: K,
): NonNullable<
  BonusModule[K]
> {
  const detector =
    bonuses[name];

  expect(
    typeof detector,
  ).toBe('function');

  return detector!;
}

describe(
  'geometry-derived Knight Fork',
  () => {
    it('detects a knight threatening two enemy pieces', () => {
      const world =
        createWorld([
          {
            id: 'v-knight',
            faction:
              'victoria',
            kind: 'knight',
            position: {
              x: 5,
              y: 5,
            },
          },
          {
            id: 'o-rook',
            faction:
              'obsidian',
            kind: 'rook',
            position: {
              x: 7,
              y: 6,
            },
          },
          {
            id: 'o-pawn',
            faction:
              'obsidian',
            kind: 'pawn',
            position: {
              x: 4,
              y: 7,
            },
          },
          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const detect =
        requireDetector(
          'detectKnightFork',
        );

      expect(
        detect(
          world,
          'v-knight',
        ),
      ).toEqual({
        kind:
          'knight_fork',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-knight',
        ],
        targetUnitIds: [
          'o-pawn',
          'o-rook',
        ],
      });
    });

    it('removes the fork when one target moves out of the knight threat geometry', () => {
      const base =
        createWorld([
          {
            id: 'v-knight',
            faction:
              'victoria',
            kind: 'knight',
            position: {
              x: 5,
              y: 5,
            },
          },
          {
            id: 'o-rook',
            faction:
              'obsidian',
            kind: 'rook',
            position: {
              x: 7,
              y: 6,
            },
          },
          {
            id: 'o-pawn',
            faction:
              'obsidian',
            kind: 'pawn',
            position: {
              x: 4,
              y: 7,
            },
          },
          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const units = {
        ...base.units,

        'o-pawn': {
          ...base.units[
            'o-pawn'
          ]!,
          position: {
            x: 3,
            y: 7,
          },
        },
      };

      const occupancy = {
        ...base.occupancy,
      };

      delete occupancy[
        '4,7'
      ];

      occupancy[
        '3,7'
      ] = 'o-pawn';

      const moved: WorldState = {
        ...base,
        units,
        occupancy,
      };

      const detect =
        requireDetector(
          'detectKnightFork',
        );

      expect(
        detect(
          moved,
          'v-knight',
        ),
      ).toBeNull();
    });
  },
);

describe(
  'geometry-derived Open File',
  () => {
    it('detects the one remaining unobstructed rook ray', () => {
      const world =
        createWorld([
          {
            id: 'v-rook',
            faction:
              'victoria',
            kind: 'rook',
            position: {
              x: 8,
              y: 8,
            },
          },

          {
            id: 'block-left',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 7,
              y: 8,
            },
          },
          {
            id: 'block-right',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 9,
              y: 8,
            },
          },
          {
            id: 'block-down',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 8,
              y: 9,
            },
          },

          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const detect =
        requireDetector(
          'detectOpenFile',
        );

      expect(
        detect(
          world,
          'v-rook',
        ),
      ).toEqual({
        kind:
          'open_file',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-rook',
        ],
        targetUnitIds: [],
      });
    });

    it('removes Open File when the final clear rook ray is blocked', () => {
      const world =
        createWorld([
          {
            id: 'v-rook',
            faction:
              'victoria',
            kind: 'rook',
            position: {
              x: 8,
              y: 8,
            },
          },

          {
            id: 'block-left',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 7,
              y: 8,
            },
          },
          {
            id: 'block-right',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 9,
              y: 8,
            },
          },
          {
            id: 'block-up',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 8,
              y: 7,
            },
          },
          {
            id: 'block-down',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 8,
              y: 9,
            },
          },

          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const detect =
        requireDetector(
          'detectOpenFile',
        );

      expect(
        detect(
          world,
          'v-rook',
        ),
      ).toBeNull();
    });
  },
);

describe(
  'geometry-derived Royal Alignment',
  () => {
    it('detects Victoria aligned with a friendly non-pawn piece', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 4,
                y: 4,
              },
            },
            {
              id: 'v-bishop',
              faction:
                'victoria',
              kind: 'bishop',
              position: {
                x: 7,
                y: 7,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 0,
                y: 0,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const detect =
        requireDetector(
          'detectRoyalAlignment',
        );

      expect(
        detect(
          world,
          'victoria',
        ),
      ).toEqual([
        {
          kind:
            'royal_alignment',
          faction:
            'victoria',
          sourceUnitIds: [
            'v-bishop',
            'victoria',
          ],
          targetUnitIds: [],
        },
      ]);
    });

    it('does not detect a blocked alignment', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 4,
                y: 4,
              },
            },
            {
              id: 'blocker',
              faction:
                'victoria',
              kind: 'pawn',
              position: {
                x: 5,
                y: 5,
              },
            },
            {
              id: 'v-bishop',
              faction:
                'victoria',
              kind: 'bishop',
              position: {
                x: 7,
                y: 7,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 0,
                y: 0,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const detect =
        requireDetector(
          'detectRoyalAlignment',
        );

      expect(
        detect(
          world,
          'victoria',
        ),
      ).toEqual([]);
    });
  },
);

describe(
  'geometry-derived Sovereign Line',
  () => {
    it('detects an unobstructed line between Victoria and her sovereign', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 4,
                y: 4,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 4,
                y: 10,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const detect =
        requireDetector(
          'detectSovereignLine',
        );

      expect(
        detect(
          world,
          'victoria',
        ),
      ).toEqual([
        {
          kind:
            'sovereign_line',
          faction:
            'victoria',
          sourceUnitIds: [
            'v-king',
            'victoria',
          ],
          targetUnitIds: [],
        },
      ]);
    });

    it('is deterministic and renderer-independent', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 4,
                y: 4,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 4,
                y: 10,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const detect =
        requireDetector(
          'detectSovereignLine',
        );

      const first =
        detect(
          world,
          'victoria',
        );

      const second =
        detect(
          JSON.parse(
            JSON.stringify(
              world,
            ),
          ),
          'victoria',
        );

      expect(
        JSON.stringify(first),
      ).toBe(
        JSON.stringify(second),
      );

      expect(
        JSON.stringify(world),
      ).toBe(
        JSON.stringify(
          JSON.parse(
            JSON.stringify(
              world,
            ),
          ),
        ),
      );
    });
  },
);

describe(
  'tactical bonus resolution evidence',
  () => {
    it('emits an explicit Knight Fork bonus event after a move creates the geometry', () => {
      const world =
        createWorld([
          {
            id: 'v-knight',
            faction:
              'victoria',
            kind: 'knight',
            position: {
              x: 4,
              y: 3,
            },
          },
          {
            id: 'o-rook',
            faction:
              'obsidian',
            kind: 'rook',
            position: {
              x: 7,
              y: 6,
            },
          },
          {
            id: 'o-pawn',
            faction:
              'obsidian',
            kind: 'pawn',
            position: {
              x: 4,
              y: 7,
            },
          },
          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const order:
        MoveOrder = {
          orderId:
            'victoria-r1-o0',
          kind: 'move',
          faction:
            'victoria',
          unitId:
            'v-knight',
          destination: {
            x: 5,
            y: 5,
          },
          issuedRound: 1,
          commandCost: 1,
        };

      const beforeCrown =
        world.economy
          .crownPower
          .victoria;

      const result =
        resolveCommittedOrders(
          world,
          [order],
        );

      expect(
        result.events,
      ).toContainEqual({
        type:
          'tactical.bonus',
        tick:
          world.tick,
        kind:
          'knight_fork',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-knight',
        ],
        targetUnitIds: [
          'o-pawn',
          'o-rook',
        ],
      });

      expect(
        result.world
          .economy
          .crownPower
          .victoria,
      ).toBe(
        beforeCrown,
      );
    });

    it('does not emit a tactical bonus when resolved geometry creates none', () => {
      const world =
        createWorld([
          {
            id: 'v-knight',
            faction:
              'victoria',
            kind: 'knight',
            position: {
              x: 4,
              y: 3,
            },
          },
          {
            id: 'o-rook',
            faction:
              'obsidian',
            kind: 'rook',
            position: {
              x: 12,
              y: 12,
            },
          },
          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const order:
        MoveOrder = {
          orderId:
            'victoria-r1-o0',
          kind: 'move',
          faction:
            'victoria',
          unitId:
            'v-knight',
          destination: {
            x: 5,
            y: 5,
          },
          issuedRound: 1,
          commandCost: 1,
        };

      const result =
        resolveCommittedOrders(
          world,
          [order],
        );

      expect(
        result.events.filter(
          event =>
            event.type ===
            'tactical.bonus',
        ),
      ).toEqual([]);
    });
  },
);

describe(
  'remaining tactical bonus resolution evidence',
  () => {
    it('emits Open File after a resolved rook move creates one', () => {
      const world =
        createWorld([
          {
            id: 'v-rook',
            faction:
              'victoria',
            kind: 'rook',
            position: {
              x: 8,
              y: 6,
            },
          },
          {
            id: 'block-left',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 7,
              y: 8,
            },
          },
          {
            id: 'block-right',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 9,
              y: 8,
            },
          },
          {
            id: 'block-down',
            faction:
              'victoria',
            kind: 'pawn',
            position: {
              x: 8,
              y: 9,
            },
          },
          {
            id: 'v-king',
            faction:
              'victoria',
            kind: 'king',
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            id: 'o-king',
            faction:
              'obsidian',
            kind: 'king',
            position: {
              x: 15,
              y: 15,
            },
          },
        ]);

      const order:
        MoveOrder = {
          orderId:
            'victoria-r1-o0',
          kind: 'move',
          faction:
            'victoria',
          unitId:
            'v-rook',
          destination: {
            x: 8,
            y: 8,
          },
          issuedRound: 1,
          commandCost: 1,
        };

      const result =
        resolveCommittedOrders(
          world,
          [order],
        );

      expect(
        result.events,
      ).toContainEqual({
        type:
          'tactical.bonus',
        tick:
          world.tick,
        kind:
          'open_file',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-rook',
        ],
        targetUnitIds: [],
      });
    });

    it('emits Royal Alignment after Victoria moves into an unobstructed friendly formation', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 3,
                y: 4,
              },
            },
            {
              id: 'v-bishop',
              faction:
                'victoria',
              kind: 'bishop',
              position: {
                x: 7,
                y: 7,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 0,
                y: 0,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const order:
        MoveOrder = {
          orderId:
            'victoria-r1-o0',
          kind: 'move',
          faction:
            'victoria',
          unitId:
            'victoria',
          destination: {
            x: 4,
            y: 4,
          },
          issuedRound: 1,
          commandCost: 1,
        };

      const result =
        resolveCommittedOrders(
          world,
          [order],
        );

      expect(
        result.events,
      ).toContainEqual({
        type:
          'tactical.bonus',
        tick:
          world.tick,
        kind:
          'royal_alignment',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-bishop',
          'victoria',
        ],
        targetUnitIds: [],
      });
    });

    it('emits Sovereign Line after Victoria moves into line with her sovereign', () => {
      const world =
        createWorld(
          [
            {
              id: 'victoria',
              faction:
                'victoria',
              kind: 'queen',
              position: {
                x: 3,
                y: 4,
              },
            },
            {
              id: 'v-king',
              faction:
                'victoria',
              kind: 'king',
              position: {
                x: 4,
                y: 10,
              },
            },
            {
              id: 'o-king',
              faction:
                'obsidian',
              kind: 'king',
              position: {
                x: 15,
                y: 15,
              },
            },
          ],
          {
            heroIds: {
              victoria:
                'victoria',
            },
          },
        );

      const order:
        MoveOrder = {
          orderId:
            'victoria-r1-o0',
          kind: 'move',
          faction:
            'victoria',
          unitId:
            'victoria',
          destination: {
            x: 4,
            y: 4,
          },
          issuedRound: 1,
          commandCost: 1,
        };

      const result =
        resolveCommittedOrders(
          world,
          [order],
        );

      expect(
        result.events,
      ).toContainEqual({
        type:
          'tactical.bonus',
        tick:
          world.tick,
        kind:
          'sovereign_line',
        faction:
          'victoria',
        sourceUnitIds: [
          'v-king',
          'victoria',
        ],
        targetUnitIds: [],
      });
    });
  },
);
