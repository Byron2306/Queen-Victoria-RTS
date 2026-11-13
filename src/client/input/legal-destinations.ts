import { refreshFactionIntelligence } from '../../sim/intelligence';
import { validateMoveKnowledge } from '../../sim/knowledge-legality';
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
  const knownWorld = refreshFactionIntelligence(world, unit.faction);

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
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
        ).legal &&
        validateMoveKnowledge(
          knownWorld, unit.faction, unit.position, to, unit.kind,
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
