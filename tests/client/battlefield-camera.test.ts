import { describe, expect, it } from 'vitest';

import {
  clampBattlefieldCamera,
  createBattlefieldCameraState,
  panBattlefieldCamera,
  zoomBattlefieldCamera,
} from '../../src/client/camera/battlefield-camera';

describe('free-roam battlefield camera state', () => {
  it('starts centered at neutral pan with unit zoom', () => {
    expect(createBattlefieldCameraState()).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
    });
  });

  it('pans immutably by screen-space delta', () => {
    const start = createBattlefieldCameraState();
    const next = panBattlefieldCamera(start, { x: 120, y: -45 });

    expect(next).toEqual({ panX: 120, panY: -45, zoom: 1 });
    expect(start).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it('clamps zoom to the supported tactical range', () => {
    const start = createBattlefieldCameraState();

    expect(zoomBattlefieldCamera(start, 0.01).zoom).toBe(0.6);
    expect(zoomBattlefieldCamera(start, 99).zoom).toBe(2.4);
    expect(zoomBattlefieldCamera(start, 1.5).zoom).toBe(1.5);
  });

  it('clamps pan to explicit world-space camera bounds', () => {
    const wild = {
      panX: 999,
      panY: -999,
      zoom: 1.25,
    } as const;

    expect(clampBattlefieldCamera(wild, {
      minX: -240,
      maxX: 320,
      minY: -180,
      maxY: 210,
    })).toEqual({
      panX: 320,
      panY: -180,
      zoom: 1.25,
    });
  });
});
