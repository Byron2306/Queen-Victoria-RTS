import type {
  BoardProjection,
} from '../board/projection';

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

  const boardRender: Rect = {
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
    boardRender.width / 1600;

  const scaleY =
    boardRender.height / 900;

  const projection: BoardProjection = {
    // Presentation-only 90° rotation of the logical board.
    //
    // Logical y=15 (Victoria side) renders on the LEFT.
    // Logical y=0  (Shadow side) renders on the RIGHT.
    //
    // Simulation coordinates remain unchanged.
    topLeft: {
      x:
        boardRender.x +
        1200 * scaleX,
      y:
        boardRender.y +
        180 * scaleY,
    },

    topRight: {
      x:
        boardRender.x +
        1480 * scaleX,
      y:
        boardRender.y +
        820 * scaleY,
    },

    bottomLeft: {
      x:
        boardRender.x +
        400 * scaleX,
      y:
        boardRender.y +
        180 * scaleY,
    },

    bottomRight: {
      x:
        boardRender.x +
        120 * scaleX,
      y:
        boardRender.y +
        820 * scaleY,
    },
  };

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
