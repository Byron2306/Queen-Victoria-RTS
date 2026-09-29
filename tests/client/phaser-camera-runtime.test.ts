import { afterEach, describe, expect, it } from 'vitest';

import { screenToBoardCell } from '../../src/client/board/projection';
import {
  resetBattlefieldCamera,
  setBattlefieldCameraState,
} from '../../src/client/camera/battlefield-camera-store';
import { createResponsiveBattlefieldLayout } from '../../src/client/render/responsive-battlefield';

afterEach(() => {
  resetBattlefieldCamera();
});

describe('Triptych live camera layout runtime', () => {
  it('expands the 24x24 world 1.5x before camera zoom so tile footprint stays stable', () => {
    const layout = createResponsiveBattlefieldLayout(1600, 900);

    expect(layout.boardRender.width).toBeCloseTo(2400);
    expect(layout.boardRender.height).toBeCloseTo(1350);
    expect(layout.boardRender.x).toBeCloseTo(-400);
    expect(layout.boardRender.y).toBeCloseTo(-252);
  });

  it('moves and zooms the battlefield while leaving the HUD rectangle anchored', () => {
    const base = createResponsiveBattlefieldLayout(1600, 900);

    setBattlefieldCameraState({
      panX: 140,
      panY: -60,
      zoom: 1.5,
    });

    const moved = createResponsiveBattlefieldLayout(1600, 900);

    expect(moved.hud).toEqual(base.hud);
    expect(moved.boardRender.x).not.toBe(base.boardRender.x);
    expect(moved.boardRender.y).not.toBe(base.boardRender.y);
    expect(moved.boardRender.width).toBeCloseTo(base.boardRender.width * 1.5);
    expect(moved.projection.topLeft).not.toEqual(base.projection.topLeft);
  });

  it('keeps pointer-to-cell mapping coherent after pan and zoom', () => {
    setBattlefieldCameraState({
      panX: -180,
      panY: 90,
      zoom: 1.4,
    });

    const layout = createResponsiveBattlefieldLayout(1600, 900);
    const centre = {
      x: (
        layout.projection.topLeft.x +
        layout.projection.topRight.x +
        layout.projection.bottomLeft.x +
        layout.projection.bottomRight.x
      ) / 4,
      y: (
        layout.projection.topLeft.y +
        layout.projection.topRight.y +
        layout.projection.bottomLeft.y +
        layout.projection.bottomRight.y
      ) / 4,
    };

    expect(screenToBoardCell(centre, layout.projection))
      .toEqual({ x: 12, y: 12 });
  });
});
