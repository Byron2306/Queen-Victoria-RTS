import { describe, expect, it } from 'vitest';
import { tileCenter, type BoardProjection } from '../../src/client/board/projection';
import { applyCameraToProjection } from '../../src/client/camera/camera-projection';
import { createBattlefieldRenderModel } from '../../src/client/render/battlefield-model';
import {
  UNIT_SPRITE_ORIGIN,
  unitGroundAnchor,
} from '../../src/client/render/unit-grounding';
import { createWorld } from '../../src/sim/world';

const projection: BoardProjection = {
  topLeft: { x: 1200, y: 180 },
  topRight: { x: 1480, y: 820 },
  bottomLeft: { x: 400, y: 180 },
  bottomRight: { x: 120, y: 820 },
};

const cells = [
  { x: 1, y: 11 },   // west theatre
  { x: 11, y: 11 },  // centre
  { x: 22, y: 12 },  // east theatre
  { x: 11, y: 1 },   // north corridor
  { x: 12, y: 22 },  // south corridor
] as const;

describe('Triptych unit grounding', () => {
  it('pins the bottom-centre of every piece to the exact logical tile centre', () => {
    expect(UNIT_SPRITE_ORIGIN).toEqual({ x: 0.5, y: 1 });

    for (const cell of cells) {
      expect(unitGroundAnchor(cell, projection)).toEqual(tileCenter(cell, projection));
    }
  });

  it('keeps the same tile-centre contract after camera pan and zoom', () => {
    const transformed = applyCameraToProjection(
      projection,
      { panX: 287, panY: -143, zoom: 1.65 },
      { x: 0, y: 108, width: 1600, height: 630 },
    );

    for (const cell of cells) {
      expect(unitGroundAnchor(cell, transformed)).toEqual(tileCenter(cell, transformed));
    }
  });

  it('places live render-model units on those exact anchors across the battlefield', () => {
    const world = createWorld(cells.map((position, index) => ({
      id: `ground-${index}`,
      faction: index < 3 ? 'victoria' as const : 'obsidian' as const,
      kind: 'pawn' as const,
      position: { ...position },
    })));

    const model = createBattlefieldRenderModel(world, projection, null);

    for (const unit of model.units) {
      const position = world.units[unit.id]!.position;
      expect(unit.screen).toEqual(tileCenter(position, projection));
    }
  });
});
