import { createRoyalBattlefieldSceneClass } from './royal-battlefield-scene';
import { removeStaleUnitSprites } from './unit-sprite-lifecycle';

type PhaserSceneBase = new (config?: any) => object;

export function createTriptychBattlefieldSceneClass<
  TBase extends PhaserSceneBase,
>(BaseScene: TBase) {
  const RoyalScene = createRoyalBattlefieldSceneClass(BaseScene) as any;

  return class TriptychBattlefieldScene extends RoyalScene {
    update(time: number, delta: number): void {
      super.update(time, delta);

      const liveUnitIds = new Set<string>(
        Object.keys(this.controller.world.units),
      );

      removeStaleUnitSprites(
        this.unitSprites,
        liveUnitIds,
      );
    }
  } as unknown as {
    new (): InstanceType<TBase> & {
      update(time: number, delta: number): void;
    };
  };
}
