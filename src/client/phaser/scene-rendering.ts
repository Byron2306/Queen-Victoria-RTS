import type {
  WorldState,
} from '../../sim/types';
import type {
  BattlefieldRenderProjection,
} from '../render/battlefield-model';
import {
  createPhaserBattlefieldFrame,
  type PhaserBattlefieldFrame,
} from './battlefield-renderer';

export const BATTLEFIELD_PROJECTION: BattlefieldRenderProjection = {
  topLeft: { x: 1200, y: 180 },
  topRight: { x: 1480, y: 820 },
  bottomLeft: { x: 400, y: 180 },
  bottomRight: { x: 120, y: 820 },
};

export interface PhaserTextureDefinition {
  key: string;
  asset: string;
}

export interface BattlefieldSceneRuntime {
  textures: readonly PhaserTextureDefinition[];
  frame: PhaserBattlefieldFrame;
}

function textureKeyFromAsset(
  asset: string,
): string {
  const name = asset
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '');

  return `asset.${name ?? 'unknown'}`;
}

export function createBattlefieldSceneRuntime(
  world: WorldState,
  selectedUnitId: string | null,
  projection: BattlefieldRenderProjection = BATTLEFIELD_PROJECTION,
): BattlefieldSceneRuntime {
  const frame = createPhaserBattlefieldFrame(
    world,
    projection,
    selectedUnitId,
  );

  const textures = new Map<string, PhaserTextureDefinition>();

  textures.set(
    frame.board.asset,
    {
      key: frame.board.textureKey,
      asset: frame.board.asset,
    },
  );

  for (const unit of frame.units) {
    if (!textures.has(unit.asset)) {
      textures.set(
        unit.asset,
        {
          key: textureKeyFromAsset(unit.asset),
          asset: unit.asset,
        },
      );
    }
  }

  return {
    textures: [...textures.values()],
    frame,
  };
}
