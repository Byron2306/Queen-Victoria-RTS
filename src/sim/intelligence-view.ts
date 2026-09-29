import {
  allPlayableCells,
  createBoardTile,
  tileId,
  type BoardTile,
  type TileId,
} from './board-topology';
import type { FortificationState } from './fortifications';
import type {
  Coord,
  Faction,
  FactionIntelligenceState,
  UnitState,
  WorldState,
} from './types';

export type RememberedContact = Readonly<{
  unitId: string;
  position: Coord;
  lastSeenRound: number;
}>;

export type FactionKnowledgeView = Readonly<{
  faction: Faction;
  friendlyUnits: readonly UnitState[];
  observedEnemyUnits: readonly UnitState[];
  rememberedContacts: readonly RememberedContact[];
  tileMemory: FactionIntelligenceState;
}>;

function otherFaction(faction: Faction): Faction {
  return faction === 'victoria' ? 'obsidian' : 'victoria';
}

function coordFromTileId(id: TileId): Coord {
  const [x, y] = id.split(',').map(Number);
  return { x, y };
}

function observedEnemyIds(
  world: WorldState,
  faction: Faction,
): ReadonlySet<string> {
  const ids = new Set<string>();
  const memory = world.intelligence.byFaction[faction];
  for (const tile of Object.values(memory)) {
    if (tile.visibility === 'observed' && tile.lastKnownUnitId) {
      const unit = world.units[tile.lastKnownUnitId];
      if (unit && unit.faction !== faction) ids.add(unit.id);
    }
  }
  return ids;
}

export function createFactionKnowledgeView(
  world: WorldState,
  faction: Faction,
): FactionKnowledgeView {
  const friendlies = Object.values(world.units)
    .filter(unit => unit.faction === faction && Boolean(world.combat[unit.id]?.health))
    .sort((a, b) => a.id.localeCompare(b.id));

  const visibleEnemyIds = observedEnemyIds(world, faction);
  const observedEnemyUnits = [...visibleEnemyIds]
    .map(id => world.units[id])
    .filter((unit): unit is UnitState => Boolean(unit && unit.faction === otherFaction(faction)))
    .sort((a, b) => a.id.localeCompare(b.id));

  const currentObserved = new Set(observedEnemyUnits.map(unit => unit.id));
  const contactsByUnit = new Map<string, RememberedContact>();
  const memory = world.intelligence.byFaction[faction];

  for (const [rawId, tile] of Object.entries(memory)) {
    if (
      tile.visibility !== 'remembered' ||
      !tile.lastKnownUnitId ||
      tile.lastSeenRound === null ||
      currentObserved.has(tile.lastKnownUnitId)
    ) {
      continue;
    }

    const candidate: RememberedContact = {
      unitId: tile.lastKnownUnitId,
      position: coordFromTileId(rawId as TileId),
      lastSeenRound: tile.lastSeenRound,
    };
    const previous = contactsByUnit.get(candidate.unitId);
    if (
      !previous ||
      candidate.lastSeenRound > previous.lastSeenRound ||
      (
        candidate.lastSeenRound === previous.lastSeenRound &&
        tileId(candidate.position).localeCompare(tileId(previous.position)) < 0
      )
    ) {
      contactsByUnit.set(candidate.unitId, candidate);
    }
  }

  return {
    faction,
    friendlyUnits: friendlies,
    observedEnemyUnits,
    rememberedContacts: [...contactsByUnit.values()]
      .sort((a, b) => a.unitId.localeCompare(b.unitId) || tileId(a.position).localeCompare(tileId(b.position))),
    tileMemory: memory,
  };
}

function projectedTiles(
  world: WorldState,
  faction: Faction,
): Readonly<Record<TileId, BoardTile>> {
  const memory = world.intelligence.byFaction[faction];
  const tiles: Partial<Record<TileId, BoardTile>> = {};

  for (const cell of allPlayableCells()) {
    const id = tileId(cell);
    const remembered = memory[id];
    const base = createBoardTile(cell);
    tiles[id] = {
      ...base,
      polarity: remembered?.lastKnownPolarity ?? base.polarity,
      factionControl: remembered?.lastKnownControl ?? 'neutral',
    };
  }

  return tiles as Record<TileId, BoardTile>;
}

function projectedFortifications(
  world: WorldState,
  faction: Faction,
): Readonly<Record<string, FortificationState>> {
  const memory = world.intelligence.byFaction[faction];
  const result: Record<string, FortificationState> = {};
  const enemy = otherFaction(faction);

  for (const [rawId, tile] of Object.entries(memory)) {
    if (tile.visibility === 'unknown' || !tile.lastKnownFortificationId) continue;
    const cell = coordFromTileId(rawId as TileId);
    result[tile.lastKnownFortificationId] = {
      id: tile.lastKnownFortificationId,
      faction: enemy,
      kind: 'bastion',
      cell,
      durability: 1,
    };
  }

  return result;
}

export function createFactionPlanningWorld(
  world: WorldState,
  faction: Faction,
): WorldState {
  const view = createFactionKnowledgeView(world, faction);
  const projectedUnits = [...view.friendlyUnits, ...view.observedEnemyUnits];
  const units: Record<string, UnitState> = {};
  const occupancy: Record<string, string> = {};
  const combat: WorldState['combat'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {} as never;
  const military: WorldState['military'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {} as never;

  for (const unit of projectedUnits) {
    units[unit.id] = unit;
    occupancy[`${unit.position.x},${unit.position.y}`] = unit.id;
    const combatState = world.combat[unit.id];
    if (combatState) (combat as Record<string, typeof combatState>)[unit.id] = combatState;
    const militaryState = world.military[unit.id];
    if (militaryState) (military as Record<string, typeof militaryState>)[unit.id] = militaryState;
  }

  return {
    ...world,
    units,
    occupancy,
    combat,
    military,
    territory: {
      ...world.territory,
      tiles: projectedTiles(world, faction),
      fortifications: projectedFortifications(world, faction),
    } as WorldState['territory'],
  };
}
