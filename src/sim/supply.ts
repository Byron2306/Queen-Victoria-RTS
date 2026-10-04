import { tileId, type TileId } from './board-topology';
import { strategicTiles, topologyForWorld } from './territory';
import { coordKey } from './world';
import type { Coord, Faction, WorldState } from './types';

export type SupplyStatus =
  | 'supplied'
  | 'exposed'
  | 'strained'
  | 'attrition';

export type FactionSupplySnapshot = Readonly<{
  faction: Faction;
  rootTileIds: readonly TileId[];
  suppliedTileIds: readonly TileId[];
}>;

function homeEdgeX(world: WorldState, faction: Faction): number {
  return faction === 'victoria' ? 0 : world.width - 1;
}

function blockedByLivingEnemy(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): boolean {
  const occupantId = world.occupancy[coordKey(cell)];
  if (!occupantId) return false;

  const occupant = world.units[occupantId];
  if (!occupant || occupant.faction === faction) return false;

  const combat = world.combat[occupantId];
  return !combat || combat.health > 0;
}

function crownRootCells(
  world: WorldState,
  faction: Faction,
): readonly Coord[] {
  const topology = topologyForWorld(world);
  const cells: Coord[] = [];

  for (const nodeId of Object.keys(world.territory.nodes).sort()) {
    const node = world.territory.nodes[nodeId]!;
    if (
      node.kind !== 'crown' ||
      node.owner !== faction ||
      node.contested
    ) {
      continue;
    }

    cells.push(
      node.center,
      ...topology.orthogonalNeighbors(node.center.x, node.center.y),
    );
  }

  return cells;
}

export function deriveFactionSupply(
  world: WorldState,
  faction: Faction,
): FactionSupplySnapshot {
  const topology = topologyForWorld(world);
  const tiles = strategicTiles(world);
  const edgeX = homeEdgeX(world, faction);

  const homeRoots = topology.allPlayableCells()
    .filter((cell) => cell.x === edgeX);

  const rootTileIds = [...homeRoots, ...crownRootCells(world, faction)]
    .map(tileId)
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => {
      const tile = tiles[id];
      return (
        tile?.factionControl === faction &&
        !blockedByLivingEnemy(world, faction, tile)
      );
    })
    .sort();

  const supplied = new Set<TileId>();
  const queue = [...rootTileIds];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (supplied.has(id)) continue;

    const tile = tiles[id];
    if (
      !tile ||
      tile.factionControl !== faction ||
      blockedByLivingEnemy(world, faction, tile)
    ) {
      continue;
    }

    supplied.add(id);

    const neighbors = topology
      .orthogonalNeighbors(tile.x, tile.y)
      .map(tileId)
      .sort();

    for (const neighborId of neighbors) {
      if (!supplied.has(neighborId)) queue.push(neighborId);
    }
  }

  return {
    faction,
    rootTileIds,
    suppliedTileIds: [...supplied].sort(),
  };
}


function statusFromExposure(exposureRounds: number): SupplyStatus {
  if (exposureRounds >= 3) return 'attrition';
  if (exposureRounds >= 2) return 'strained';
  return 'exposed';
}

export function supplyStatusForUnit(
  world: WorldState,
  unitId: string,
  snapshot?: FactionSupplySnapshot,
): SupplyStatus {
  const unit = world.units[unitId];
  if (!unit) return 'exposed';

  const factionSupply = snapshot ?? deriveFactionSupply(world, unit.faction);
  if (factionSupply.suppliedTileIds.includes(tileId(unit.position))) {
    return 'supplied';
  }

  return statusFromExposure(
    world.supply.exposureRoundsByUnit[unitId] ?? 0,
  );
}

export function advanceSupplyExposure(world: WorldState): WorldState {
  const exposureRoundsByUnit: Record<string, number> = {};
  const snapshots: Partial<Record<Faction, FactionSupplySnapshot>> = {};

  for (const unitId of Object.keys(world.units).sort()) {
    const unit = world.units[unitId]!;
    const combat = world.combat[unitId];
    if (combat && combat.health <= 0) continue;

    const snapshot = snapshots[unit.faction] ??
      (snapshots[unit.faction] = deriveFactionSupply(world, unit.faction));

    const supplied = snapshot.suppliedTileIds.includes(tileId(unit.position));
    exposureRoundsByUnit[unitId] = supplied
      ? 0
      : (world.supply.exposureRoundsByUnit[unitId] ?? 0) + 1;
  }

  return {
    ...world,
    supply: {
      exposureRoundsByUnit,
    },
  };
}


export const SUPPLY_ATTRITION_DAMAGE = 10;

export function resolveSupplyAttrition(world: WorldState): WorldState {
  const exposed = advanceSupplyExposure(world);
  const units = { ...exposed.units };
  const occupancy = { ...exposed.occupancy };
  const combat = { ...exposed.combat };
  const military = { ...exposed.military };
  const exposureRoundsByUnit = {
    ...exposed.supply.exposureRoundsByUnit,
  };

  for (const unitId of Object.keys(units).sort()) {
    const unit = units[unitId];
    const combatState = combat[unitId];
    if (!unit || !combatState || combatState.health <= 0) continue;

    const exposureRounds = exposureRoundsByUnit[unitId] ?? 0;
    if (exposureRounds < 3) continue;

    const health = Math.max(0, combatState.health - SUPPLY_ATTRITION_DAMAGE);
    if (health > 0) {
      combat[unitId] = {
        ...combatState,
        health,
      };
      continue;
    }

    delete occupancy[coordKey(unit.position)];
    delete units[unitId];
    delete combat[unitId];
    delete military[unitId];
    delete exposureRoundsByUnit[unitId];
  }

  return {
    ...exposed,
    units,
    occupancy,
    combat,
    military,
    supply: {
      exposureRoundsByUnit,
    },
  };
}
