import { BOARD_HEIGHT, BOARD_WIDTH, isPlayableCell } from './board-topology';
import { DEFAULT_CAPTURE_NODES } from './nodes';
import type { Coord, Faction, WorldState } from './types';

const NODE_CENTER_KEYS = new Set(
  Object.values(DEFAULT_CAPTURE_NODES).map(
    node => `${node.center.x},${node.center.y}`,
  ),
);

export function findReinforcementSpawn(
  world: WorldState,
  faction: Faction,
): Coord | null {
  const anchor = world.production.reinforcementAnchors[faction];

  if (!isPlayableCell(anchor.x, anchor.y)) return null;

  const maxRadius = Math.max(BOARD_WIDTH, BOARD_HEIGHT);

  for (let radius = 0; radius < maxRadius; radius += 1) {
    const candidates: Coord[] = [];

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (!isPlayableCell(x, y)) continue;
        if (
          Math.max(
            Math.abs(x - anchor.x),
            Math.abs(y - anchor.y),
          ) === radius
        ) {
          candidates.push({ x, y });
        }
      }
    }

    candidates.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const candidate of candidates) {
      const key = `${candidate.x},${candidate.y}`;
      if (!world.occupancy[key] && !NODE_CENTER_KEYS.has(key)) {
        return candidate;
      }
    }
  }

  return null;
}
