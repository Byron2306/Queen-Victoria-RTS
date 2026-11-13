import { topologyForWorld } from '../../sim/territory';
import type {
  BoardProjection,
  ScreenPoint,
} from '../board/projection';

import {
  boardCellToScreen,
  tilePolygon,
} from '../board/projection';

import {
  legalDestinationsForUnit,
} from '../input/legal-destinations';

import type {
  Coord,
  WorldState,
} from '../../sim/types';

export interface SelectionGeometryDestination {
  cell: Coord;
  anchor: ScreenPoint;
  polygon: readonly ScreenPoint[];
}

export interface SelectionGeometryOverlay {
  selectedCell: Coord | null;
  selectedAnchor: ScreenPoint | null;
  selectedPolygon?: readonly ScreenPoint[] | null;
  destinations: readonly SelectionGeometryDestination[];
}

const EMPTY_OVERLAY: SelectionGeometryOverlay = {
  selectedCell: null,
  selectedAnchor: null,
  selectedPolygon: null,
  destinations: [],
};

export function createSelectionGeometryOverlay(
  world: WorldState,
  selectedUnitId: string | null,
  projection: BoardProjection,
): SelectionGeometryOverlay {
  if (!selectedUnitId) return EMPTY_OVERLAY;

  const unit = world.units[selectedUnitId];
  if (!unit) return EMPTY_OVERLAY;

  const topologyId = topologyForWorld(world).id;

  const selectedCell = {
    x: unit.position.x,
    y: unit.position.y,
  };

  const selectedAnchor = boardCellToScreen(selectedCell, projection, topologyId);
  const selectedPolygon = tilePolygon(selectedCell, projection, topologyId);

  const destinations = legalDestinationsForUnit(
    world,
    selectedUnitId,
  ).map((cell) => ({
    cell,
    anchor: boardCellToScreen(cell, projection, topologyId),
    polygon: tilePolygon(cell, projection, topologyId),
  }));

  return {
    selectedCell,
    selectedAnchor,
    selectedPolygon,
    destinations,
  };
}
