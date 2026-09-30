import type { Coord } from './types';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  allPlayableCells,
  isPlayableCell,
  orthogonalNeighbors,
} from './board-topology';
import {
  TRIPTYCH_V2_HEIGHT,
  TRIPTYCH_V2_WIDTH,
  allTriptychV2PlayableCells,
  isTriptychV2PlayableCell,
  triptychV2OrthogonalNeighbors,
} from './triptych-topology-v2';

export type BattlefieldTopologyId = 'triptych-v1' | 'triptych-v2';

export interface BattlefieldTopologyAuthority {
  readonly id: BattlefieldTopologyId;
  readonly width: number;
  readonly height: number;
  isPlayableCell(x: number, y: number): boolean;
  allPlayableCells(): Coord[];
  orthogonalNeighbors(x: number, y: number): Coord[];
}

export const DEFAULT_BATTLEFIELD_TOPOLOGY_ID: BattlefieldTopologyId =
  'triptych-v1';

const LEGACY_TRIPTYCH_TOPOLOGY: BattlefieldTopologyAuthority = {
  id: 'triptych-v1',
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  isPlayableCell,
  allPlayableCells,
  orthogonalNeighbors,
};

const TRIPTYCH_V2_TOPOLOGY: BattlefieldTopologyAuthority = {
  id: 'triptych-v2',
  width: TRIPTYCH_V2_WIDTH,
  height: TRIPTYCH_V2_HEIGHT,
  isPlayableCell: isTriptychV2PlayableCell,
  allPlayableCells: allTriptychV2PlayableCells,
  orthogonalNeighbors: triptychV2OrthogonalNeighbors,
};

const TOPOLOGIES: Record<BattlefieldTopologyId, BattlefieldTopologyAuthority> = {
  'triptych-v1': LEGACY_TRIPTYCH_TOPOLOGY,
  'triptych-v2': TRIPTYCH_V2_TOPOLOGY,
};

export function getBattlefieldTopology(
  id: BattlefieldTopologyId = DEFAULT_BATTLEFIELD_TOPOLOGY_ID,
): BattlefieldTopologyAuthority {
  return TOPOLOGIES[id];
}
