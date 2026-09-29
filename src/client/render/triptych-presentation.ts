import {
  tileCenter,
  tilePolygon,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';
import type {
  TacticalOrder,
} from '../../sim/orders';
import type {
  BannerState,
} from '../../sim/polarity';
import type {
  FortificationState,
} from '../../sim/fortifications';
import {
  strategicTiles,
} from '../../sim/territory';
import type {
  Coord,
  Faction,
  MilitaryRank,
  WorldState,
} from '../../sim/types';

export type TriptychOrderVisualStyle =
  | 'move'
  | 'attack'
  | 'assault'
  | 'reinforce'
  | 'guard'
  | 'ability'
  | 'recruit';

export type TriptychOrderVisual = Readonly<{
  orderId: string;
  style: TriptychOrderVisualStyle;
  fromUnitId?: string;
  toUnitId?: string;
  from: ScreenPoint | null;
  to: ScreenPoint | null;
}>;

export type TerritoryOverlayRecord = Readonly<{
  cell: Coord;
  faction: Faction;
  polygon: readonly ScreenPoint[];
}>;

export type BannerOverlayRecord = Readonly<{
  id: string;
  faction: Faction;
  cell: Coord;
  roundsHeld: number;
  mature: boolean;
  contestedBy: Faction | null;
  anchor: ScreenPoint;
}>;

export type FortificationOverlayRecord = Readonly<{
  id: string;
  faction: Faction;
  cell: Coord;
  durability: number;
  polygon: readonly ScreenPoint[];
  anchor: ScreenPoint;
}>;

export type RankOverlayRecord = Readonly<{
  unitId: string;
  rank: MilitaryRank;
  kills: number;
  anchor: ScreenPoint;
}>;

export type TriptychStrategicOverlay = Readonly<{
  territory: readonly TerritoryOverlayRecord[];
  banners: readonly BannerOverlayRecord[];
  fortifications: readonly FortificationOverlayRecord[];
  ranks: readonly RankOverlayRecord[];
}>;

type StrategicTerritoryExtras = Readonly<{
  banners?: Readonly<Record<string, BannerState>>;
  fortifications?: Readonly<Record<string, FortificationState>>;
}>;

function unitAnchor(
  world: WorldState,
  unitId: string,
  projection: BoardProjection,
): ScreenPoint | null {
  const unit = world.units[unitId];
  return unit ? tileCenter(unit.position, projection) : null;
}

export function createTriptychOrderVisuals(
  world: WorldState,
  orders: readonly TacticalOrder[],
  projection: BoardProjection,
): readonly TriptychOrderVisual[] {
  return orders.map((order): TriptychOrderVisual => {
    if (order.kind === 'move') {
      return {
        orderId: order.orderId,
        style: 'move',
        fromUnitId: order.unitId,
        from: unitAnchor(world, order.unitId, projection),
        to: tileCenter(order.destination, projection),
      };
    }

    if (order.kind === 'attack' || order.kind === 'assault') {
      return {
        orderId: order.orderId,
        style: order.kind,
        fromUnitId: order.unitId,
        toUnitId: order.targetUnitId,
        from: unitAnchor(world, order.unitId, projection),
        to: unitAnchor(world, order.targetUnitId, projection),
      };
    }

    if (order.kind === 'reinforce') {
      return {
        orderId: order.orderId,
        style: 'reinforce',
        fromUnitId: order.unitId,
        toUnitId: order.supportedUnitId,
        from: unitAnchor(world, order.unitId, projection),
        to: unitAnchor(world, order.supportedUnitId, projection),
      };
    }

    if (order.kind === 'guard') {
      return {
        orderId: order.orderId,
        style: 'guard',
        fromUnitId: order.unitId,
        from: unitAnchor(world, order.unitId, projection),
        to: tileCenter(order.anchor, projection),
      };
    }

    if (order.kind === 'ability') {
      return {
        orderId: order.orderId,
        style: 'ability',
        fromUnitId: order.unitId,
        from: unitAnchor(world, order.unitId, projection),
        to: null,
      };
    }

    return {
      orderId: order.orderId,
      style: 'recruit',
      from: null,
      to: null,
    };
  });
}

export function createTriptychStrategicOverlay(
  world: WorldState,
  projection: BoardProjection,
): TriptychStrategicOverlay {
  const tiles = Object.values(strategicTiles(world));
  const extras = world.territory as typeof world.territory & StrategicTerritoryExtras;

  const territory = tiles
    .filter((tile) => tile.factionControl !== 'neutral')
    .map<TerritoryOverlayRecord>((tile) => ({
      cell: { ...tile.cell },
      faction: tile.factionControl as Faction,
      polygon: tilePolygon(tile.cell, projection),
    }));

  const banners = Object.values(extras.banners ?? {})
    .map<BannerOverlayRecord>((banner) => ({
      id: banner.id,
      faction: banner.faction,
      cell: { ...banner.cell },
      roundsHeld: banner.roundsHeld,
      mature: banner.mature,
      contestedBy: banner.contestedBy,
      anchor: tileCenter(banner.cell, projection),
    }));

  const fortifications = Object.values(extras.fortifications ?? {})
    .map<FortificationOverlayRecord>((fortification) => ({
      id: fortification.id,
      faction: fortification.faction,
      cell: { ...fortification.cell },
      durability: fortification.durability,
      polygon: tilePolygon(fortification.cell, projection),
      anchor: tileCenter(fortification.cell, projection),
    }));

  const ranks = Object.entries(world.military)
    .filter(([unitId]) => world.units[unitId] !== undefined)
    .map<RankOverlayRecord>(([unitId, record]) => ({
      unitId,
      rank: record.rank,
      kills: record.kills,
      anchor: unitAnchor(world, unitId, projection)!,
    }));

  return { territory, banners, fortifications, ranks };
}
