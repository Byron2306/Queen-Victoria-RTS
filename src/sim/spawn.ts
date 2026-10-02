import { topologyForWorld } from './territory';
import type { Coord, Faction, WorldState } from './types';

export function findReinforcementSpawn(
  world: WorldState,
  faction: Faction,
): Coord | null {
  const topology = topologyForWorld(world);
  const anchor = world.production.reinforcementAnchors[faction];

  if (!topology.isPlayableCell(anchor.x, anchor.y)) return null;

  const nodeCenterKeys = new Set(
    Object.values(world.territory.nodes).map(
      node => `${node.center.x},${node.center.y}`,
    ),
  );
  const maxRadius = Math.max(topology.width, topology.height);

  for (let radius = 0; radius < maxRadius; radius += 1) {
    const candidates: Coord[] = [];

    for (const cell of topology.allPlayableCells()) {
      if (
        Math.max(
          Math.abs(cell.x - anchor.x),
          Math.abs(cell.y - anchor.y),
        ) === radius
      ) {
        candidates.push(cell);
      }
    }

    candidates.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const candidate of candidates) {
      const key = `${candidate.x},${candidate.y}`;
      if (!world.occupancy[key] && !nodeCenterKeys.has(key)) {
        return candidate;
      }
    }
  }

  return null;
}
