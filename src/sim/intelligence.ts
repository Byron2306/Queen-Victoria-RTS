import { tileId, type TileId } from './board-topology';
import { getBattlefieldTopology, type BattlefieldTopologyId } from './battlefield-topology-authority';
import { getFortificationAt } from './fortifications';
import { getBannerAt, getTilePolarity } from './polarity';
import { getTileFactionControl, topologyForWorld } from './territory';
import { computeFactionVisibleCells } from './vision';
import { coordKey } from './world';
import type {
  Coord,
  Faction,
  IntelligenceState,
  TileMemory,
  WorldState,
} from './types';

const UNKNOWN_MEMORY: TileMemory = {
  visibility: 'unknown',
  lastSeenRound: null,
  lastKnownPolarity: null,
  lastKnownControl: null,
  lastKnownUnitId: null,
  lastKnownFortificationId: null,
  lastKnownBannerId: null,
};

function createFactionMemory(topologyId?: BattlefieldTopologyId): Record<TileId, TileMemory> {
  const memory: Partial<Record<TileId, TileMemory>> = {};
  for (const cell of getBattlefieldTopology(topologyId).allPlayableCells()) {
    memory[tileId(cell)] = { ...UNKNOWN_MEMORY };
  }
  return memory as Record<TileId, TileMemory>;
}

export function createInitialIntelligenceState(topologyId?: BattlefieldTopologyId): IntelligenceState {
  return {
    byFaction: {
      victoria: createFactionMemory(topologyId),
      obsidian: createFactionMemory(topologyId),
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

export function isTileObserved(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): boolean {
  return getTileMemory(world, faction, cell).visibility === 'observed';
}

export function isTileKnown(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): boolean {
  return getTileMemory(world, faction, cell).visibility !== 'unknown';
}

function observedMemory(world: WorldState, cell: Coord): TileMemory {
  const occupantId = world.occupancy[coordKey(cell)] ?? null;
  const fortification = getFortificationAt(world, cell);
  const banner = getBannerAt(world, cell);

  return {
    visibility: 'observed',
    lastSeenRound: world.turn.round,
    lastKnownPolarity: getTilePolarity(world, cell),
    lastKnownControl: getTileFactionControl(world, cell),
    lastKnownUnitId: occupantId,
    lastKnownFortificationId: fortification?.id ?? null,
    lastKnownBannerId: banner?.id ?? null,
  };
}

export function refreshFactionIntelligence(
  world: WorldState,
  faction: Faction,
): WorldState {
  const visible = computeFactionVisibleCells(world, faction);
  const previous = world.intelligence.byFaction[faction];
  const next: Partial<Record<TileId, TileMemory>> = {};

  for (const cell of topologyForWorld(world).allPlayableCells()) {
    const id = tileId(cell);
    const oldMemory = previous[id] ?? UNKNOWN_MEMORY;

    if (visible.has(id)) {
      next[id] = observedMemory(world, cell);
      continue;
    }

    next[id] = oldMemory.visibility === 'observed'
      ? { ...oldMemory, visibility: 'remembered' }
      : oldMemory;
  }

  return {
    ...world,
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        [faction]: next as Record<TileId, TileMemory>,
      },
    },
  };
}

export function refreshAllIntelligence(world: WorldState): WorldState {
  return refreshFactionIntelligence(
    refreshFactionIntelligence(world, 'victoria'),
    'obsidian',
  );
}
