import {
  validateMoveGeometry,
} from '../../sim/geometry';

import type {
  Coord,
  WorldState,
} from '../../sim/types';

export function legalDestinationsForUnit(
  world: WorldState,
  unitId: string,
): readonly Coord[] {
  const unit = world.units[unitId];

  if (!unit) {
    return [];
  }

  const destinations: Coord[] = [];

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if (
        world.occupancy[
          `${x},${y}`
        ]
      ) {
        continue;
      }

      const to = { x, y };

      if (
        validateMoveGeometry(
          world,
          unit,
          to,
        ).legal
      ) {
        destinations.push(to);
      }
    }
  }

  return destinations.sort(
    (a, b) =>
      a.y - b.y ||
      a.x - b.x,
  );
}
