import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  BattlefieldSceneController,
} from '../../src/client/phaser/battlefield-scene';

import {
  createBattlefieldSceneClass,
} from '../../src/client/phaser/phaser-scene';

import {
  FixedTickRuntime,
} from '../../src/client/runtime/fixed-tick-runtime';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

import {
  enqueueTacticalOrder,
  type MoveOrder,
} from '../../src/sim/orders';

function worldWithVictoriaMove() {
  const initial =
    createPhase6SkirmishWorld();

  const order:
    MoveOrder = {
      orderId:
        'victoria-r1-o0',
      kind: 'move',
      faction:
        'victoria',
      unitId:
        'victoria-queen',
      destination: {
        x: 4,
        y: 12,
      },
      issuedRound: 1,
      commandCost: 1,
    };

  const queued =
    enqueueTacticalOrder(
      initial,
      order,
    );

  if (
    queued.status !==
    'ACCEPTED'
  ) {
    throw new Error(
      queued.reason,
    );
  }

  return queued.world;
}

describe(
  'Royal Tactical Phaser turn controls',
  () => {
    it('exposes an End Turn command on the battlefield controller', () => {
      const controller =
        new BattlefieldSceneController();

      expect(
        typeof controller.endTurn,
      ).toBe('function');
    });

    it('cancels a pending Victoria order and restores its Royal Command', () => {
      const runtime =
        new FixedTickRuntime(
          worldWithVictoriaMove(),
        );

      const controller =
        new BattlefieldSceneController(
          runtime,
        );

      const candidate =
        controller as unknown as {
          cancelPendingOrder?: (
            orderId: string,
          ) => void;
        };

      expect(
        typeof candidate
          .cancelPendingOrder,
      ).toBe('function');

      candidate.cancelPendingOrder?.(
        'victoria-r1-o0',
      );

      expect(
        controller.world
          .pendingOrders,
      ).toEqual([]);

      expect(
        controller.world
          .turn
          .pendingOrderIds,
      ).toEqual([]);

      expect(
        controller.world
          .turn
          .royalCommandsRemaining
          .victoria,
      ).toBe(4);
    });

    it('End Turn resolves Victoria, Shadow, reinforcement, and returns control for round 2', () => {
      const runtime =
        new FixedTickRuntime(
          worldWithVictoriaMove(),
        );

      const controller =
        new BattlefieldSceneController(
          runtime,
        );

      controller.endTurn();

      expect(
        controller.world.units[
          'victoria-queen'
        ]?.position,
      ).toEqual({
        x: 4,
        y: 12,
      });

      expect(
        controller.world.turn.round,
      ).toBe(2);

      expect(
        controller.world.turn.phase,
      ).toBe(
        'victoria_command',
      );

      expect(
        controller.world
          .pendingOrders,
      ).toEqual([]);

      expect(
        controller.world.turn
          .pendingOrderIds,
      ).toEqual([]);

      expect(
        controller.world.turn
          .royalCommandsRemaining,
      ).toEqual({
        victoria: 4,
        obsidian: 4,
      });
    });
  },
);

describe(
  'Royal Tactical immediate End Turn commit',
  () => {
    it('commits bridge tactical orders even when no fixed tick has drained them yet', () => {
      const world =
        createPhase6SkirmishWorld();

      const runtime =
        new FixedTickRuntime(
          world,
        );

      const controller =
        new BattlefieldSceneController(
          runtime,
        );

      runtime.commands.move(
        runtime.world,
        'victoria-queen',
        { x: 4, y: 12 },
      );

      expect(
        runtime.world.units[
          'victoria-queen'
        ]?.position,
      ).toEqual({
        x: 3,
        y: 13,
      });

      expect(
        runtime.world
          .pendingOrders,
      ).toEqual([]);

      controller.endTurn();

      expect(
        controller.world.units[
          'victoria-queen'
        ]?.position,
      ).toEqual({
        x: 4,
        y: 12,
      });

      expect(
        controller.world.turn.round,
      ).toBe(2);

      expect(
        controller.world.turn.phase,
      ).toBe(
        'victoria_command',
      );
    });
  },
);

describe(
  'Royal Tactical live turn HUD',
  () => {
    it('exposes live round, phase, and Royal Command text from the scene', () => {
      class FakeScene {
        public readonly sceneConfig:
          unknown;

        constructor(
          config?: unknown,
        ) {
          this.sceneConfig =
            config;
        }
      }

      const Scene =
        createBattlefieldSceneClass(
          FakeScene,
        );

      const scene =
        new Scene() as unknown as {
          turnHudText?: readonly string[];
        };

      expect(
        scene.turnHudText,
      ).toEqual([
        'ROUND 1',
        'VICTORIA COMMAND',
        'ROYAL COMMANDS 4/4',
      ]);
    });
  },
);
