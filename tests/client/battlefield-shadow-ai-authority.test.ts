import { describe, expect, it } from 'vitest';

import {
  BattlefieldSceneController,
} from '../../src/client/phaser/battlefield-scene';
import {
  FixedTickRuntime,
} from '../../src/client/runtime/fixed-tick-runtime';
import {
  createWorld,
} from '../../src/sim';
import type {
  ReadyDeployment,
  WorldState,
} from '../../src/sim';

function ready(id: string): ReadyDeployment {
  return {
    id,
    faction: 'obsidian',
    unitKind: 'pawn',
    cost: 10,
    capacityWeight: 1,
    queuedTick: 0,
    readyRound: 1,
  };
}

function worldWithShadowStrategicWork(): WorldState {
  let world = createWorld([], {
    topologyId: 'triptych-v2',
    aiFactions: ['obsidian'],
  });

  world = {
    ...world,
    economy: {
      crownPower: {
        victoria: 0,
        obsidian: 20,
      },
    },
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        obsidian: [
          ready('obsidian-ready-1'),
        ],
      },
    },
  };

  return world;
}

describe('Battlefield live Shadow AI authority', () => {
  it('executes free READY deployment and strategic economy before Shadow orders', () => {
    const runtime = new FixedTickRuntime(
      worldWithShadowStrategicWork(),
    );
    const controller = new BattlefieldSceneController(runtime);

    controller.endTurn();

    expect(
      controller.world.units['unit:obsidian-ready-1'],
    ).toBeDefined();
    expect(
      controller.world.production.ready.obsidian,
    ).toEqual([]);

    expect(
      controller.world.production.queues.obsidian,
    ).toHaveLength(1);
    expect(
      controller.world.production.queues.obsidian[0],
    ).toMatchObject({
      faction: 'obsidian',
      unitKind: 'pawn',
    });

    expect(
      controller.world.economy.crownPower.obsidian,
    ).toBe(10);

    expect(controller.world.turn.round).toBe(2);
    expect(controller.world.turn.phase).toBe('victoria_command');
  });
});
