import type {
  BoardProjection,
} from '../board/projection';
import {
  getBattlefieldCameraState,
} from '../camera/battlefield-camera-store';
import {
  applyCameraToProjection,
} from '../camera/camera-projection';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResponsiveBattlefieldLayout {
  board: Rect;
  boardRender: Rect;
  hud: Rect;
  projection: BoardProjection;
  gameplayVisible: boolean;
  rotatePromptVisible: boolean;
}

const ASPECT = 16 / 9;

function applyCameraToRect(
  rect: Rect,
  viewport: Rect,
): Rect {
  const camera = getBattlefieldCameraState();
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;

  return {
    x:
      centerX +
      (rect.x - centerX) * camera.zoom +
      camera.panX,
    y:
      centerY +
      (rect.y - centerY) * camera.zoom +
      camera.panY,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom,
  };
}

export function createResponsiveBattlefieldLayout(
  viewportWidth: number,
  viewportHeight: number,
): ResponsiveBattlefieldLayout {
  const landscape =
    viewportWidth >= viewportHeight;

  const gameplayVisible =
    landscape;

  const rotatePromptVisible =
    !landscape;

  const topHudHeight =
    viewportHeight * 0.12;

  const bottomHudHeight =
    viewportHeight *
    (landscape ? 0.18 : 0.22);

  const battlefieldY =
    topHudHeight;

  const battlefieldHeight =
    Math.max(
      1,
      viewportHeight -
        topHudHeight -
        bottomHudHeight,
    );

  const board: Rect = {
    x: 0,
    y: battlefieldY,
    width: viewportWidth,
    height: battlefieldHeight,
  };

  let renderWidth =
    viewportWidth;

  let renderHeight =
    renderWidth / ASPECT;

  if (renderHeight < battlefieldHeight) {
    renderHeight =
      battlefieldHeight;

    renderWidth =
      renderHeight * ASPECT;
  }

  const baseBoardRender: Rect = {
    x:
      (viewportWidth -
        renderWidth) /
      2,
    y:
      battlefieldY +
      (
        battlefieldHeight -
        renderHeight
      ) /
      2,
    width:
      renderWidth,
    height:
      renderHeight,
  };

  const scaleX =
    baseBoardRender.width / 1600;

  const scaleY =
    baseBoardRender.height / 900;

  const baseProjection: BoardProjection = {
    // Presentation-only 90° rotation of the logical board.
    //
    // Logical y=15 (Victoria side) renders on the LEFT.
    // Logical y=0  (Shadow side) renders on the RIGHT.
    //
    // Simulation coordinates remain unchanged.
    topLeft: {
      x:
        baseBoardRender.x +
        1200 * scaleX,
      y:
        baseBoardRender.y +
        180 * scaleY,
    },

    topRight: {
      x:
        baseBoardRender.x +
        1480 * scaleX,
      y:
        baseBoardRender.y +
        820 * scaleY,
    },

    bottomLeft: {
      x:
        baseBoardRender.x +
        400 * scaleX,
      y:
        baseBoardRender.y +
        180 * scaleY,
    },

    bottomRight: {
      x:
        baseBoardRender.x +
        120 * scaleX,
      y:
        baseBoardRender.y +
        820 * scaleY,
    },
  };

  const camera = getBattlefieldCameraState();
  const boardRender = applyCameraToRect(
    baseBoardRender,
    board,
  );
  const projection = applyCameraToProjection(
    baseProjection,
    camera,
    board,
  );

  return {
    board,
    boardRender,

    hud: {
      x: 0,
      y:
        viewportHeight -
        bottomHudHeight,
      width:
        viewportWidth,
      height:
        bottomHudHeight,
    },

    projection,
    gameplayVisible,
    rotatePromptVisible,
  };
}
