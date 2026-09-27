import type { Coord, UnitState, WorldState } from './types';

export const BOARD_SIZE = 16 as const;

export class OutOfBoundsError extends Error {
  constructor(coord: Coord) { super(`Coordinate out of bounds: ${coord.x},${coord.y}`); this.name = 'OutOfBoundsError'; }
}
export class CellOccupiedError extends Error {
  constructor(coord: Coord) { super(`Cell occupied: ${coord.x},${coord.y}`); this.name = 'CellOccupiedError'; }
}
export class DuplicateUnitError extends Error {
  constructor(id: string) { super(`Duplicate unit id: ${id}`); this.name = 'DuplicateUnitError'; }
}

export const coordKey = ({ x, y }: Coord): string => `${x},${y}`;
export const isInBounds = ({ x, y }: Coord): boolean => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

export function createWorld(units: readonly UnitState[] = []): WorldState {
  let world: WorldState = { tick: 0, width: BOARD_SIZE, height: BOARD_SIZE, units: {}, occupancy: {} };
  for (const unit of units) world = placeUnit(world, unit);
  return world;
}

export function placeUnit(world: WorldState, unit: UnitState): WorldState {
  if (!isInBounds(unit.position)) throw new OutOfBoundsError(unit.position);
  if (world.units[unit.id]) throw new DuplicateUnitError(unit.id);
  const key = coordKey(unit.position);
  if (world.occupancy[key]) throw new CellOccupiedError(unit.position);
  return {
    ...world,
    units: { ...world.units, [unit.id]: { ...unit, position: { ...unit.position } } },
    occupancy: { ...world.occupancy, [key]: unit.id },
  };
}
