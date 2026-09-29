import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createBattlefieldRenderModel,
  type BattlefieldRenderProjection,
} from '../../src/client/render/battlefield-model';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

import {
  createPhaserBattlefieldFrame,
} from '../../src/client/phaser/battlefield-renderer';

const projection:
  BattlefieldRenderProjection = {
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
      y: 700,
    },
    bottomRight: {
      x: 1480,
      y: 700,
    },
  };

describe(
  'GOD faction presentation facing',
  () => {
    it('faces Victoria right and Obsidian left', () => {
      const world =
        createPhase6SkirmishWorld();

      const model =
        createBattlefieldRenderModel(
          world,
          projection,
          null,
        );

      const victoria =
        model.units.find(
          unit =>
            unit.id ===
            'victoria-queen',
        ) as any;

      const obsidian =
        model.units.find(
          unit =>
            unit.id ===
            'obsidian-king',
        ) as any;

      expect(
        victoria.scaleX,
      ).toBeGreaterThan(0);

      expect(
        obsidian.scaleX,
      ).toBeLessThan(0);
    });

    it('facing metadata does not mutate simulation state or projected position', () => {
      const world =
        createPhase6SkirmishWorld();

      const before =
        JSON.stringify(world);

      const model =
        createBattlefieldRenderModel(
          world,
          projection,
          'victoria-queen',
        );

      const victoria =
        model.units.find(
          unit =>
            unit.id ===
            'victoria-queen',
        ) as any;

      expect(
        victoria.screen,
      ).toEqual({
        ...victoria.screen,
      });

      expect(
        victoria.selected,
      ).toBe(true);

      expect(
        JSON.stringify(world),
      ).toBe(before);
    });
  },
);

describe('Phaser frame facing propagation', () => {
  it('preserves faction-facing scaleX from the render model', () => {
    const world = createPhase6SkirmishWorld();

    const frame = createPhaserBattlefieldFrame(
      world,
      projection,
      null,
    );

    const victoria = frame.units.find(
      unit => unit.id === 'victoria-queen',
    );

    const shadow = frame.units.find(
      unit => unit.id === 'obsidian-king',
    );

    expect(victoria?.scaleX).toBeGreaterThan(0);
    expect(shadow?.scaleX).toBeLessThan(0);
  });
});
