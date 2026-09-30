import type {
  BoardProjection,
  ScreenPoint,
} from './projection';

import {
  boardCellToScreen,
  screenToBoardCell,
} from './projection';
import {
  getBattlefieldTopology,
  type BattlefieldTopologyId,
} from '../../sim/battlefield-topology-authority';

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

export function createInteractiveBoardGrid(
  projection: BoardProjection,
  topologyId?: BattlefieldTopologyId,
): InteractiveBoardGrid {
  const cells: InteractiveBoardCell[] = [];
  const boardSize = getBattlefieldTopology(topologyId).width;

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      cells.push({
        x,
        y,
        anchor: boardCellToScreen(
          { x, y },
          projection,
          topologyId,
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
        x >= boardSize ||
        y >= boardSize
      ) {
        return undefined;
      }

      return cells[
        y * boardSize + x
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
          topologyId,
        );

      if (!result) {
        return null;
      }

      if (
        result.x < 0 ||
        result.y < 0 ||
        result.x >= boardSize ||
        result.y >= boardSize
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
