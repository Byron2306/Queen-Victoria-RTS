import {
  tileId,
  type BoardCell,
} from './board-topology';
import { strategicTiles } from './territory';
import type { WorldState } from './types';

function cellsForRows(
  minY: number,
  maxY: number,
  minX: number,
  maxX: number,
): BoardCell[] {
  const cells: BoardCell[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export const VICTORIA_OPENING_TERRITORY: readonly BoardCell[] =
  cellsForRows(11, 20, 0, 7);

export const OBSIDIAN_OPENING_TERRITORY: readonly BoardCell[] =
  VICTORIA_OPENING_TERRITORY.map((cell) => ({
    x: 31 - cell.x,
    y: 31 - cell.y,
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
