import type {
  WorldState,
} from '../../sim/types';
import type {
  BattlefieldRenderProjection,
} from '../render/battlefield-model';
import {
  createBattlefieldRenderModel,
} from '../render/battlefield-model';

export interface PhaserBoardLayer {
  textureKey: 'battlefield.board';
  asset: string;
  depth: 0;
}

export interface PhaserNodeLayer {
  id: string;
  kind: 'minor' | 'crown';
  owner: 'victoria' | 'obsidian' | null;
  contested: boolean;
  x: number;
  y: number;
  depth: 10;
}

export interface PhaserUnitLayer {
  id: string;
  asset: string;
  x: number;
  y: number;
  depth: number;
  scaleX: number;
}

export interface PhaserSelectionLayer {
  unitId: string;
  x: number;
  y: number;
  depth: number;
}

export interface PhaserBattlefieldFrame {
  board: PhaserBoardLayer;
  nodes: readonly PhaserNodeLayer[];
  units: readonly PhaserUnitLayer[];
  selection: PhaserSelectionLayer | null;
}

export function createPhaserBattlefieldFrame(
  world: WorldState,
  projection: BattlefieldRenderProjection,
  selectedUnitId: string | null,
): PhaserBattlefieldFrame {
  const model = createBattlefieldRenderModel(
    world,
    projection,
    selectedUnitId,
  );

  const units = model.units.map<PhaserUnitLayer>(
    (unit, index) => {
      if (!unit.asset) {
        throw new Error(
          `Missing canonical art for ${unit.id}`,
        );
      }

      return {
        id: unit.id,
        asset: unit.asset,
        x: unit.screen.x,
        y: unit.screen.y,
        scaleX: unit.scaleX,
        depth:
          1000 +
          Math.round(unit.screen.y * 10) +
          index,
      };
    },
  );

  const selected = model.units.find(
    unit => unit.selected,
  );

  return {
    board: {
      textureKey: 'battlefield.board',
      asset: model.boardAsset,
      depth: 0,
    },

    nodes: model.nodes.map(node => ({
      id: node.id,
      kind: node.kind,
      owner: node.owner,
      contested: node.contested,
      x: node.screen.x,
      y: node.screen.y,
      depth: 10,
    })),

    units,

    selection: selected
      ? {
          unitId: selected.id,
          x: selected.screen.x,
          y: selected.screen.y,
          depth:
            2000 +
            Math.round(selected.screen.y * 10),
        }
      : null,
  };
}
