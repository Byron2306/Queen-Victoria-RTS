import type {
  IntelligenceOverlayModel,
  IntelligenceTileTreatment,
} from './intelligence-overlay';
import type {
  TileId,
} from '../../sim/board-topology';
import type {
  Coord,
} from '../../sim/types';

export type IntelligenceTileVisual = Readonly<{
  id: TileId;
  cell: Coord;
  treatment: IntelligenceTileTreatment;
  fill: number;
  alpha: number;
  stroke: number;
  strokeAlpha: number;
  depth: number;
}>;

function styleFor(
  treatment: IntelligenceTileTreatment,
): Pick<
  IntelligenceTileVisual,
  'fill' | 'alpha' | 'stroke' | 'strokeAlpha' | 'depth'
> {
  switch (treatment) {
    case 'normal':
      return {
        fill: 0x000000,
        alpha: 0,
        stroke: 0x000000,
        strokeAlpha: 0,
        depth: 620,
      };

    case 'subdued':
      return {
        fill: 0x302c3b,
        alpha: 0.24,
        stroke: 0x8b8198,
        strokeAlpha: 0.16,
        depth: 620,
      };

    case 'terrain_only':
      return {
        fill: 0x171823,
        alpha: 0.42,
        stroke: 0x5f6474,
        strokeAlpha: 0.22,
        depth: 620,
      };
  }
}

export function createIntelligenceTileVisuals(
  overlay: IntelligenceOverlayModel,
): readonly IntelligenceTileVisual[] {
  return [...overlay.tiles]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((tile) => ({
      id: tile.id,
      cell: { ...tile.cell },
      treatment: tile.treatment,
      ...styleFor(tile.treatment),
    }));
}
