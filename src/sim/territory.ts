import {
  tileId,
  type BoardTile,
  type FactionControl,
  type TileId,
} from './board-topology';
import {
  getBattlefieldTopology,
  type BattlefieldTopologyAuthority,
} from './battlefield-topology-authority';
import type { Coord, Faction, TerritoryState, WorldState } from './types';

export type TriptychTerritoryState = TerritoryState & Readonly<{
  tiles?: Readonly<Record<TileId, BoardTile>>;
}>;

export type ClaimSource =
  | 'annex_command'
  | 'settlement'
  | 'banner'
  | 'fortification';

export type ClaimRejectReason =
  | 'off_board'
  | 'already_controlled'
  | 'enemy_controlled'
  | 'not_adjacent_to_friendly_territory';

export type ClaimDecision = Readonly<{
  allowed: boolean;
  reason?: ClaimRejectReason;
}>;

export type ClaimResult = Readonly<{
  state: WorldState;
  accepted: boolean;
  reason?: ClaimRejectReason;
}>;

export type AnnexRejectReason = ClaimRejectReason;

export type AnnexResult = ClaimResult;

export function topologyForWorld(
  world: Pick<WorldState, 'width' | 'height'>,
): BattlefieldTopologyAuthority {
  const v2 = getBattlefieldTopology('triptych-v2');
  if (world.width === v2.width && world.height === v2.height) return v2;
  return getBattlefieldTopology('triptych-v1');
}

function createStrategicTile(cell: Coord): BoardTile {
  return {
    id: tileId(cell),
    x: cell.x,
    y: cell.y,
    polarity: (cell.x + cell.y) % 2 === 0 ? 'white' : 'black',
    factionControl: 'neutral',
  };
}

function storedTiles(world: WorldState): Readonly<Record<TileId, BoardTile>> | undefined {
  return (world.territory as TriptychTerritoryState).tiles;
}

export function strategicTiles(world: WorldState): Readonly<Record<TileId, BoardTile>> {
  const existing = storedTiles(world);
  if (existing) return existing;

  const topology = topologyForWorld(world);
  const tiles: Partial<Record<TileId, BoardTile>> = {};
  for (const cell of topology.allPlayableCells()) {
    const tile = createStrategicTile(cell);
    tiles[tile.id] = tile;
  }
  return tiles as Record<TileId, BoardTile>;
}

export function getTileFactionControl(
  world: WorldState,
  cell: Coord,
): FactionControl {
  const topology = topologyForWorld(world);
  if (!topology.isPlayableCell(cell.x, cell.y)) {
    throw new RangeError(`Cell ${cell.x},${cell.y} is outside the royal battlefield`);
  }
  return strategicTiles(world)[tileId(cell)]!.factionControl;
}

export function hasAdjacentFactionTile(
  world: WorldState,
  cell: Coord,
  faction: Faction,
): boolean {
  const topology = topologyForWorld(world);
  return topology.orthogonalNeighbors(cell.x, cell.y).some(
    (neighbor) => getTileFactionControl(world, neighbor) === faction,
  );
}

export function canFactionClaimTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
  source: ClaimSource,
): ClaimDecision {
  void source;
  const topology = topologyForWorld(world);
  if (!topology.isPlayableCell(cell.x, cell.y)) {
    return { allowed: false, reason: 'off_board' };
  }

  const control = getTileFactionControl(world, cell);
  if (control === faction) {
    return { allowed: false, reason: 'already_controlled' };
  }
  if (control !== 'neutral') {
    return { allowed: false, reason: 'enemy_controlled' };
  }
  if (!hasAdjacentFactionTile(world, cell, faction)) {
    return { allowed: false, reason: 'not_adjacent_to_friendly_territory' };
  }

  return { allowed: true };
}

export function annexTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): AnnexResult {
  const topology = topologyForWorld(world);
  if (!topology.isPlayableCell(cell.x, cell.y)) {
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
  const topology = topologyForWorld(world);
  const tiles: Record<TileId, BoardTile> = {
    ...strategicTiles(world),
  };

  for (const unit of Object.values(world.units)) {
    if (!topology.isPlayableCell(unit.position.x, unit.position.y)) {
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
