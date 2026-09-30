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

export type AnnexRejectReason =
  | 'off_board'
  | 'already_controlled'
  | 'enemy_controlled'
  | 'not_adjacent_to_friendly_territory';

export type AnnexResult = Readonly<{
  state: WorldState;
  accepted: boolean;
  reason?: AnnexRejectReason;
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

export function annexTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): AnnexResult {
  if (!isPlayableCell(cell.x, cell.y)) {
    return { state: world, accepted: false, reason: 'off_board' };
  }

  const control = getTileFactionControl(world, cell);
  if (control === faction) {
    return { state: world, accepted: false, reason: 'already_controlled' };
  }
  if (control !== 'neutral') {
    return { state: world, accepted: false, reason: 'enemy_controlled' };
  }
  if (!hasAdjacentFactionTile(world, cell, faction)) {
    return {
      state: world,
      accepted: false,
      reason: 'not_adjacent_to_friendly_territory',
    };
  }

  const id = tileId(cell);
  const tiles: Record<TileId, BoardTile> = {
    ...strategicTiles(world),
    [id]: {
      ...strategicTiles(world)[id]!,
      factionControl: faction,
    },
  };

  return {
    accepted: true,
    state: {
      ...world,
      territory: {
        ...world.territory,
        tiles,
      } as TriptychTerritoryState,
    },
  };
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
