import {
  tileId,
  type BoardCell,
} from './board-topology';
import { strategicTiles } from './territory';
import type { WorldState } from './types';

function cellsForRow(
  y: number,
  minX: number,
  maxX: number,
): BoardCell[] {
  const cells: BoardCell[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    cells.push({ x, y });
  }
  return cells;
}

export const VICTORIA_OPENING_TERRITORY: readonly BoardCell[] = [
  ...cellsForRow(9, 0, 8),
  ...cellsForRow(10, 0, 5),
  ...cellsForRow(11, 0, 8),
  ...cellsForRow(12, 0, 5),
  ...cellsForRow(13, 0, 8),
];

export const OBSIDIAN_OPENING_TERRITORY: readonly BoardCell[] =
  VICTORIA_OPENING_TERRITORY.map((cell) => ({
    x: 23 - cell.x,
    y: 23 - cell.y,
  }));

export function applyTriptychOpeningTerritory(
  world: WorldState,
): WorldState {
  const tiles = { ...strategicTiles(world) };

  for (const cell of VICTORIA_OPENING_TERRITORY) {
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: 'victoria',
    };
  }

  for (const cell of OBSIDIAN_OPENING_TERRITORY) {
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: 'obsidian',
    };
  }

  return {
    ...world,
    territory: {
      ...world.territory,
      tiles,
    } as WorldState['territory'],
  };
}
