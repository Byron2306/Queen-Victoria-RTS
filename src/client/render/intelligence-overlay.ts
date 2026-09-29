import type {
  PresentedGhost,
  PresentedWorld,
} from '../intelligence/presented-world';
import type {
  TileId,
} from '../../sim/board-topology';
import type {
  Coord,
  VisibilityState,
} from '../../sim/types';

export type IntelligenceTileTreatment =
  | 'normal'
  | 'subdued'
  | 'terrain_only';

export type IntelligenceOverlayTile = Readonly<{
  id: TileId;
  cell: Coord;
  visibility: VisibilityState;
  treatment: IntelligenceTileTreatment;
}>;

export type IntelligenceOverlayModel = Readonly<{
  tiles: readonly IntelligenceOverlayTile[];
  ghosts: readonly PresentedGhost[];
}>;

function treatmentFor(
  visibility: VisibilityState,
): IntelligenceTileTreatment {
  if (visibility === 'observed') {
    return 'normal';
  }

  if (visibility === 'remembered') {
    return 'subdued';
  }

  return 'terrain_only';
}

export function createIntelligenceOverlayModel(
  presented: PresentedWorld,
): IntelligenceOverlayModel {
  return {
    tiles: presented.tiles.map((tile) => ({
      id: tile.id,
      cell: tile.cell,
      visibility: tile.visibility,
      treatment: treatmentFor(tile.visibility),
    })),
    ghosts: presented.ghosts.map((ghost) => ({ ...ghost })),
  };
}
