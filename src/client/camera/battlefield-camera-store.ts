import {
  clampBattlefieldCamera,
  createBattlefieldCameraState,
  panBattlefieldCamera,
  zoomBattlefieldCamera,
  type BattlefieldCameraState,
  type CameraBounds,
  type CameraDelta,
} from './battlefield-camera';

let state: BattlefieldCameraState = createBattlefieldCameraState();

export function getBattlefieldCameraState(): BattlefieldCameraState {
  return { ...state };
}

export function setBattlefieldCameraState(
  next: BattlefieldCameraState,
): BattlefieldCameraState {
  state = zoomBattlefieldCamera(
    {
      panX: next.panX,
      panY: next.panY,
      zoom: 1,
    },
    next.zoom,
  );
  return getBattlefieldCameraState();
}

export function panStoredBattlefieldCamera(
  delta: CameraDelta,
  bounds?: CameraBounds,
): BattlefieldCameraState {
  state = panBattlefieldCamera(state, delta);
  if (bounds) {
    state = clampBattlefieldCamera(state, bounds);
  }
  return getBattlefieldCameraState();
}

export function zoomStoredBattlefieldCamera(
  zoom: number,
): BattlefieldCameraState {
  state = zoomBattlefieldCamera(state, zoom);
  return getBattlefieldCameraState();
}

export function resetBattlefieldCamera(): BattlefieldCameraState {
  state = createBattlefieldCameraState();
  return getBattlefieldCameraState();
}
