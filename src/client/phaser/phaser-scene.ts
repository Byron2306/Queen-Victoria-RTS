import {
  BattlefieldSceneController,
} from './battlefield-scene';

type PhaserSceneBase = new (
  config?: any,
) => {
  sceneConfig?: unknown;
};

export function createBattlefieldSceneClass(
  BaseScene: PhaserSceneBase,
) {
  return class BattlefieldScene extends BaseScene {
    public readonly controller:
      BattlefieldSceneController;

    constructor() {
      super({
        key: 'battlefield',
      });

      this.controller =
        new BattlefieldSceneController();
    }

    update(
      _time: number,
      delta: number,
    ): void {
      this.controller.update(delta);
    }
  };
}
