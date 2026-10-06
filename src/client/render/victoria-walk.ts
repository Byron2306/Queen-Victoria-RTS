import { assetUrl } from '../assets/base-url';

export const VICTORIA_WALK_FRAME_MS = 110;

export const VICTORIA_WALK_FRAME_PATHS =
  Array.from(
    { length: 8 },
    (_, index) =>
      assetUrl(
        `assets/units/victoria-walk/victoria-walk-${String(
          index + 1,
        ).padStart(2, '0')}.png`,
      ),
  ) as readonly string[];

export function victoriaWalkFrameKey(
  elapsedMs: number,
): string {
  const acceptedMs =
    Number.isFinite(elapsedMs) &&
    elapsedMs >= 0
      ? elapsedMs
      : 0;

  const frameIndex =
    Math.floor(
      acceptedMs /
        VICTORIA_WALK_FRAME_MS,
    ) %
    VICTORIA_WALK_FRAME_PATHS.length;

  return `victoria-walk-${String(
    frameIndex + 1,
  ).padStart(2, '0')}`;
}
