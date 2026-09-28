import { describe, expect, it } from 'vitest';
import {
  BattlefieldSceneController,
} from '../../src/client/phaser/battlefield-scene';

describe('Phase 6 battlefield scene controller', () => {
  it('owns exactly one fixed-tick runtime', () => {
    const controller =
      new BattlefieldSceneController();

    expect(controller.runtime.world.tick)
      .toBe(0);
  });

  it('advances the runtime from frame delta', () => {
    const controller =
      new BattlefieldSceneController();

    controller.update(50);
    expect(controller.runtime.world.tick)
      .toBe(0);

    controller.update(50);
    expect(controller.runtime.world.tick)
      .toBe(1);
  });

  it('returns the events produced by runtime advancement', () => {
    const controller =
      new BattlefieldSceneController();

    const result = controller.update(100);

    expect(result.steps).toBe(1);
    expect(Array.isArray(result.events))
      .toBe(true);
  });

  it('exposes the authoritative world directly from runtime', () => {
    const controller =
      new BattlefieldSceneController();

    expect(controller.world)
      .toBe(controller.runtime.world);

    controller.update(100);

    expect(controller.world)
      .toBe(controller.runtime.world);
  });
});
