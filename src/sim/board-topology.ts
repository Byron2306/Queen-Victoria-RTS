import type { Coord, Faction } from './types';

export type TileId = `${number},${number}`;
export type TilePolarity = 'black' | 'white';
export type FactionControl = 'neutral' | Faction;
export type BoardCell = Coord;

export interface BoardTile {
  id: TileId;
  x: number;
  y: number;
  polarity: TilePolarity;
  factionControl: FactionControl;
}

export const BOARD_WIDTH = 32 as const;
export const BOARD_HEIGHT = 32 as const;

// Coalesced Triptych geometry: a full-width ten-row war theatre crossed by
// an eight-tile north/south strategic corridor. The apparent unit footprint
// remains stable by expanding the rendered world to 2x the old 16-cell scale.
const SPINE_MIN = 12;
const SPINE_MAX = 19;
const THEATRE_MIN = 11;
const THEATRE_MAX = 20;

export function isPlayableCell(x: number, y: number): boolean {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= BOARD_WIDTH ||
    y >= BOARD_HEIGHT
  ) {
    return false;
  }

  const inVerticalSpine = x >= SPINE_MIN && x <= SPINE_MAX;
  const inCentralTheatre = y >= THEATRE_MIN && y <= THEATRE_MAX;

  return inVerticalSpine || inCentralTheatre;
}

export function tileId(cell: BoardCell): TileId {
  return `${cell.x},${cell.y}`;
}

export function allPlayableCells(): BoardCell[] {
  const cells: BoardCell[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      if (isPlayableCell(x, y)) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

export function orthogonalNeighbors(x: number, y: number): BoardCell[] {
  const candidates: BoardCell[] = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];

  return candidates.filter((cell) => isPlayableCell(cell.x, cell.y));
}

export function createBoardTile(
  cell: BoardCell,
  factionControl: FactionControl = 'neutral',
): BoardTile {
  if (!isPlayableCell(cell.x, cell.y)) {
    throw new RangeError(`Cell ${cell.x},${cell.y} is outside the royal battlefield`);
  }

  return {
    id: tileId(cell),
    x: cell.x,
    y: cell.y,
    polarity: (cell.x + cell.y) % 2 === 0 ? 'white' : 'black',
    factionControl,
  };
}
