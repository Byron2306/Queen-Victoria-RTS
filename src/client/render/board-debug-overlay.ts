import type {
  BoardProjection,
  ScreenPoint,
} from '../board/projection';

import {
  boardCellToScreen,
} from '../board/projection';

import {
  legalDestinationsForUnit,
} from '../input/legal-destinations';

import type {
  WorldState,
} from '../../sim/types';

export interface BoardDebugCell {
  x: number;
  y: number;
  anchor: ScreenPoint;
  occupantId: string | null;
  selected: boolean;
  legalDestination: boolean;
}

export interface BoardDebugOverlay {
  cells: readonly BoardDebugCell[];
}

export function createBoardDebugOverlay(
  world: WorldState,
  selectedUnitId: string | null,
  projection: BoardProjection,
): BoardDebugOverlay {
  const legal = new Set(
    selectedUnitId
      ? legalDestinationsForUnit(
          world,
          selectedUnitId,
        ).map(
          cell =>
            `${cell.x},${cell.y}`,
        )
      : [],
  );

  const selected =
    selectedUnitId
      ? world.units[selectedUnitId]
      : undefined;

  const cells: BoardDebugCell[] = [];

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const key = `${x},${y}`;

      cells.push({
        x,
        y,
        anchor: boardCellToScreen(
          { x, y },
          projection,
        ),
        occupantId:
          world.occupancy[key] ?? null,
        selected:
          selected?.position.x === x &&
          selected?.position.y === y,
        legalDestination:
          legal.has(key),
      });
    }
  }

  return { cells };
}
