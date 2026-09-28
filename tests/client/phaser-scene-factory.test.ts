import { describe, expect, it } from 'vitest';
import {
  createBattlefieldSceneClass,
} from '../../src/client/phaser/phaser-scene';

class FakeScene {
  public readonly sceneConfig: unknown;

  constructor(config?: unknown) {
    this.sceneConfig = config;
  }
}

describe('Phase 6 Phaser battlefield scene factory', () => {
  it('creates the canonical battlefield scene', () => {
    const BattlefieldScene =
      createBattlefieldSceneClass(FakeScene);

    const scene = new BattlefieldScene();

    expect(scene.sceneConfig).toEqual({
      key: 'battlefield',
    });
  });

  it('owns one scene controller', () => {
    const BattlefieldScene =
      createBattlefieldSceneClass(FakeScene);

    const scene = new BattlefieldScene();

    expect(scene.controller.runtime.world.tick)
      .toBe(0);
  });

  it('advances the authoritative runtime from Phaser update delta', () => {
    const BattlefieldScene =
      createBattlefieldSceneClass(FakeScene);

    const scene = new BattlefieldScene();

    scene.update(0, 50);
    expect(scene.controller.runtime.world.tick)
      .toBe(0);

    scene.update(50, 50);
    expect(scene.controller.runtime.world.tick)
      .toBe(0);
  });
});
