import {
  isPlayableCell,
  tileId,
  type BoardTile,
  type TileId,
  type TilePolarity,
} from './board-topology';
import { strategicTiles, type TriptychTerritoryState } from './territory';
import type { Coord, Faction, WorldState } from './types';

export type BannerState = Readonly<{
  id: string;
  faction: Faction;
  cell: Coord;
  roundsHeld: number;
  mature: boolean;
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

export function resolveBannerProgress(world: WorldState): BannerResult {
  const banners: Record<string, BannerState> = {};

  for (const [id, banner] of Object.entries(bannersFor(world))) {
    const roundsHeld = Math.min(2, banner.roundsHeld + 1);
    banners[id] = {
      ...banner,
      roundsHeld,
      mature: roundsHeld >= 2,
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
  const mature = Object.values(currentBanners).filter((banner) => banner.mature);

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
