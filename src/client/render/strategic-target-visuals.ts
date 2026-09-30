import {
  tileCenter,
  tilePolygon,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';
import {
  legalStrategicTargets,
  type StrategicTargetMode,
} from '../input/strategic-targeting';
import type {
  Coord,
  Faction,
  WorldState,
} from '../../sim/types';

export type StrategicTargetVisual = Readonly<{
  cell: Coord;
  anchor: ScreenPoint;
  polygon: readonly ScreenPoint[];
}>;

export function createStrategicTargetVisuals(
  world: WorldState,
  faction: Faction,
  mode: StrategicTargetMode,
  projection: BoardProjection,
): readonly StrategicTargetVisual[] {
  return legalStrategicTargets(world, faction, mode).map(cell => ({
    cell: { ...cell },
    anchor: tileCenter(cell, projection),
    polygon: tilePolygon(cell, projection),
  }));
}
