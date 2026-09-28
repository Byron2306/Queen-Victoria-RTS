export const BOARD_SIZE = 16;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface BoardCell {
  x: number;
  y: number;
}

export interface BoardProjection {
  topLeft: ScreenPoint;
  topRight: ScreenPoint;
  bottomLeft: ScreenPoint;
  bottomRight: ScreenPoint;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function assertValidCell(cell: BoardCell): void {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.y < 0 ||
    cell.x >= BOARD_SIZE ||
    cell.y >= BOARD_SIZE
  ) {
    throw new RangeError(
      `Board cell (${cell.x}, ${cell.y}) is outside ${BOARD_SIZE}x${BOARD_SIZE}`
    );
  }
}

export function boardCellToScreen(
  cell: BoardCell,
  projection: BoardProjection,
): ScreenPoint {
  assertValidCell(cell);

  const u = (cell.x + 0.5) / BOARD_SIZE;
  const v = (cell.y + 0.5) / BOARD_SIZE;

  const leftX = lerp(projection.topLeft.x, projection.bottomLeft.x, v);
  const leftY = lerp(projection.topLeft.y, projection.bottomLeft.y, v);

  const rightX = lerp(projection.topRight.x, projection.bottomRight.x, v);
  const rightY = lerp(projection.topRight.y, projection.bottomRight.y, v);

  return {
    x: lerp(leftX, rightX, u),
    y: lerp(leftY, rightY, u),
  };
}
