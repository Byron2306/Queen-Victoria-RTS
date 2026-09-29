import type { Coord, UnitState, WorldState } from './types';
import { coordKey } from './world';
import { isFortificationBlockingCell } from './fortifications';
import { isPlayableCell } from './board-topology';
import { getTilePolarity } from './polarity';

export type GeometryRejectReason =
  | 'illegal_geometry'
  | 'blocked'
  | 'polarity_mismatch'
  | 'polarity_break';
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
    const cell = { x, y };
    if (
      world.occupancy[coordKey(cell)] ||
      isFortificationBlockingCell(world, cell)
    ) {
      return false;
    }
    x += stepX;
    y += stepY;
  }
  return true;
}

function polarityAvailable(from: Coord, to: Coord): boolean {
  return isPlayableCell(from.x, from.y) && isPlayableCell(to.x, to.y);
}

function knightPolarityIsLegal(world: WorldState, from: Coord, to: Coord): boolean {
  if (!polarityAvailable(from, to)) return true;
  return getTilePolarity(world, from) !== getTilePolarity(world, to);
}

function diagonalPolarityIsContinuous(world: WorldState, from: Coord, to: Coord): boolean {
  if (!polarityAvailable(from, to)) return true;

  const required = getTilePolarity(world, from);
  const stepX = sign(to.x - from.x);
  const stepY = sign(to.y - from.y);
  let x = from.x + stepX;
  let y = from.y + stepY;

  while (true) {
    const cell = { x, y };
    if (!isPlayableCell(x, y)) return true;
    if (getTilePolarity(world, cell) !== required) return false;
    if (x === to.x && y === to.y) return true;
    x += stepX;
    y += stepY;
  }
}

export function validateMoveGeometry(world: WorldState, unit: UnitState, to: Coord): GeometryResult {
  const dx = to.x - unit.position.x;
  const dy = to.y - unit.position.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return { legal: false, reason: 'illegal_geometry' };

  if (isFortificationBlockingCell(world, to)) {
    return { legal: false, reason: 'blocked' };
  }

  switch (unit.kind) {
    case 'pawn': {
      const forward = unit.faction === 'victoria' ? 1 : -1;
      return dx === 0 && dy === forward
        ? { legal: true }
        : { legal: false, reason: 'illegal_geometry' };
    }
    case 'knight': {
      const legalShape = (ax === 1 && ay === 2) || (ax === 2 && ay === 1);
      if (!legalShape) return { legal: false, reason: 'illegal_geometry' };
      return knightPolarityIsLegal(world, unit.position, to)
        ? { legal: true }
        : { legal: false, reason: 'polarity_mismatch' };
    }
    case 'king':
      return ax <= 1 && ay <= 1
        ? { legal: true }
        : { legal: false, reason: 'illegal_geometry' };
    case 'bishop':
      if (ax !== ay) return { legal: false, reason: 'illegal_geometry' };
      if (!diagonalPolarityIsContinuous(world, unit.position, to)) {
        return { legal: false, reason: 'polarity_break' };
      }
      break;
    case 'rook':
      if (!((dx === 0) !== (dy === 0))) return { legal: false, reason: 'illegal_geometry' };
      break;
    case 'queen':
      if (!(ax === ay || dx === 0 || dy === 0)) return { legal: false, reason: 'illegal_geometry' };
      if (ax === ay && !diagonalPolarityIsContinuous(world, unit.position, to)) {
        return { legal: false, reason: 'polarity_break' };
      }
      break;
  }

  return rayIsClear(world, unit.position, to)
    ? { legal: true }
    : { legal: false, reason: 'blocked' };
}
