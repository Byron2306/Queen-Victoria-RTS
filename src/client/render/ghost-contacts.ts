import {
  tileCenter,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';
import type {
  PresentedWorld,
} from '../intelligence/presented-world';
import type {
  Coord,
} from '../../sim/types';

export type GhostContactVisual = Readonly<{
  unitId: string;
  cell: Coord;
  lastSeenRound: number;
  anchor: ScreenPoint;
  opacity: number;
  depth: number;
  interactive: false;
}>;

const GHOST_OPACITY = 0.34;
const GHOST_DEPTH = 860;

export function createGhostContactVisuals(
  presented: PresentedWorld,
  projection: BoardProjection,
): readonly GhostContactVisual[] {
  return presented.ghosts
    .map((ghost) => ({
      unitId: ghost.unitId,
      cell: { ...ghost.cell },
      lastSeenRound: ghost.lastSeenRound,
      anchor: tileCenter(
        ghost.cell,
        projection,
      ),
      opacity: GHOST_OPACITY,
      depth: GHOST_DEPTH,
      interactive: false as const,
    }))
    .sort((a, b) =>
      a.lastSeenRound - b.lastSeenRound
      || a.cell.y - b.cell.y
      || a.cell.x - b.cell.x
      || a.unitId.localeCompare(b.unitId),
    );
}
