import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  BattlefieldInput,
} from '../../src/client/input/battlefield-input';

import {
  ClientCommandBridge,
} from '../../src/client/runtime/command-bridge';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

describe(
  'Royal Tactical turn-aware input',
  () => {
    it('refuses battlefield command input outside Victoria command phase', () => {
      const initial =
        createPhase6SkirmishWorld();

      const world = {
        ...initial,

        turn: {
          ...initial.turn,
          phase:
            'shadow_command' as const,
        },
      };

      const bridge =
        new ClientCommandBridge();

      const input =
        new BattlefieldInput(
          bridge,
        );

      input.pointerDown(
        world,
        0,
        { x: 3, y: 13 },
      );

      input.pointerDown(
        world,
        0,
        { x: 4, y: 12 },
      );

      expect(
        input.selectedUnitId,
      ).toBeNull();

      expect(
        bridge.drainTactical(),
      ).toEqual([]);
    });
  },
);
