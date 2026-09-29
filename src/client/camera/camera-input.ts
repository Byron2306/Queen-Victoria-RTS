export interface CameraDirectionState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface CameraPoint {
  x: number;
  y: number;
}

export interface CameraPanDelta {
  x: number;
  y: number;
}

const WHEEL_ZOOM_FACTOR = 1.1;

export function keyboardPanDelta(
  directions: CameraDirectionState,
  elapsedMs: number,
  pixelsPerSecond: number,
): CameraPanDelta {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const distance = pixelsPerSecond * seconds;

  const horizontal =
    (directions.left ? 1 : 0) -
    (directions.right ? 1 : 0);
  const vertical =
    (directions.down ? -1 : 0) +
    (directions.up ? 1 : 0);

  return {
    x: horizontal * distance,
    y: vertical * distance,
  };
}

export function dragPanDelta(
  from: CameraPoint,
  to: CameraPoint,
): CameraPanDelta {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

export function wheelZoomTarget(
  currentZoom: number,
  wheelDirection: number,
): number {
  if (wheelDirection < 0) {
    return currentZoom * WHEEL_ZOOM_FACTOR;
  }

  if (wheelDirection > 0) {
    return currentZoom / WHEEL_ZOOM_FACTOR;
  }

  return currentZoom;
}
