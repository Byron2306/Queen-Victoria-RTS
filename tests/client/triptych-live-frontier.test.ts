import { expect, it } from 'vitest';
import { createTriptychBattlefieldSceneClass } from '../../src/client/phaser/triptych-battlefield-scene';

class FakeSceneBase {
  public scale = { width: 1600, height: 900 };
  constructor(_config?: unknown) {}
}

it('renders the full V2 fog frontier without treating outer cells as out of bounds', () => {
  const Scene = createTriptychBattlefieldSceneClass(FakeSceneBase);
  const scene = new Scene() as any;
  const polygons: number[][] = [];
  scene.add = {
    polygon(_x: number, _y: number, points: number[]) {
      polygons.push(points);
      return { setStrokeStyle() { return this; }, setDepth() { return this; } };
    },
  };

  expect(() => scene.refreshBattlefieldIntelligence(true)).not.toThrow();
  expect(polygons).toHaveLength(496);
  expect(polygons.every(points => points.length === 8 && points.every(Number.isFinite)))
    .toBe(true);
});

it('draws attack target markers for visible enemies outside legacy bounds', async () => {
  const { createWorld } = await import('../../src/sim/world');
  const { refreshAllIntelligence } = await import('../../src/sim/intelligence');
  const Scene = createTriptychBattlefieldSceneClass(FakeSceneBase);
  const scene = new Scene() as any;
  scene.controller.runtime.world = refreshAllIntelligence(createWorld([
    { id: 'victoria-queen', faction: 'victoria', kind: 'queen', position: { x: 27, y: 18 } },
    { id: 'obsidian-rook-a', faction: 'obsidian', kind: 'rook', position: { x: 28, y: 18 } },
  ], { topologyId: 'triptych-v2' }));
  scene.selectedUnitId = 'victoria-queen';
  scene.currentSelectionOverlay = { selectedAnchor: { x: 1, y: 1 }, selectedPolygon: [], destinations: [] };
  const polygons: unknown[] = [];
  scene.drawTilePolygon = (points: unknown) => { polygons.push(points); return null; };
  expect(() => scene.redrawRoyalMoveMarkers()).not.toThrow();
  expect(polygons).toHaveLength(2);
  expect(polygons[1]).toHaveLength(4);
});
