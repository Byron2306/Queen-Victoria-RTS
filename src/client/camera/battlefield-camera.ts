export interface BattlefieldCameraState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CameraDelta {
  x: number;
  y: number;
}

export interface CameraPoint {
  x: number;
  y: number;
}

export const MIN_BATTLEFIELD_ZOOM = 0.6;
export const MAX_BATTLEFIELD_ZOOM = 2.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createBattlefieldCameraState(): BattlefieldCameraState {
  return {
    panX: 0,
    panY: 0,
    zoom: 1,
  };
}

export function panBattlefieldCamera(
  state: BattlefieldCameraState,
  delta: CameraDelta,
): BattlefieldCameraState {
  return {
    ...state,
    panX: state.panX + delta.x,
    panY: state.panY + delta.y,
  };
}

export function zoomBattlefieldCamera(
  state: BattlefieldCameraState,
  zoom: number,
): BattlefieldCameraState {
  return {
    ...state,
    zoom: clamp(
      zoom,
      MIN_BATTLEFIELD_ZOOM,
      MAX_BATTLEFIELD_ZOOM,
    ),
  };
}

export function centerBattlefieldCameraOn(
  state: BattlefieldCameraState,
  baseAnchor: CameraPoint,
  viewportFocus: CameraPoint,
): BattlefieldCameraState {
  return {
    ...state,
    panX:
      -(baseAnchor.x - viewportFocus.x) *
      state.zoom,
    panY:
      -(baseAnchor.y - viewportFocus.y) *
      state.zoom,
  };
}

export function clampBattlefieldCamera(
  state: BattlefieldCameraState,
  bounds: CameraBounds,
): BattlefieldCameraState {
  return {
    ...state,
    panX: clamp(state.panX, bounds.minX, bounds.maxX),
    panY: clamp(state.panY, bounds.minY, bounds.maxY),
  };
}
