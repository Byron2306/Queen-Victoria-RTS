import type {
  BattlefieldTopologyId,
} from '../../sim/battlefield-topology-authority';
import {
  createInteractiveBoardGrid,
} from '../board/interactive-board-grid';
import type {
  BoardProjection,
  ScreenPoint,
} from '../board/projection';

export function resolveBoardPointerCell(
  point: ScreenPoint,
  projection: BoardProjection,
  topologyId?: BattlefieldTopologyId,
): Readonly<{ x: number; y: number }> | null {
  return createInteractiveBoardGrid(
    projection,
    topologyId,
  ).hitTest(point);
}
