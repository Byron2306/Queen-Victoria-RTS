import {
  allPlayableCells,
  createBoardTile,
  isPlayableCell,
  orthogonalNeighbors,
  tileId,
  type BoardTile,
  type FactionControl,
  type TileId,
} from './board-topology';
import type { Coord, Faction, TerritoryState, WorldState } from './types';

export type TriptychTerritoryState = TerritoryState & Readonly<{
  tiles?: Readonly<Record<TileId, BoardTile>>;
}>;

function storedTiles(world: WorldState): Readonly<Record<TileId, BoardTile>> | undefined {
  return (world.territory as TriptychTerritoryState).tiles;
}

export function strategicTiles(world: WorldState): Readonly<Record<TileId, BoardTile>> {
  const existing = storedTiles(world);
  if (existing) return existing;

  const tiles: Partial<Record<TileId, BoardTile>> = {};
  for (const cell of allPlayableCells()) {
    const tile = createBoardTile(cell);
    tiles[tile.id] = tile;
  }
  return tiles as Record<TileId, BoardTile>;
}

export function getTileFactionControl(
  world: WorldState,
  cell: Coord,
): FactionControl {
  if (!isPlayableCell(cell.x, cell.y)) {
    throw new RangeError(`Cell ${cell.x},${cell.y} is outside the royal battlefield`);
  }
  return strategicTiles(world)[tileId(cell)]!.factionControl;
}

export function hasAdjacentFactionTile(
  world: WorldState,
  cell: Coord,
  faction: Faction,
): boolean {
  return orthogonalNeighbors(cell.x, cell.y).some(
    (neighbor) => getTileFactionControl(world, neighbor) === faction,
  );
}

export function resolveSettlement(world: WorldState): WorldState {
  const tiles: Record<TileId, BoardTile> = {
    ...strategicTiles(world),
  };

  for (const unit of Object.values(world.units)) {
    if (!isPlayableCell(unit.position.x, unit.position.y)) {
      continue;
    }

    const combat = world.combat[unit.id];
    if (combat && combat.health <= 0) {
      continue;
    }

    const id = tileId(unit.position);
    const previous = tiles[id]!;
    tiles[id] = {
      ...previous,
      factionControl: unit.faction,
    };
  }

  return {
    ...world,
    territory: {
      ...world.territory,
      tiles,
    } as TriptychTerritoryState,
  };
}
