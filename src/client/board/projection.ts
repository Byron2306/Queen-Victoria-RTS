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

function bilinearPoint(
  projection: BoardProjection,
  u: number,
  v: number,
): ScreenPoint {
  const top = {
    x: lerp(projection.topLeft.x, projection.topRight.x, u),
    y: lerp(projection.topLeft.y, projection.topRight.y, u),
  };

  const bottom = {
    x: lerp(projection.bottomLeft.x, projection.bottomRight.x, u),
    y: lerp(projection.bottomLeft.y, projection.bottomRight.y, u),
  };

  return {
    x: lerp(top.x, bottom.x, v),
    y: lerp(top.y, bottom.y, v),
  };
}

export function screenToBoardCell(
  point: ScreenPoint,
  projection: BoardProjection,
): BoardCell | null {
  let u = 0.5;
  let v = 0.5;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const projected = bilinearPoint(projection, u, v);

    const errorX = projected.x - point.x;
    const errorY = projected.y - point.y;

    const duX =
      (1 - v) *
        (projection.topRight.x - projection.topLeft.x) +
      v *
        (projection.bottomRight.x - projection.bottomLeft.x);

    const duY =
      (1 - v) *
        (projection.topRight.y - projection.topLeft.y) +
      v *
        (projection.bottomRight.y - projection.bottomLeft.y);

    const dvX =
      (1 - u) *
        (projection.bottomLeft.x - projection.topLeft.x) +
      u *
        (projection.bottomRight.x - projection.topRight.x);

    const dvY =
      (1 - u) *
        (projection.bottomLeft.y - projection.topLeft.y) +
      u *
        (projection.bottomRight.y - projection.topRight.y);

    const determinant =
      duX * dvY -
      duY * dvX;

    if (Math.abs(determinant) < 1e-9) {
      return null;
    }

    const deltaU =
      (errorX * dvY - errorY * dvX) /
      determinant;

    const deltaV =
      (duX * errorY - duY * errorX) /
      determinant;

    u -= deltaU;
    v -= deltaV;

    if (
      Math.abs(deltaU) < 1e-9 &&
      Math.abs(deltaV) < 1e-9
    ) {
      break;
    }
  }

  const epsilon = 1e-7;

  if (
    u < -epsilon ||
    v < -epsilon ||
    u > 1 + epsilon ||
    v > 1 + epsilon
  ) {
    return null;
  }

  const boundedU = Math.min(1, Math.max(0, u));
  const boundedV = Math.min(1, Math.max(0, v));

  return {
    x: Math.min(
      BOARD_SIZE - 1,
      Math.floor(boundedU * BOARD_SIZE),
    ),
    y: Math.min(
      BOARD_SIZE - 1,
      Math.floor(boundedV * BOARD_SIZE),
    ),
  };
}
