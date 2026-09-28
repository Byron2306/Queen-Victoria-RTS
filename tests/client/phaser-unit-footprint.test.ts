import {
  describe,
  expect,
  it,
} from 'vitest';

import * as projectionModule
  from '../../src/client/board/projection';

import {
  createBattlefieldRenderModel,
  type BattlefieldRenderProjection,
} from '../../src/client/render/battlefield-model';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

describe(
  'GOD unit footprint exclusion',
  () => {
    it('keeps every live unit anchor above the HUD deck', () => {
      const hudTop = 690;

      const typed =
        projectionModule as unknown as {
          constrainProjectionAboveHud?: (
            projection:
              BattlefieldRenderProjection,
            hudTop: number,
          ) =>
            BattlefieldRenderProjection;
        };

      const factory =
        typed.constrainProjectionAboveHud;

      expect(
        typeof factory,
      ).toBe('function');

      const projection =
        factory!(
          {
            topLeft: {
              x: 400,
              y: 180,
            },
            topRight: {
              x: 1200,
              y: 180,
            },
            bottomLeft: {
              x: 120,
              y: 820,
            },
            bottomRight: {
              x: 1480,
              y: 820,
            },
          },
          hudTop,
        );

      const world =
        createPhase6SkirmishWorld();

      const before =
        JSON.stringify(world);

      const model =
        createBattlefieldRenderModel(
          world,
          projection,
          null,
        );

      for (
        const unit of
        model.units
      ) {
        expect(
          unit.screen.y,
        ).toBeLessThan(
          hudTop,
        );
      }

      expect(
        JSON.stringify(world),
      ).toBe(before);
    });
  },
);
