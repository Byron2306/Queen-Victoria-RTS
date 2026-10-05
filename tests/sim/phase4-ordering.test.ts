import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createWorld,
  resolveReinforcementPhase,
  stepWorld,
} from '../../src/sim';

import type {
  UnitState,
  WorldState,
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

function own(
  world: WorldState,
  ids: string[],
  faction:
    | 'victoria'
    | 'obsidian' = 'victoria',
): WorldState {
  const nodes = {
    ...world.territory.nodes,
  };

  for (const id of ids) {
    nodes[id] = {
      ...nodes[id]!,
      owner: faction,
    };
  }

  return {
    ...world,
    territory: { nodes },
  };
}

function reinforcement(
  world: WorldState,
): WorldState {
  return {
    ...world,
    turn: {
      ...world.turn,
      phase: 'reinforcement',
    },
  };
}

describe(
  'Phase 4 ordering under Royal Tactical turns',
  () => {
    it('movement may enter a node without fixed ticks advancing capture', () => {
      const world =
        createWorld([
          unit(
            'p',
            'pawn',
            'victoria',
            9,
            7,
          ),
        ]);

      const moved =
        stepWorld(
          world,
          [{
            type: 'move',
            sequence: 1,
            issuedTick: 0,
            unitId: 'p',
            to: { x: 9, y: 8 },
          }],
        );

      expect(
        moved.state
          .territory
          .nodes['minor-nw']!
          .captureProgressTicks,
      ).toBe(0);

      expect(
        moved.events.some(
          e =>
            e.type ===
            'attack.fired',
        ),
      ).toBe(false);

      const afterPhase =
        resolveReinforcementPhase(
          reinforcement(
            moved.state,
          ),
        );

      expect(
        afterPhase
          .territory
          .nodes['minor-nw']!
          .captureProgressTicks,
      ).toBe(1);
    });

    it('fixed ticks do not grant node income before recruitment', () => {
      let world =
        own(
          createWorld(),
          ['minor-nw'],
        );

      world = {
        ...world,
        economy: {
          crownPower: {
            victoria: 9,
            obsidian: 0,
          },
        },
      };

      const tick =
        stepWorld(
          world,
          [{
            type: 'recruit',
            sequence: 1,
            issuedTick:
              world.tick,
            faction:
              'victoria',
            unitKind:
              'pawn',
          }],
        );

      expect(
        tick.events.map(
          e => e.type,
        ),
      ).not.toContain(
        'crown.income',
      );

      expect(
        tick.events,
      ).toContainEqual(
        expect.objectContaining({
          type:
            'production.rejected',
          reason:
            'insufficient_crown',
        }),
      );

      const next =
        resolveReinforcementPhase(
          reinforcement(
            tick.state,
          ),
        );

      expect(
        next.economy
          .crownPower
          .victoria,
      ).toBe(10);
    });

    it('fixed ticks cannot deploy a queued reinforcement', () => {
      let world =
        createWorld([
          unit(
            'e',
            'pawn',
            'obsidian',
            1,
            2,
          ),
        ]);

      world = {
        ...world,

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
      };

      const tick =
        stepWorld(
          world,
          [],
        );

      expect(
        tick.events.some(
          e =>
            e.type ===
            'reinforcement.deployed',
        ),
      ).toBe(false);

      expect(
        tick.state.units[
          'unit:victoria-recruit-1'
        ],
      ).toBeUndefined();

      const next =
        resolveReinforcementPhase(
          reinforcement(
            tick.state,
          ),
        );

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
    });

    it('promotion during reinforcement leaves sovereign threat truth current for the next command phase', () => {
      let world =
        own(
          createWorld([
            unit(
              'p',
              'pawn',
              'victoria',
              5,
              14,
            ),
            unit(
              'ok',
              'king',
              'obsidian',
              5,
              10,
            ),
          ]),
          [
            'minor-nw',
            'minor-ne',
            'minor-w',
            'minor-e',
          ],
        );

      world = {
        ...world,

        economy: {
          crownPower: {
            victoria: 50,
            obsidian: 0,
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

      const tick =
        stepWorld(
          world,
          [],
        );

      expect(
        tick.state.units.p!.kind,
      ).toBe('pawn');

      const next =
        resolveReinforcementPhase(
          reinforcement(
            tick.state,
          ),
        );

      expect(
        next.units.p!.kind,
      ).toBe('rook');

      expect(
        next.match
          .sovereigns
          .obsidian
          .threatened,
      ).toBe(true);
    });

    it('stops mutation after decisive King combat', () => {
      let world =
        createWorld([
          unit(
            'vk',
            'king',
            'victoria',
            7,
            7,
          ),
          unit(
            'ok',
            'king',
            'obsidian',
            7,
            8,
          ),
          unit(
            'p',
            'pawn',
            'victoria',
            3,
            3,
          ),
        ]);

      world = {
        ...world,

        combat: {
          ...world.combat,

          vk: {
            ...world.combat.vk!,
            health: 10,
          },

          ok: {
            ...world.combat.ok!,
            health: 10,
          },
        },

        economy: {
          crownPower: {
            victoria: 4,
            obsidian: 4,
          },
        },
      };

      const result =
        stepWorld(
          world,
          [],
        );

      expect(
        result.state.match.status,
      ).toBe('draw');

      expect(
        result.state.economy
          .crownPower,
      ).toEqual({
        victoria: 4,
        obsidian: 4,
      });

      expect(
        result.state.territory
          .nodes['minor-nw']!
          .captureProgressTicks,
      ).toBe(0);
    });

    it('applies same-tick kill reward before recruitment', () => {
      let world =
        createWorld([
          unit(
            'a',
            'pawn',
            'victoria',
            4,
            4,
          ),
          unit(
            'v',
            'pawn',
            'obsidian',
            4,
            5,
          ),
        ]);

      world = {
        ...world,

        economy: {
          crownPower: {
            victoria: 5,
            obsidian: 0,
          },
        },

        combat: {
          ...world.combat,

          v: {
            ...world.combat.v!,
            health: 8,
          },
        },
      };

      const result =
        stepWorld(
          world,
          [{
            type: 'recruit',
            sequence: 1,
            issuedTick: 0,
            faction:
              'victoria',
            unitKind:
              'pawn',
          }],
        );

      expect(
        result.events,
      ).toContainEqual(
        expect.objectContaining({
          type:
            'crown.kill_reward',
          faction:
            'victoria',
          amount: 5,
        }),
      );

      expect(
        result.events,
      ).toContainEqual(
        expect.objectContaining({
          type:
            'production.queued',
          faction:
            'victoria',
          unitKind:
            'pawn',
        }),
      );

      expect(
        result.state.economy
          .crownPower
          .victoria,
      ).toBe(0);
    });
  },
);
