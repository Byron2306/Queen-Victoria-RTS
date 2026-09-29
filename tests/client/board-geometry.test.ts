import { describe, expect, it } from 'vitest';
import {
  screenPointToPlayableCell,
  tileCenter,
  tileFootpoint,
  tilePolygon,
  type BoardProjection,
} from '../../src/client/board/projection';

const projection: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 1600, y: 0 },
  bottomLeft: { x: 0, y: 800 },
  bottomRight: { x: 1600, y: 800 },
};

describe('one visible tile equals one logical tile', () => {
  it('projects each logical cell to its own four-corner polygon', () => {
    const polygon = tilePolygon({ x: 7, y: 7 }, projection);

    expect(polygon).toEqual([
      { x: 700, y: 350 },
      { x: 800, y: 350 },
      { x: 800, y: 400 },
      { x: 700, y: 400 },
    ]);
    expect(tileCenter({ x: 7, y: 7 }, projection)).toEqual({ x: 750, y: 375 });
  });

  it('anchors the unit footpoint inside the exact tile polygon', () => {
    const foot = tileFootpoint({ x: 7, y: 7 }, projection);

    expect(foot.x).toBe(750);
    expect(foot.y).toBeGreaterThan(375);
    expect(foot.y).toBeLessThan(400);
  });

  it('round-trips representative center and edge cells', () => {
    for (const cell of [
      { x: 7, y: 0 },
      { x: 15, y: 7 },
      { x: 0, y: 7 },
      { x: 7, y: 15 },
    ]) {
      const center = tileCenter(cell, projection);
      expect(screenPointToPlayableCell(center, projection)).toEqual(cell);
    }
  });

  it('rejects screen points that land inside rectangular corner voids', () => {
    expect(screenPointToPlayableCell({ x: 50, y: 25 }, projection)).toBeNull();
    expect(screenPointToPlayableCell({ x: 1550, y: 775 }, projection)).toBeNull();
  });
});
