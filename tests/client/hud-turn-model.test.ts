import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createHudModel,
} from '../../src/client/hud/model';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

describe(
  'Royal Tactical HUD turn model',
  () => {
    it('projects round, phase, Royal Commands, and pending orders', () => {
      const world =
        createPhase6SkirmishWorld();

      const hud =
        createHudModel(
          world,
          null,
        );

      expect(
        (hud as any).turn,
      ).toEqual({
        round: 1,
        phase:
          'victoria_command',
        royalCommandsRemaining: 4,
        royalCommandsMaximum: 4,
        pendingOrders: [],
      });
    });
  },
);
