import { describe, expect, it } from 'vitest';
import {
  createBattlefieldRenderModel,
  type BattlefieldRenderProjection,
} from '../../src/client/render/battlefield-model';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

const projection: BattlefieldRenderProjection = {
  topLeft: { x: 400, y: 180 },
  topRight: { x: 1200, y: 180 },
  bottomLeft: { x: 120, y: 820 },
  bottomRight: { x: 1480, y: 820 },
};

describe('Phase 6 battlefield render model', () => {
  it('uses the canonical palace board asset', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    expect(model.boardAsset)
      .toBe('/Queen-Victoria-RTS/assets/battlefield/palace-board.png');
  });

  it('projects every live simulation unit into screen space', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    expect(model.units).toHaveLength(
      Object.keys(world.units).length,
    );

    for (const rendered of model.units) {
      expect(Number.isFinite(rendered.screen.x)).toBe(true);
      expect(Number.isFinite(rendered.screen.y)).toBe(true);
    }
  });

  it('binds Victoria to her canonical art', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    const victoria = model.units.find(
      unit => unit.id === 'victoria-queen',
    );

    expect(victoria?.asset)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria.png');
  });

  it('binds the Obsidian sovereign to Shadow King V3', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    const shadowKing = model.units.find(
      unit => unit.id === 'obsidian-king',
    );

    expect(shadowKing?.asset)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-king-v3.png');
  });

  it('marks the selected unit without mutating world state', () => {
    const world = createPhase6SkirmishWorld();
    const before = JSON.stringify(world);

    const model = createBattlefieldRenderModel(
      world,
      projection,
      'victoria-queen',
    );

    expect(
      model.units.find(
        unit => unit.id === 'victoria-queen',
      )?.selected,
    ).toBe(true);

    expect(
      model.units.filter(unit => unit.selected),
    ).toHaveLength(1);

    expect(JSON.stringify(world)).toBe(before);
  });

  it('projects all eight capture nodes including both major Crown nodes', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    expect(model.nodes).toHaveLength(8);

    const crowns = model.nodes.filter(
      node => node.kind === 'crown',
    );

    expect(crowns).toHaveLength(2);
    for (const crown of crowns) {
      expect(Number.isFinite(crown.screen.x)).toBe(true);
      expect(Number.isFinite(crown.screen.y)).toBe(true);
    }
  });
});

describe('Phase 6 canonical troop render bindings', () => {
  it('binds Victoria troop kinds to canonical assets', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    expect(
      model.units.find(
        unit => unit.id === 'victoria-pawn-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/victoria-pawn.png');

    expect(
      model.units.find(
        unit => unit.id === 'victoria-knight-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/victoria-knight.png');

    expect(
      model.units.find(
        unit => unit.id === 'victoria-bishop-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/victoria-bishop.png');

    expect(
      model.units.find(
        unit => unit.id === 'victoria-rook-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/victoria-rook.png');
  });

  it('binds Shadow troop kinds to canonical assets', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    expect(
      model.units.find(
        unit => unit.id === 'obsidian-knight-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/shadow-knight.png');

    expect(
      model.units.find(
        unit => unit.id === 'obsidian-bishop-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/shadow-bishop.png');

    expect(
      model.units.find(
        unit => unit.id === 'obsidian-rook-a',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/shadow-rook.png');

    expect(
      model.units.find(
        unit => unit.id === 'obsidian-queen',
      )?.asset,
    ).toBe('/Queen-Victoria-RTS/assets/units/shadow-queen.png');
  });

  it('gives every opening unit canonical art', () => {
    const world = createPhase6SkirmishWorld();

    const model = createBattlefieldRenderModel(
      world,
      projection,
      null,
    );

    const missing = model.units
      .filter(unit => unit.asset === null)
      .map(unit => unit.id);

    expect(missing).toEqual([]);
  });
});
