import { combatStateFor } from './combat';
import { createInitialMatchState } from './sovereign';
import { createInitialTerritoryState } from './nodes';
import { createInitialHeroState } from './hero';
import { createInitialAIState } from './ai';
import { createInitialIntelligenceState } from './intelligence';
import { createInitialTurnState } from './turns';
import { BOARD_HEIGHT, BOARD_WIDTH } from './board-topology';
import { getBattlefieldTopology } from './battlefield-topology-authority';
import type { Coord, UnitState, WorldOptions, WorldState } from './types';

export const BOARD_SIZE = BOARD_WIDTH;

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
export const isInBounds = ({ x, y }: Coord): boolean => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
export const isInWorldBounds = (
  world: Pick<WorldState, 'width' | 'height'>,
  { x, y }: Coord,
): boolean =>
  Number.isInteger(x) &&
  Number.isInteger(y) &&
  x >= 0 &&
  x < world.width &&
  y >= 0 &&
  y < world.height;

export function createWorld(units: readonly UnitState[] = [], options: WorldOptions = {}): WorldState {
  const topology = getBattlefieldTopology(options.topologyId);
  const reinforcementAnchors = topology.id === 'triptych-v2'
    ? {
        victoria: { x: 1, y: 16 },
        obsidian: { x: 30, y: 15 },
      }
    : {
        victoria: { x: 2, y: 12 },
        obsidian: { x: 21, y: 11 },
      };
  let world: WorldState = {
    tick: 0, width: topology.width, height: topology.height, units: {}, occupancy: {}, combat: {}, military: {},
    match: createInitialMatchState({}),
    territory: createInitialTerritoryState(topology.id),
    economy: { crownPower: { victoria: 0, obsidian: 0 } },
    production: {
      queues: { victoria: [], obsidian: [] },
      nextEntryOrdinal: { victoria: 1, obsidian: 1 },
      reinforcementAnchors,
    },
    promotions: { pending: [] },
    heroes: createInitialHeroState({}, options.heroIds ?? {}),
    ai: createInitialAIState(options.aiFactions ?? []),
    intelligence: createInitialIntelligenceState(),
    turn: createInitialTurnState(),
    pendingOrders: [],
  };
  for (const unit of units) world = placeUnit(world, unit);
  return {
    ...world,
    match: createInitialMatchState(world.units),
    heroes: createInitialHeroState(world.units, options.heroIds ?? {}),
    ai: createInitialAIState(options.aiFactions ?? []),
  };
}

export function placeUnit(world: WorldState, unit: UnitState): WorldState {
  if (!isInWorldBounds(world, unit.position)) throw new OutOfBoundsError(unit.position);
  if (world.units[unit.id]) throw new DuplicateUnitError(unit.id);
  const key = coordKey(unit.position);
  if (world.occupancy[key]) throw new CellOccupiedError(unit.position);
  return {
    ...world,
    units: { ...world.units, [unit.id]: { ...unit, position: { ...unit.position } } },
    occupancy: { ...world.occupancy, [key]: unit.id },
    combat: { ...world.combat, [unit.id]: combatStateFor(unit) },
    military: { ...world.military, [unit.id]: { kills: 0, rank: 'recruit' } },
  };
}