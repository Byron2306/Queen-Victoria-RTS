import type {
  BoardProjection,
  ScreenPoint,
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
const WORLD_EXPANSION = 24 / 16;

function scalePointAroundViewport(
  point: ScreenPoint,
  viewport: Rect,
  scale: number,
): ScreenPoint {
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;

  return {
    x: centerX + (point.x - centerX) * scale,
    y: centerY + (point.y - centerY) * scale,
  };
}

function scaleRectAroundViewport(
  rect: Rect,
  viewport: Rect,
  scale: number,
): Rect {
  const topLeft = scalePointAroundViewport(
    { x: rect.x, y: rect.y },
    viewport,
    scale,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

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

  const fittedBoardRender: Rect = {
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

  const fittedScaleX =
    fittedBoardRender.width / 1600;

  const fittedScaleY =
    fittedBoardRender.height / 900;

  const fittedProjection: BoardProjection = {
    // Presentation-only 90° rotation of the logical board.
    //
    // Logical y=23 (Victoria side) renders on the LEFT.
    // Logical y=0  (Shadow side) renders on the RIGHT.
    //
    // Simulation coordinates remain unchanged.
    topLeft: {
      x:
        fittedBoardRender.x +
        1200 * fittedScaleX,
      y:
        fittedBoardRender.y +
        180 * fittedScaleY,
    },

    topRight: {
      x:
        fittedBoardRender.x +
        1480 * fittedScaleX,
      y:
        fittedBoardRender.y +
        820 * fittedScaleY,
    },

    bottomLeft: {
      x:
        fittedBoardRender.x +
        400 * fittedScaleX,
      y:
        fittedBoardRender.y +
        180 * fittedScaleY,
    },

    bottomRight: {
      x:
        fittedBoardRender.x +
        120 * fittedScaleX,
      y:
        fittedBoardRender.y +
        820 * fittedScaleY,
    },
  };

  // The logical battlefield grew from 16 to 24 cells. Expand the rendered
  // world by the same 1.5x factor so the apparent tile and unit footprint
  // remains unchanged; the free-roam camera reveals the additional world.
  const expandedBoardRender = scaleRectAroundViewport(
    fittedBoardRender,
    board,
    WORLD_EXPANSION,
  );
  const expandedProjection: BoardProjection = {
    topLeft: scalePointAroundViewport(
      fittedProjection.topLeft,
      board,
      WORLD_EXPANSION,
    ),
    topRight: scalePointAroundViewport(
      fittedProjection.topRight,
      board,
      WORLD_EXPANSION,
    ),
    bottomLeft: scalePointAroundViewport(
      fittedProjection.bottomLeft,
      board,
      WORLD_EXPANSION,
    ),
    bottomRight: scalePointAroundViewport(
      fittedProjection.bottomRight,
      board,
      WORLD_EXPANSION,
    ),
  };

  const camera = getBattlefieldCameraState();
  const boardRender = applyCameraToRect(
    expandedBoardRender,
    board,
  );
  const projection = applyCameraToProjection(
    expandedProjection,
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
