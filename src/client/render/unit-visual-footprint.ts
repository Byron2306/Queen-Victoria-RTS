export interface UnitVisualFootprintInput {
  boardY: number;
  cellHeight: number;
}

export function unitVisualHeightForRank(
  input: UnitVisualFootprintInput,
): number {
  const clampedY = Math.max(
    0,
    Math.min(15, input.boardY),
  );

  const t = clampedY / 15;

  // Visual board reads as 8x8, while simulation is 16x16.
  // So one visible marble tile is roughly 2 logical cells high.
  const farScale = 1.82;
  const nearScale = 2.10;

  const scale =
    farScale +
    (nearScale - farScale) * t;

  return input.cellHeight * scale;
}
