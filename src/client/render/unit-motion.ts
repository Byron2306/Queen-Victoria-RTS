import type {
  ScreenPoint,
} from '../board/projection';

export const UNIT_MOVE_VISUAL_MS = 500;

export function interpolateUnitMotion(
  from: ScreenPoint,
  to: ScreenPoint,
  elapsedMs: number,
): ScreenPoint {
  const progress = Math.min(
    1,
    Math.max(
      0,
      elapsedMs / UNIT_MOVE_VISUAL_MS,
    ),
  );

  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}
