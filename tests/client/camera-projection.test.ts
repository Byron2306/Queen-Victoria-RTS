import { describe, expect, it } from 'vitest';

import {
  applyCameraToProjection,
  cameraPointToBasePoint,
} from '../../src/client/camera/camera-projection';
import type { BoardProjection } from '../../src/client/board/projection';

const base: BoardProjection = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 300, y: 100 },
  bottomLeft: { x: 100, y: 300 },
  bottomRight: { x: 300, y: 300 },
};

const viewport = {
  x: 0,
  y: 0,
  width: 400,
  height: 400,
};

describe('battlefield camera projection', () => {
  it('translates every board projection anchor by camera pan', () => {
    const projected = applyCameraToProjection(
      base,
      { panX: 25, panY: -40, zoom: 1 },
      viewport,
    );

    expect(projected.topLeft).toEqual({ x: 125, y: 60 });
    expect(projected.bottomRight).toEqual({ x: 325, y: 260 });
  });

  it('zooms around the viewport centre', () => {
    const projected = applyCameraToProjection(
      base,
      { panX: 0, panY: 0, zoom: 2 },
      viewport,
    );

    expect(projected.topLeft).toEqual({ x: 0, y: 0 });
    expect(projected.bottomRight).toEqual({ x: 400, y: 400 });
  });

  it('round-trips camera-space points back to their base screen position', () => {
    const camera = { panX: 35, panY: -20, zoom: 1.5 } as const;
    const point = { x: 275, y: 145 } as const;

    const transformedProjection = applyCameraToProjection(base, camera, viewport);
    expect(transformedProjection.topLeft).not.toEqual(base.topLeft);

    const cameraSpacePoint = {
      x: 200 + (point.x - 200) * camera.zoom + camera.panX,
      y: 200 + (point.y - 200) * camera.zoom + camera.panY,
    };

    expect(cameraPointToBasePoint(cameraSpacePoint, camera, viewport))
      .toEqual(point);
  });
});
