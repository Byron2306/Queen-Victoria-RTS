import { describe, expect, it } from 'vitest';
import { createTriptychBattlefieldSceneClass } from '../../src/client/phaser/triptych-battlefield-scene';
import { createResponsiveBattlefieldLayout } from '../../src/client/render/responsive-battlefield';
import { createBattlefieldSceneRuntime } from '../../src/client/phaser/scene-rendering';
import { UNIT_MOVE_VISUAL_MS } from '../../src/client/render/unit-motion';

class FakeSceneBase {
  public scale = { width: 1600, height: 900 };
  constructor(_config?: unknown) {}
}

describe('post-commit unit motion presentation', () => {
  it('keeps live Triptych movement at its origin on commit and interpolates to its resolved destination', () => {
    const Scene = createTriptychBattlefieldSceneClass(FakeSceneBase);
    const scene = new Scene() as any;
    // Only the Phaser/HUD drawing boundary is omitted; layout, motion,
    // command staging, and full-round strategic resolution remain real.
    for (const method of [
      'applyUnitVisualFootprint', 'refreshSelection',
      'refreshLegalDestinationMarkers', 'refreshBoardDebugOverlay',
      'layoutHud', 'refreshHudText', 'refreshRoyalGuidance',
      'redrawRoyalMoveMarkers', 'redrawRoyalNodes',
      'redrawStrategicOverlay', 'showCombatDelta',
    ]) scene[method] = () => {};
    const sprite = {
      x: 0, y: 0,
      setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
      setDepth() { return this; },
      setScale() { return this; },
    };
    scene.unitSprites.set('victoria-queen', sprite);
    scene.layoutBattlefield();
    const origin = { x: sprite.x, y: sprite.y };
    scene.controller.runtime.commands.move(
      scene.controller.world, 'victoria-queen', { x: 5, y: 16 },
    );

    scene.commitOrders();

    expect(scene.controller.world.units['victoria-queen'].position)
      .toEqual({ x: 5, y: 16 });
    const layout = createResponsiveBattlefieldLayout(1600, 900);
    const frame = createBattlefieldSceneRuntime(
      scene.controller.world, null, layout.projection,
    ).frame;
    const queen = frame.units.find(unit => unit.id === 'victoria-queen')!;
    const destination = { x: queen.x, y: queen.y };
    expect(destination).not.toEqual(origin);
    expect({ x: sprite.x, y: sprite.y }).toEqual(origin);
    expect(scene.motion.resolve('victoria-queen', destination, 1000)).toEqual(origin);
    expect(scene.motion.isMoving('victoria-queen', 1000)).toBe(true);
    expect(scene.motion.resolve('victoria-queen', destination, 1000 + UNIT_MOVE_VISUAL_MS))
      .toEqual(destination);
  });
});
