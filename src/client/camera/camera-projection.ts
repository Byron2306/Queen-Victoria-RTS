import type {
  BoardProjection,
  ScreenPoint,
} from '../board/projection';
import type {
  BattlefieldCameraState,
} from './battlefield-camera';

export interface CameraViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

function viewportCenter(viewport: CameraViewport): ScreenPoint {
  return {
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
  };
}

function applyCameraToPoint(
  point: ScreenPoint,
  camera: BattlefieldCameraState,
  viewport: CameraViewport,
): ScreenPoint {
  const center = viewportCenter(viewport);
  return {
    x: center.x + (point.x - center.x) * camera.zoom + camera.panX,
    y: center.y + (point.y - center.y) * camera.zoom + camera.panY,
  };
}

export function cameraPointToBasePoint(
  point: ScreenPoint,
  camera: BattlefieldCameraState,
  viewport: CameraViewport,
): ScreenPoint {
  const center = viewportCenter(viewport);
  return {
    x: center.x + (point.x - center.x - camera.panX) / camera.zoom,
    y: center.y + (point.y - center.y - camera.panY) / camera.zoom,
  };
}

export function applyCameraToProjection(
  projection: BoardProjection,
  camera: BattlefieldCameraState,
  viewport: CameraViewport,
): BoardProjection {
  return {
    topLeft: applyCameraToPoint(projection.topLeft, camera, viewport),
    topRight: applyCameraToPoint(projection.topRight, camera, viewport),
    bottomLeft: applyCameraToPoint(projection.bottomLeft, camera, viewport),
    bottomRight: applyCameraToPoint(projection.bottomRight, camera, viewport),
  };
}
