import type { Coord, Faction, UnitState, WorldState } from './types';
import { coordKey, isInWorldBounds } from './world';

export type ThreatMap = Readonly<Record<string, readonly string[]>>;

type Direction = Readonly<{ x: -1 | 0 | 1; y: -1 | 0 | 1 }>;

const ROOK_DIRECTIONS: readonly Direction[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

const BISHOP_DIRECTIONS: readonly Direction[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

const QUEEN_DIRECTIONS: readonly Direction[] = [
  ...ROOK_DIRECTIONS,
  ...BISHOP_DIRECTIONS,
];

const KNIGHT_OFFSETS: readonly Coord[] = [
  { x: -2, y: -1 }, { x: 2, y: -1 },
  { x: -1, y: -2 }, { x: 1, y: -2 },
  { x: -1, y: 2 }, { x: 1, y: 2 },
  { x: -2, y: 1 }, { x: 2, y: 1 },
];

const KING_OFFSETS: readonly Coord[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },                    { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
];

function sortCoords(cells: Coord[]): readonly Coord[] {
  return cells.sort((a, b) => a.y - b.y || a.x - b.x);
}

function offsetThreats(world: WorldState, unit: UnitState, offsets: readonly Coord[]): readonly Coord[] {
  const cells: Coord[] = [];
  for (const offset of offsets) {
    const cell = { x: unit.position.x + offset.x, y: unit.position.y + offset.y };
    if (isInWorldBounds(world, cell)) cells.push(cell);
  }
  return sortCoords(cells);
}

function rayThreats(world: WorldState, unit: UnitState, directions: readonly Direction[]): readonly Coord[] {
  const cells: Coord[] = [];
  for (const direction of directions) {
    let x = unit.position.x + direction.x;
    let y = unit.position.y + direction.y;
    while (isInWorldBounds(world, { x, y })) {
      const cell = { x, y };
      cells.push(cell);
      if (world.occupancy[coordKey(cell)]) break;
      x += direction.x;
      y += direction.y;
    }
  }
  return sortCoords(cells);
}

export function projectThreatCells(world: WorldState, unit: UnitState): readonly Coord[] {
  switch (unit.kind) {
    case 'pawn': {
      const forward = unit.faction === 'victoria' ? 1 : -1;
      return offsetThreats(world, unit, [
        { x: -1, y: forward },
        { x: 1, y: forward },
      ]);
    }
    case 'knight':
      return offsetThreats(world, unit, KNIGHT_OFFSETS);
    case 'king':
      return offsetThreats(world, unit, KING_OFFSETS);
    case 'bishop':
      return rayThreats(world, unit, BISHOP_DIRECTIONS);
    case 'rook':
      return rayThreats(world, unit, ROOK_DIRECTIONS);
    case 'queen':
      return rayThreats(world, unit, QUEEN_DIRECTIONS);
  }
}

export function buildThreatMap(world: WorldState, faction: Faction): ThreatMap {
  const mutable: Record<string, string[]> = {};
  const units = Object.values(world.units)
    .filter((unit) => unit.faction === faction)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const unit of units) {
    for (const cell of projectThreatCells(world, unit)) {
      const key = coordKey(cell);
      (mutable[key] ??= []).push(unit.id);
    }
  }

  const ordered: Record<string, readonly string[]> = {};
  for (const [key, sources] of Object.entries(mutable).sort(([a], [b]) => a.localeCompare(b))) {
    ordered[key] = [...sources].sort();
  }
  return ordered;
}
