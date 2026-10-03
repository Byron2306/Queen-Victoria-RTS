import { describe, expect, it } from 'vitest';
import { tileId } from '../../src/sim/board-topology';
import { tilePolygon, type BoardProjection } from '../../src/client/board/projection';
import { createSelectionGeometryOverlay } from '../../src/client/render/selection-geometry-overlay';
import {
  createTriptychOrderVisuals,
  createTriptychStrategicOverlay,
} from '../../src/client/render/triptych-presentation';
import { buildFortification } from '../../src/sim/fortifications';
import { queueBanner } from '../../src/sim/polarity';
import {
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import { createWorld } from '../../src/sim/world';
import type { TacticalOrder } from '../../src/sim/orders';

const projection: BoardProjection = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 900, y: 160 },
  bottomLeft: { x: 160, y: 900 },
  bottomRight: { x: 940, y: 820 },
};

describe('Royal Triptych presentation model', () => {
  it('uses the exact projected tile polygon for selection and every legal move', () => {
    const world = createWorld([
      { id: 'victoria-knight', faction: 'victoria', kind: 'knight', position: { x: 7, y: 10 } },
    ]);
    const overlay = createSelectionGeometryOverlay(world, 'victoria-knight', projection);

    expect(overlay.selectedPolygon).toEqual(tilePolygon({ x: 7, y: 10 }, projection));
    expect(overlay.destinations.length).toBeGreaterThan(0);
    for (const destination of overlay.destinations) {
      expect(destination.polygon).toEqual(tilePolygon(destination.cell, projection));
    }
  });

  it('gives Attack, Assault and Reinforce distinct staged visual semantics', () => {
    const world = createWorld([
      { id: 'knight', faction: 'victoria', kind: 'knight', position: { x: 7, y: 10 } },
      { id: 'rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 12 } },
      { id: 'enemy', faction: 'obsidian', kind: 'pawn', position: { x: 9, y: 11 } },
    ]);
    const orders: TacticalOrder[] = [
      { orderId:'attack', kind:'attack', faction:'victoria', unitId:'knight', targetUnitId:'enemy', issuedRound:1, commandCost:1 },
      { orderId:'assault', kind:'assault', faction:'victoria', unitId:'knight', targetUnitId:'enemy', issuedRound:1, commandCost:1 },
      { orderId:'reinforce', kind:'reinforce', faction:'victoria', unitId:'rook', supportedUnitId:'knight', rootOrderId:'assault', issuedRound:1, commandCost:1 },
    ];

    const visuals = createTriptychOrderVisuals(world, orders, projection);
    expect(visuals.find(v => v.orderId === 'attack')?.style).toBe('attack');
    expect(visuals.find(v => v.orderId === 'assault')?.style).toBe('assault');
    expect(visuals.find(v => v.orderId === 'reinforce')?.style).toBe('reinforce');
    expect(visuals.find(v => v.orderId === 'reinforce')?.toUnitId).toBe('knight');
  });

  it('renders faction control, banners and fortifications as independent overlay records', () => {
    const cell = { x: 7, y: 10 } as const;
    let world = createWorld([
      { id: 'settler', faction: 'victoria', kind: 'pawn', position: cell },
    ]);
    const id = tileId(cell);
    const tiles = strategicTiles(world);
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles: {
          ...tiles,
          [id]: { ...tiles[id]!, factionControl: 'victoria' },
        },
      } as TriptychTerritoryState,
    };
    world = queueBanner(world, {
      bannerId: 'banner-1', faction: 'victoria', cell,
    }).state;
    world = buildFortification(world, {
      id: 'wall-1', faction: 'victoria', cell,
    }).state;

    const overlay = createTriptychStrategicOverlay(world, projection);
    expect(overlay.territory.find(t => t.cell.x === 7 && t.cell.y === 10)).toMatchObject({ faction: 'victoria' });
    expect(overlay.banners).toContainEqual(expect.objectContaining({ id: 'banner-1', faction: 'victoria' }));
    expect(overlay.fortifications).toContainEqual(expect.objectContaining({ id: 'wall-1', durability: 3 }));
  });
});
