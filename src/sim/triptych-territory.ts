import {
  tileId,
  type BoardCell,
} from './board-topology';
import { strategicTiles, topologyForWorld } from './territory';
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

function cellsForRows(
  minY: number,
  maxY: number,
  minX: number,
  maxX: number,
): BoardCell[] {
  const cells: BoardCell[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    cells.push(...cellsForRow(y, minX, maxX));
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

export const VICTORIA_OPENING_TERRITORY_V2: readonly BoardCell[] =
  cellsForRows(11, 20, 0, 7);

export const OBSIDIAN_OPENING_TERRITORY_V2: readonly BoardCell[] =
  cellsForRows(11, 20, 24, 31);

export function applyTriptychOpeningTerritory(
  world: WorldState,
): WorldState {
  const tiles = { ...strategicTiles(world) };
  const topology = topologyForWorld(world);
  const victoria = topology.id === 'triptych-v2'
    ? VICTORIA_OPENING_TERRITORY_V2
    : VICTORIA_OPENING_TERRITORY;
  const obsidian = topology.id === 'triptych-v2'
    ? OBSIDIAN_OPENING_TERRITORY_V2
    : OBSIDIAN_OPENING_TERRITORY;

  for (const cell of victoria) {
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: 'victoria',
    };
  }

  for (const cell of obsidian) {
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
