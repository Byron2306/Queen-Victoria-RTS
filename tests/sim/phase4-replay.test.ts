import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  canonicalSnapshot,
  createWorld,
  runReplay,
} from '../../src/sim';

import type {
  SimCommand,
  UnitState,
} from '../../src/sim';

const unit = (
  id: string,
  kind: UnitState['kind'],
  faction: UnitState['faction'],
  x: number,
  y: number,
): UnitState => ({
  id,
  kind,
  faction,
  position: { x, y },
});

describe(
  'Phase 4 fixed-tick replay after turn migration',
  () => {
    it('remains byte-stable without performing reinforcement-phase authority', () => {
      const initial =
        createWorld([
          unit(
            'fighter',
            'pawn',
            'victoria',
            3,
            3,
          ),
          unit(
            'victim',
            'pawn',
            'obsidian',
            3,
            4,
          ),
        ]);

      const frames:
        SimCommand[][] = [
          [],
          [],
          [],
        ];

      const a =
        runReplay(
          initial,
          frames,
        );

      const b =
        runReplay(
          initial,
          frames,
        );

      expect(
        canonicalSnapshot(a),
      ).toBe(
        canonicalSnapshot(b),
      );

      const eventTypes =
        a.eventsByTick
          .flat()
          .map(
            event =>
              event.type,
          );

      expect(
        eventTypes,
      ).not.toContain(
        'node.captured',
      );

      expect(
        eventTypes,
      ).not.toContain(
        'crown.income',
      );

      expect(
        eventTypes,
      ).not.toContain(
        'reinforcement.deployed',
      );

      expect(
        eventTypes,
      ).not.toContain(
        'promotion.completed',
      );
    });

    it('serializes blocked production state without resolving it on a fixed tick', () => {
      let world =
        createWorld([
          unit(
            'p',
            'pawn',
            'victoria',
            5,
            14,
          ),
        ]);

      const occupancy:
        Record<
          string,
          string
        > = {};

      for (
        let y = 0;
        y < 16;
        y += 1
      ) {
        for (
          let x = 0;
          x < 16;
          x += 1
        ) {
          occupancy[
            `${x},${y}`
          ] = 'blocked';
        }
      }

      world = {
        ...world,

        occupancy,

        production: {
          ...world.production,

          queues: {
            ...world
              .production
              .queues,

            victoria: [{
              id:
                'victoria-recruit-1',
              faction:
                'victoria',
              unitKind:
                'pawn',
              cost: 10,
              capacityWeight: 1,
              queuedTick: 0,
            }],
          },
        },

        promotions: {
          pending: [{
            faction:
              'victoria',
            pawnId: 'p',
            targetKind: 'rook',
            sequence: 1,
            requestedTick: 0,
          }],
        },
      };

      const a =
        runReplay(
          world,
          [[]],
        );

      const b =
        runReplay(
          world,
          [[]],
        );

      expect(
        canonicalSnapshot(a),
      ).toBe(
        canonicalSnapshot(b),
      );

      expect(
        a.state.production
          .queues
          .victoria,
      ).toHaveLength(1);

      expect(
        a.state.promotions
          .pending,
      ).toHaveLength(1);
    });
  },
);
