import type { Coord } from './types';

export const TRIPTYCH_V2_WIDTH = 32 as const;
export const TRIPTYCH_V2_HEIGHT = 32 as const;

const SPINE_MIN = 12;
const SPINE_MAX = 19;
const THEATRE_MIN = 11;
const THEATRE_MAX = 20;

export function isTriptychV2PlayableCell(x: number, y: number): boolean {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= TRIPTYCH_V2_WIDTH ||
    y >= TRIPTYCH_V2_HEIGHT
  ) {
    return false;
  }

  const inVerticalSpine = x >= SPINE_MIN && x <= SPINE_MAX;
  const inCentralTheatre = y >= THEATRE_MIN && y <= THEATRE_MAX;

  return inVerticalSpine || inCentralTheatre;
}

export function allTriptychV2PlayableCells(): Coord[] {
  const cells: Coord[] = [];

  for (let y = 0; y < TRIPTYCH_V2_HEIGHT; y += 1) {
    for (let x = 0; x < TRIPTYCH_V2_WIDTH; x += 1) {
      if (isTriptychV2PlayableCell(x, y)) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

export function triptychV2OrthogonalNeighbors(
  x: number,
  y: number,
): Coord[] {
  const candidates: Coord[] = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];

  return candidates.filter((cell) =>
    isTriptychV2PlayableCell(cell.x, cell.y),
  );
}
