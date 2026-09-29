import { describe, expect, it } from 'vitest';

import {
  dragPanDelta,
  keyboardPanDelta,
  wheelZoomTarget,
} from '../../src/client/camera/camera-input';

describe('battlefield camera input intents', () => {
  it('converts keyboard navigation into deterministic time-scaled pan', () => {
    expect(keyboardPanDelta(
      { left: false, right: true, up: true, down: false },
      500,
      400,
    )).toEqual({
      x: -200,
      y: 200,
    });
  });

  it('cancels opposing keyboard directions', () => {
    expect(keyboardPanDelta(
      { left: true, right: true, up: true, down: true },
      1000,
      400,
    )).toEqual({ x: 0, y: 0 });
  });

  it('uses direct pointer displacement for drag panning', () => {
    expect(dragPanDelta(
      { x: 120, y: 80 },
      { x: 165, y: 55 },
    )).toEqual({ x: 45, y: -25 });
  });

  it('zooms in on wheel-up and out on wheel-down', () => {
    expect(wheelZoomTarget(1, -1)).toBeCloseTo(1.1);
    expect(wheelZoomTarget(1, 1)).toBeCloseTo(1 / 1.1);
    expect(wheelZoomTarget(1.5, 0)).toBe(1.5);
  });
});
