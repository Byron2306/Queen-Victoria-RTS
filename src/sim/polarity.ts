import {
  isPlayableCell,
  tileId,
  type BoardTile,
  type TileId,
  type TilePolarity,
} from './board-topology';
import { strategicTiles, type TriptychTerritoryState } from './territory';
import { coordKey } from './world';
import type { Coord, Faction, WorldState } from './types';

export type BannerState = Readonly<{
  id: string;
  faction: Faction;
  cell: Coord;
  roundsHeld: number;
  mature: boolean;
  contestedBy: Faction | null;
}>;

export type BannerOrder = Readonly<{
  bannerId: string;
  faction: Faction;
  cell: Coord;
}>;

export type BannerResult = Readonly<{
  state: WorldState;
  accepted: boolean;
}>;

type TerritoryWithBanners = TriptychTerritoryState & Readonly<{
  banners?: Readonly<Record<string, BannerState>>;
}>;

function bannersFor(world: WorldState): Readonly<Record<string, BannerState>> {
  return (world.territory as TerritoryWithBanners).banners ?? {};
}

export function getBannerState(
  world: WorldState,
  bannerId: string,
): BannerState | undefined {
  return bannersFor(world)[bannerId];
}

export function getTilePolarity(
  world: WorldState,
  cell: Coord,
): TilePolarity {
  if (!isPlayableCell(cell.x, cell.y)) {
    throw new RangeError(`Cell ${cell.x},${cell.y} is outside the royal battlefield`);
  }
  return strategicTiles(world)[tileId(cell)]!.polarity;
}

export function queueBanner(
  world: WorldState,
  order: BannerOrder,
): BannerResult {
  if (!isPlayableCell(order.cell.x, order.cell.y)) {
    return { state: world, accepted: false };
  }

  const banners: Record<string, BannerState> = {
    ...bannersFor(world),
    [order.bannerId]: {
      id: order.bannerId,
      faction: order.faction,
      cell: { ...order.cell },
      roundsHeld: 0,
      mature: false,
      contestedBy: null,
    },
  };

  return {
    accepted: true,
    state: {
      ...world,
      territory: {
        ...world.territory,
        banners,
      } as TerritoryWithBanners,
    },
  };
}

export function contestBannerAtLanding(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): WorldState {
  const current = bannersFor(world);
  let changed = false;
  const banners: Record<string, BannerState> = { ...current };

  for (const [id, banner] of Object.entries(current)) {
    if (
      banner.cell.x !== cell.x ||
      banner.cell.y !== cell.y ||
      banner.faction === faction
    ) {
      continue;
    }

    banners[id] = {
      ...banner,
      mature: false,
      contestedBy: faction,
    };
    changed = true;
  }

  if (!changed) return world;

  return {
    ...world,
    territory: {
      ...world.territory,
      banners,
    } as TerritoryWithBanners,
  };
}

export function resolveBannerProgress(world: WorldState): BannerResult {
  const banners: Record<string, BannerState> = {};

  for (const [id, banner] of Object.entries(bannersFor(world))) {
    const occupantId = world.occupancy[coordKey(banner.cell)];
    const occupant = occupantId ? world.units[occupantId] : undefined;
    const contestedBy =
      occupant && occupant.faction !== banner.faction
        ? occupant.faction
        : null;

    if (contestedBy) {
      banners[id] = {
        ...banner,
        mature: false,
        contestedBy,
      };
      continue;
    }

    const roundsHeld = Math.min(2, banner.roundsHeld + 1);
    banners[id] = {
      ...banner,
      roundsHeld,
      mature: roundsHeld >= 2,
      contestedBy: null,
    };
  }

  return {
    accepted: true,
    state: {
      ...world,
      territory: {
        ...world.territory,
        banners,
      } as TerritoryWithBanners,
    },
  };
}

export function applyMaturePolarityFlips(world: WorldState): BannerResult {
  const currentBanners = bannersFor(world);
  const mature = Object.values(currentBanners).filter(
    (banner) => banner.mature && banner.contestedBy === null,
  );

  if (mature.length === 0) {
    return { state: world, accepted: true };
  }

  const tiles: Record<TileId, BoardTile> = {
    ...strategicTiles(world),
  };
  const banners: Record<string, BannerState> = { ...currentBanners };

  for (const banner of mature.sort((a, b) => a.id.localeCompare(b.id))) {
    const id = tileId(banner.cell);
    const tile = tiles[id];
    if (!tile) continue;

    tiles[id] = {
      ...tile,
      polarity: tile.polarity === 'black' ? 'white' : 'black',
    };
    delete banners[banner.id];
  }

  return {
    accepted: true,
    state: {
      ...world,
      territory: {
        ...world.territory,
        tiles,
        banners,
      } as TerritoryWithBanners,
    },
  };
}
