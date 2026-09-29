import type {
  BoardProjection,
  ScreenPoint,
} from './projection';

import {
  boardCellToScreen,
  screenToBoardCell,
} from './projection';

export interface InteractiveBoardCell {
  x: number;
  y: number;
  anchor: ScreenPoint;
}

export interface InteractiveBoardGrid {
  cells: readonly InteractiveBoardCell[];

  cell(
    x: number,
    y: number,
  ): InteractiveBoardCell | undefined;

  hitTest(
    point: ScreenPoint,
  ): Readonly<{
    x: number;
    y: number;
  }> | null;
}

const BOARD_SIZE = 16;

export function createInteractiveBoardGrid(
  projection: BoardProjection,
): InteractiveBoardGrid {
  const cells: InteractiveBoardCell[] = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      cells.push({
        x,
        y,
        anchor: boardCellToScreen(
          { x, y },
          projection,
        ),
      });
    }
  }

  return {
    cells,

    cell(
      x: number,
      y: number,
    ): InteractiveBoardCell | undefined {
      if (
        x < 0 ||
        y < 0 ||
        x >= BOARD_SIZE ||
        y >= BOARD_SIZE
      ) {
        return undefined;
      }

      return cells[
        y * BOARD_SIZE + x
      ];
    },

    hitTest(
      point: ScreenPoint,
    ): Readonly<{
      x: number;
      y: number;
    }> | null {
      const result =
        screenToBoardCell(
          point,
          projection,
        );

      if (!result) {
        return null;
      }

      if (
        result.x < 0 ||
        result.y < 0 ||
        result.x >= BOARD_SIZE ||
        result.y >= BOARD_SIZE
      ) {
        return null;
      }

      return {
        x: result.x,
        y: result.y,
      };
    },
  };
}
