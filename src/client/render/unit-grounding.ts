import {
  tileCenter,
  type BoardCell,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';

/**
 * All live unit art is grounded by its bottom-centre pixel anchor.
 * Phaser sprites must use this origin so the visible feet/base land on the
 * exact logical tile centre returned by unitGroundAnchor().
 */
export const UNIT_SPRITE_ORIGIN = {
  x: 0.5,
  y: 1,
} as const;

/**
 * Triptych doctrine: the visible feet/base of every unit adheres to the exact
 * centre of its authoritative logical tile. Camera transforms are already
 * encoded in the supplied projection, so this stays true through pan/zoom.
 */
export function unitGroundAnchor(
  cell: BoardCell,
  projection: BoardProjection,
): ScreenPoint {
  return tileCenter(cell, projection);
}
