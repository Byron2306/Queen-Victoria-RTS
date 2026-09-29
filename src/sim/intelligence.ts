import { allPlayableCells, tileId, type TileId, type TilePolarity, type FactionControl } from './board-topology';
import type { Coord, Faction, IntelligenceState, TileMemory, WorldState } from './types';

const UNKNOWN_MEMORY: TileMemory = {
  visibility: 'unknown',
  lastSeenRound: null,
  lastKnownPolarity: null,
  lastKnownControl: null,
  lastKnownUnitId: null,
  lastKnownFortificationId: null,
  lastKnownBannerId: null,
};

function createFactionMemory(): Record<TileId, TileMemory> {
  const memory: Partial<Record<TileId, TileMemory>> = {};
  for (const cell of allPlayableCells()) {
    memory[tileId(cell)] = { ...UNKNOWN_MEMORY };
  }
  return memory as Record<TileId, TileMemory>;
}

export function createInitialIntelligenceState(): IntelligenceState {
  return {
    byFaction: {
      victoria: createFactionMemory(),
      obsidian: createFactionMemory(),
    },
  };
}

export function getTileMemory(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): TileMemory {
  const memory = world.intelligence.byFaction[faction][tileId(cell)];
  if (!memory) {
    throw new RangeError(`Cell ${cell.x},${cell.y} has no battlefield intelligence record`);
  }
  return memory;
}

export type { TilePolarity, FactionControl };
