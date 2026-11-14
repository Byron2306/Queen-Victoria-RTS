import { getBattlefieldTopology } from '../../sim/battlefield-topology-authority';

export interface UnitVisualFootprintInput {
  boardY: number;
  cellHeight: number;
  boardHeight?: number;
}

export function unitVisualHeightForRank(
  input: UnitVisualFootprintInput,
): number {
  const boardHeight = input.boardHeight
    ?? getBattlefieldTopology('triptych-v1').height;
  const maxRow = boardHeight - 1;
  const clampedY = Math.max(
    0,
    Math.min(maxRow, input.boardY),
  );

  const t = maxRow > 0 ? clampedY / maxRow : 0;

  // Perspective remains intentionally subtle: far-side pieces are slightly
  // smaller than near-side pieces, while row ranking follows the selected
  // battlefield height supplied by the live scene.
  const farScale = 1.82;
  const nearScale = 2.10;

  const scale =
    farScale +
    (nearScale - farScale) * t;

  return input.cellHeight * scale;
}

/** Bound art to its actual projected tile; square squad sheets must not span adjacent units. */
export function unitDisplaySize(
  sourceWidth: number,
  sourceHeight: number,
  preferredHeight: number,
  polygon: readonly {x: number; y: number}[],
): {width: number; height: number} {
  const width = Math.max(...polygon.map(p => p.x))-Math.min(...polygon.map(p => p.x));
  const height = Math.max(...polygon.map(p => p.y))-Math.min(...polygon.map(p => p.y));
  const aspect = sourceWidth / Math.max(1,sourceHeight);
  const fittedHeight = Math.min(preferredHeight, height*1.7, width*.88/Math.max(.01,aspect));
  return {width:fittedHeight*aspect,height:fittedHeight};
}
