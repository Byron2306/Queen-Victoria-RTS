import {
  tilePolygon,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';
import type {
  IntelligenceOverlayModel,
} from './intelligence-overlay';
import {
  createIntelligenceTileVisuals,
  type IntelligenceTileVisual,
} from './intelligence-visuals';

export type ProjectedIntelligenceFrontier =
  IntelligenceTileVisual & Readonly<{
    polygon: readonly ScreenPoint[];
  }>;

export function createProjectedIntelligenceFrontier(
  overlay: IntelligenceOverlayModel,
  projection: BoardProjection,
): readonly ProjectedIntelligenceFrontier[] {
  return createIntelligenceTileVisuals(overlay)
    .filter(visual => visual.alpha > 0)
    .map(visual => ({
      ...visual,
      polygon: tilePolygon(
        visual.cell,
        projection,
      ),
    }));
}
