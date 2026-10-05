import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveReinforcementPhase,
} from '../../src/sim/turns';

import {
  stepWorld,
} from '../../src/sim/step';

import {
  createWorld,
} from '../../src/sim/world';

import type {
  ProductionQueueEntry,
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

function reinforcementWorld(
  units: readonly UnitState[] = [],
): WorldState {
  const world =
    createWorld(units);

  return {
    ...world,

    turn: {
      ...world.turn,
      phase: 'reinforcement',
    },
  };
}

function queueEntry(
  id: string,
  faction:
    | 'victoria'
    | 'obsidian',
  unitKind:
    | 'pawn'
    | 'knight'
    | 'bishop'
    | 'rook',
): ProductionQueueEntry {
  const weight = {
    pawn: 1,
    knight: 2,
    bishop: 2,
    rook: 3,
  } as const;

  return {
    id,
    faction,
    unitKind,
    cost: 10,
    capacityWeight:
      weight[unitKind],
    queuedTick: 0,
  };
}

describe(
  'Royal Tactical reinforcement phase',
  () => {
    it('pays node income exactly once and begins the next round with both Royal Command budgets restored', () => {
      let world =
        reinforcementWorld();

      world = {
        ...world,

        economy: {
          crownPower: {
            victoria: 0,
            obsidian: 0,
          },
        },

        territory: {
          nodes: {
            ...world
              .territory
              .nodes,

            'minor-nw': {
              ...world
                .territory
                .nodes[
                  'minor-nw'
                ]!,
              owner:
                'victoria',
            },

            crown: {
              ...world
                .territory
                .nodes
                .crown!,
              owner:
                'obsidian',
            },
          },
        },

        turn: {
          ...world.turn,

          royalCommandsRemaining: {
            victoria: 0,
            obsidian: 0,
          },
        },
      };

      const next =
        resolveReinforcementPhase(
          world,
        );

      expect(
        next.economy
          .crownPower,
      ).toEqual({
        victoria: 1,
        obsidian: 2,
      });

      expect(
        next.turn.round,
      ).toBe(2);

      expect(
        next.turn.phase,
      ).toBe(
        'victoria_command',
      );

      expect(
        next.turn
          .royalCommandsRemaining,
      ).toEqual({
        victoria: 4,
        obsidian: 4,
      });

      const repeated =
        resolveReinforcementPhase(
          next,
        );

      expect(
        repeated.economy
          .crownPower,
      ).toEqual({
        victoria: 1,
        obsidian: 2,
      });

      expect(repeated)
        .toEqual(next);
    });

    it('advances one legal production head exactly once per round', () => {
      let world =
        reinforcementWorld();

      world = {
        ...world,

        production: {
          ...world.production,

          queues: {
            ...world
              .production
              .queues,

            victoria: [
              queueEntry(
                'victoria-recruit-1',
                'victoria',
                'pawn',
              ),
            ],
          },
        },
      };

      const next =
        resolveReinforcementPhase(
          world,
        );

      expect(
        next.production
          .queues
          .victoria,
      ).toHaveLength(0);

      expect(
        next.units[
          'unit:victoria-recruit-1'
        ],
      ).toBeUndefined();

      expect(
        next.production.ready.victoria
          .map(entry => entry.id),
      ).toEqual([
        'victoria-recruit-1',
      ]);

      const repeated =
        resolveReinforcementPhase(
          next,
        );

      expect(
        Object.keys(
          repeated.units,
        ).filter(
          id =>
            id ===
            'unit:victoria-recruit-1',
        ),
      ).toHaveLength(1);
    });

    it('honours purchased commitments when unlock conditions later change', () => {
      let world =
        reinforcementWorld();

      world = {
        ...world,

        production: {
          ...world.production,

          queues: {
            ...world
              .production
              .queues,

            victoria: [
              queueEntry(
                'victoria-recruit-1',
                'victoria',
                'knight',
              ),
            ],
          },
        },
      };

      const next =
        resolveReinforcementPhase(
          world,
        );

      expect(
        next.production
          .queues
          .victoria,
      ).toEqual([]);

      expect(
        next.production
          .ready
          .victoria
          .map(
            entry => entry.id,
          ),
      ).toEqual([
        'victoria-recruit-1',
      ]);

      expect(
        next.units[
          'unit:victoria-recruit-1'
        ],
      ).toBeUndefined();
    });

    it('advances node control exactly once per round when the occupation is territorially supplied', () => {
      const world =
        reinforcementWorld([
          unit(
            'vpawn',
            'victoria',
            'pawn',
            9,
            8,
          ),
        ]);

      const next =
        resolveReinforcementPhase(
          world,
        );

      expect(
        next.territory
          .nodes[
            'minor-nw'
          ]!
          .captureProgressTicks,
      ).toBe(1);

      const repeated =
        resolveReinforcementPhase(
          next,
        );

      expect(
        repeated.territory
          .nodes[
            'minor-nw'
          ]!
          .captureProgressTicks,
      ).toBe(1);
    });

    it('advances hero ability and respawn lifecycle by round semantics', () => {
      let world =
        reinforcementWorld();

      world = {
        ...world,

        heroes: {
          ...world.heroes,

          victoria: {
            ...world.heroes
              .victoria,

            status:
              'alive',

            activeAbility:
              'royal_decree',

            abilities: {
              ...world.heroes
                .victoria
                .abilities,

              royal_decree: {
                ...world.heroes
                  .victoria
                  .abilities
                  .royal_decree,

                cooldownTicksRemaining:
                  2,

                activeTicksRemaining:
                  2,
              },
            },
          },

          obsidian: {
            ...world.heroes
              .obsidian,

            status:
              'respawning',

            respawnTicksRemaining:
              2,
          },
        },
      };

      const next =
        resolveReinforcementPhase(
          world,
        );

      expect(
        next.heroes
          .victoria
          .abilities
          .royal_decree
          .cooldownTicksRemaining,
      ).toBe(1);

      expect(
        next.heroes
          .victoria
          .abilities
          .royal_decree
          .activeTicksRemaining,
      ).toBe(1);

      expect(
        next.heroes
          .obsidian
          .respawnTicksRemaining,
      ).toBe(1);
    });

    it('does not let a fixed simulation tick mutate reinforcement strategy state', () => {
      let world =
        createWorld([
          unit(
            'vpawn',
            'victoria',
            'pawn',
            3,
            3,
          ),
        ]);

      world = {
        ...world,

        tick: 49,

        production: {
          ...world.production,

          queues: {
            ...world
              .production
              .queues,

            victoria: [
              queueEntry(
                'victoria-recruit-1',
                'victoria',
                'pawn',
              ),
            ],
          },
        },

        heroes: {
          ...world.heroes,

          obsidian: {
            ...world.heroes
              .obsidian,

            status:
              'respawning',

            respawnTicksRemaining:
              2,
          },
        },
      };

      const before = {
        queue:
          world.production
            .queues
            .victoria
            .map(
              entry =>
                entry.id,
            ),

        nodeProgress:
          world.territory
            .nodes[
              'minor-nw'
            ]!
            .captureProgressTicks,

        respawn:
          world.heroes
            .obsidian
            .respawnTicksRemaining,
      };

      const stepped =
        stepWorld(
          world,
          [],
        ).state;

      expect(
        stepped.production
          .queues
          .victoria
          .map(
            entry => entry.id,
          ),
      ).toEqual(
        before.queue,
      );

      expect(
        stepped.territory
          .nodes[
            'minor-nw'
          ]!
          .captureProgressTicks,
      ).toBe(
        before.nodeProgress,
      );

      expect(
        stepped.heroes
          .obsidian
          .respawnTicksRemaining,
      ).toBe(
        before.respawn,
      );

      expect(
        stepped.units[
          'unit:victoria-recruit-1'
        ],
      ).toBeUndefined();
    });
  },
);
