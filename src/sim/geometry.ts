import type { Coord, UnitState, WorldState } from './types';
import { coordKey } from './world';

export type GeometryRejectReason = 'illegal_geometry' | 'blocked';
export type GeometryResult =
  | Readonly<{ legal: true }>
  | Readonly<{ legal: false; reason: GeometryRejectReason }>;

function sign(value: number): -1 | 0 | 1 {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

function rayIsClear(world: WorldState, from: Coord, to: Coord): boolean {
  const stepX = sign(to.x - from.x);
  const stepY = sign(to.y - from.y);
  let x = from.x + stepX;
  let y = from.y + stepY;
  while (x !== to.x || y !== to.y) {
    if (world.occupancy[coordKey({ x, y })]) return false;
    x += stepX;
    y += stepY;
  }
  return true;
}

export function validateMoveGeometry(world: WorldState, unit: UnitState, to: Coord): GeometryResult {
  const dx = to.x - unit.position.x;
  const dy = to.y - unit.position.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return { legal: false, reason: 'illegal_geometry' };

  switch (unit.kind) {
    case 'pawn': {
      const forward = unit.faction === 'victoria' ? 1 : -1;
      return dx === 0 && dy === forward
        ? { legal: true }
        : { legal: false, reason: 'illegal_geometry' };
    }
    case 'knight':
      return (ax === 1 && ay === 2) || (ax === 2 && ay === 1)
        ? { legal: true }
        : { legal: false, reason: 'illegal_geometry' };
    case 'king':
      return ax <= 1 && ay <= 1
        ? { legal: true }
        : { legal: false, reason: 'illegal_geometry' };
    case 'bishop':
      if (ax !== ay) return { legal: false, reason: 'illegal_geometry' };
      break;
    case 'rook':
      if (!((dx === 0) !== (dy === 0))) return { legal: false, reason: 'illegal_geometry' };
      break;
    case 'queen':
      if (!(ax === ay || dx === 0 || dy === 0)) return { legal: false, reason: 'illegal_geometry' };
      break;
  }

  return rayIsClear(world, unit.position, to)
    ? { legal: true }
    : { legal: false, reason: 'blocked' };
}
