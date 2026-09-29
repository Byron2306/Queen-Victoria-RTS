import { BOARD_HEIGHT } from '../../sim/board-topology';

export interface UnitVisualFootprintInput {
  boardY: number;
  cellHeight: number;
}

export function unitVisualHeightForRank(
  input: UnitVisualFootprintInput,
): number {
  const maxRow = BOARD_HEIGHT - 1;
  const clampedY = Math.max(
    0,
    Math.min(maxRow, input.boardY),
  );

  const t = maxRow > 0 ? clampedY / maxRow : 0;

  // Perspective remains intentionally subtle: far-side pieces are slightly
  // smaller than near-side pieces, but the logical cell height now comes from
  // the authoritative 24-row Triptych battlefield.
  const farScale = 1.82;
  const nearScale = 2.10;

  const scale =
    farScale +
    (nearScale - farScale) * t;

  return input.cellHeight * scale;
}
