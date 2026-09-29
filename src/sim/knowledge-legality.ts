import { isPlayableCell } from './board-topology';
import { isTileKnown, isTileObserved } from './intelligence';
import type { Coord, Faction, UnitKind, WorldState } from './types';

export type KnowledgeRejectReason = 'unknown_destination' | 'unknown_path';
export type KnowledgeResult =
  | Readonly<{ legal: true }>
  | Readonly<{ legal: false; reason: KnowledgeRejectReason }>;

function sign(value: number): -1 | 0 | 1 {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

function isSlidingKind(kind: UnitKind): boolean {
  return kind === 'rook' || kind === 'bishop' || kind === 'queen';
}

export function validateMoveKnowledge(
  world: WorldState,
  faction: Faction,
  from: Coord,
  to: Coord,
  kind: UnitKind,
): KnowledgeResult {
  // Legacy/non-battlefield fixtures are governed by the existing geometry
  // rules only. Intelligence authority applies to the playable royal theatre.
  if (!isPlayableCell(from.x, from.y) || !isPlayableCell(to.x, to.y)) {
    return { legal: true };
  }

  if (!isTileKnown(world, faction, to)) {
    return { legal: false, reason: 'unknown_destination' };
  }

  // A Knight knows its hop-window destination directly. It never occupies or
  // needs knowledge of the cells between the origin and the L destination.
  if (kind === 'knight' || !isSlidingKind(kind)) {
    return { legal: true };
  }

  const stepX = sign(to.x - from.x);
  const stepY = sign(to.y - from.y);
  let x = from.x + stepX;
  let y = from.y + stepY;

  while (x !== to.x || y !== to.y) {
    const cell = { x, y };
    if (isPlayableCell(x, y) && !isTileKnown(world, faction, cell)) {
      return { legal: false, reason: 'unknown_path' };
    }
    x += stepX;
    y += stepY;
  }

  return { legal: true };
}

export function targetIsObserved(
  world: WorldState,
  faction: Faction,
  targetId: string,
): boolean {
  const target = world.units[targetId];
  if (!target) return false;
  if (!isPlayableCell(target.position.x, target.position.y)) return true;
  return isTileObserved(world, faction, target.position);
}
