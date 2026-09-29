import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PHASER_PARENT_ID,
  createPhaserShellDescriptor,
} from './shell';
import {
  createRoyalBattlefieldSceneClass,
} from './royal-battlefield-scene';
import {
  createTitleSceneClass,
} from './title-scene';

type PhaserConstants = Readonly<{
  AUTO: number;
  RESIZE: number;
  CENTER_BOTH: number;
}>;

type SceneConstructor =
  new (...args: any[]) => object;

export interface PhaserGameConfigLike {
  type: number;
  width: number;
  height: number;
  parent: string;
  backgroundColor: string;
  transparent: boolean;
  scale: {
    mode: number;
    autoCenter: number;
    width: number;
    height: number;
  };
  scene: readonly SceneConstructor[];
}

export function buildPhaserGameConfig(
  constants: PhaserConstants,
  BattlefieldScene: SceneConstructor,
): PhaserGameConfigLike {
  const shell = createPhaserShellDescriptor();

  return {
    type: constants.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: PHASER_PARENT_ID,
    backgroundColor: shell.background,
    transparent: shell.transparent,
    scale: {
      mode: constants.RESIZE,
      autoCenter: constants.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [
      BattlefieldScene,
    ],
  };
}

export async function startPhaserGame(): Promise<unknown> {
  if (typeof document === 'undefined') {
    throw new Error(
      'Phaser client requires a browser DOM',
    );
  }

  const phaserModule = await import('phaser');
  const Phaser =
    'default' in phaserModule
      ? phaserModule.default
      : phaserModule;

  const SceneBase =
    Phaser.Scene as unknown as new (
      config?: any,
    ) => {
      sceneConfig?: unknown;
    };

  const TitleScene =
    createTitleSceneClass(
      SceneBase,
    );

  const BattlefieldScene =
    createRoyalBattlefieldSceneClass(
      SceneBase,
    );

  const baseConfig = buildPhaserGameConfig(
    {
      AUTO: Phaser.AUTO,
      RESIZE: Phaser.Scale.RESIZE,
      CENTER_BOTH: Phaser.Scale.CENTER_BOTH,
    },
    BattlefieldScene,
  );

  const config: PhaserGameConfigLike = {
    ...baseConfig,
    scene: [
      TitleScene,
      BattlefieldScene,
    ],
  };

  return new Phaser.Game(
    config as Phaser.Types.Core.GameConfig,
  );
}
