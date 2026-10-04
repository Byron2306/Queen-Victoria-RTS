import { tileId, type TileId } from './board-topology';
import { strategicTiles, topologyForWorld } from './territory';
import type { Faction, WorldState } from './types';

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

export function deriveFactionSupply(
  world: WorldState,
  faction: Faction,
): FactionSupplySnapshot {
  const topology = topologyForWorld(world);
  const tiles = strategicTiles(world);
  const edgeX = homeEdgeX(world, faction);

  const rootTileIds = topology.allPlayableCells()
    .filter((cell) => cell.x === edgeX)
    .map(tileId)
    .filter((id) => tiles[id]?.factionControl === faction)
    .sort();

  const supplied = new Set<TileId>();
  const queue = [...rootTileIds];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (supplied.has(id)) continue;

    const tile = tiles[id];
    if (!tile || tile.factionControl !== faction) continue;

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
