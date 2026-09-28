import type {
  CaptureNodeState,
  UnitState,
  WorldState,
} from '../../sim/types';
import {
  boardCellToScreen,
  type BoardProjection,
  type ScreenPoint,
} from '../board/projection';
import {
  CANONICAL_ASSET_PATHS,
} from '../assets/canonical';

export type BattlefieldRenderProjection = BoardProjection;

export interface RenderedBattlefieldUnit {
  id: string;
  faction: UnitState['faction'];
  kind: UnitState['kind'];
  screen: ScreenPoint;
  asset: string | null;
  selected: boolean;
  scaleX: number;
}

export interface RenderedCaptureNode {
  id: string;
  kind: CaptureNodeState['kind'];
  owner: CaptureNodeState['owner'];
  contested: boolean;
  screen: ScreenPoint;
}

export interface BattlefieldRenderModel {
  boardAsset: string;
  units: readonly RenderedBattlefieldUnit[];
  nodes: readonly RenderedCaptureNode[];
}

function resolveUnitAsset(
  unit: UnitState,
): string | null {
  if (unit.id === 'victoria-queen') {
    return CANONICAL_ASSET_PATHS.victoria;
  }

  if (unit.id === 'obsidian-king') {
    return CANONICAL_ASSET_PATHS.shadowKing;
  }

  if (unit.faction === 'victoria') {
    if (unit.kind === 'king') {
      return CANONICAL_ASSET_PATHS.victoriaKing;
    }

    if (unit.kind === 'pawn') {
      return CANONICAL_ASSET_PATHS.victoriaPawn;
    }

    if (unit.kind === 'knight') {
      return CANONICAL_ASSET_PATHS.victoriaKnight;
    }

    if (unit.kind === 'bishop') {
      return CANONICAL_ASSET_PATHS.victoriaBishop;
    }

    if (unit.kind === 'rook') {
      return CANONICAL_ASSET_PATHS.victoriaRook;
    }

    return null;
  }

  if (unit.faction === 'obsidian') {
    if (unit.kind === 'pawn') {
      return CANONICAL_ASSET_PATHS.shadowPawn;
    }

    if (unit.kind === 'knight') {
      return CANONICAL_ASSET_PATHS.shadowKnight;
    }

    if (unit.kind === 'bishop') {
      return CANONICAL_ASSET_PATHS.shadowBishop;
    }

    if (unit.kind === 'rook') {
      return CANONICAL_ASSET_PATHS.shadowRook;
    }

    if (unit.kind === 'queen') {
      return CANONICAL_ASSET_PATHS.shadowQueen;
    }
  }

  return null;
}

function unitSortKey(
  unit: RenderedBattlefieldUnit,
): string {
  return [
    unit.screen.y.toFixed(6),
    unit.screen.x.toFixed(6),
    unit.id,
  ].join(':');
}

export function createBattlefieldRenderModel(
  world: WorldState,
  projection: BattlefieldRenderProjection,
  selectedUnitId: string | null,
): BattlefieldRenderModel {
  const units = Object.values(world.units)
    .map<RenderedBattlefieldUnit>((unit) => ({
      id: unit.id,
      faction: unit.faction,
      kind: unit.kind,
      screen: boardCellToScreen(
        unit.position,
        projection,
      ),
      asset: resolveUnitAsset(unit),
      selected: unit.id === selectedUnitId,
      scaleX:
        unit.faction === 'victoria'
          ? 1
          : -1,
    }))
    .sort(
      (a, b) =>
        unitSortKey(a).localeCompare(
          unitSortKey(b),
        ),
    );

  const nodes = Object.values(
    world.territory.nodes,
  )
    .map<RenderedCaptureNode>((node) => ({
      id: node.id,
      kind: node.kind,
      owner: node.owner,
      contested: node.contested,
      screen: boardCellToScreen(
        node.center,
        projection,
      ),
    }))
    .sort(
      (a, b) =>
        a.screen.y - b.screen.y ||
        a.screen.x - b.screen.x ||
        a.id.localeCompare(b.id),
    );

  return {
    boardAsset:
      CANONICAL_ASSET_PATHS.board,
    units,
    nodes,
  };
}
