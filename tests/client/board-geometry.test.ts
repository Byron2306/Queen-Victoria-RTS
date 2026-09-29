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
  it('projects each logical cell to its own four-corner polygon on the 24x24 board', () => {
    const polygon = tilePolygon({ x: 11, y: 11 }, projection);

    expect(polygon[0]!.x).toBeCloseTo(733.3333333333);
    expect(polygon[0]!.y).toBeCloseTo(366.6666666667);
    expect(polygon[1]).toEqual({ x: 800, y: 366.66666666666663 });
    expect(polygon[2]).toEqual({ x: 800, y: 400 });
    expect(polygon[3]!.x).toBeCloseTo(733.3333333333);
    expect(polygon[3]!.y).toBe(400);

    const center = tileCenter({ x: 11, y: 11 }, projection);
    expect(center.x).toBeCloseTo(766.6666666667);
    expect(center.y).toBeCloseTo(383.3333333333);
  });

  it('anchors the unit footpoint inside the exact tile polygon', () => {
    const center = tileCenter({ x: 11, y: 11 }, projection);
    const foot = tileFootpoint({ x: 11, y: 11 }, projection);

    expect(foot.x).toBeCloseTo(center.x);
    expect(foot.y).toBeGreaterThan(center.y);
    expect(foot.y).toBeLessThan(400);
  });

  it('round-trips representative center and edge cells', () => {
    for (const cell of [
      { x: 11, y: 0 },
      { x: 23, y: 11 },
      { x: 0, y: 11 },
      { x: 12, y: 23 },
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
