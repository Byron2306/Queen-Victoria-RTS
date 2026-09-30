import {
  createInteractiveBoardGrid,
} from '../board/interactive-board-grid';
import type {
  BoardProjection,
  ScreenPoint,
} from '../board/projection';
import type {
  StrategicTargetMode,
} from './strategic-targeting';

export type StrategicCommandButton = Readonly<{
  label: string;
  mode: StrategicTargetMode;
}>;

export const STRATEGIC_COMMAND_BUTTONS: readonly StrategicCommandButton[] = [
  { label: 'BANNER', mode: 'deploy_banner' },
  { label: 'BASTION', mode: 'build_bastion' },
  { label: 'REDOUBT', mode: 'build_redoubt' },
  { label: 'ANNEX', mode: 'annex_tile' },
];

export function strategicTargetCellAtPoint(
  point: ScreenPoint,
  projection: BoardProjection,
): Readonly<{ x: number; y: number }> | null {
  return createInteractiveBoardGrid(projection).hitTest(point);
}
