import { describe, expect, it } from 'vitest';

import {
  createTriptychBattlefieldSceneClass,
} from '../../src/client/phaser/triptych-battlefield-scene';

class FakeScene {
  public readonly sceneConfig: unknown;

  constructor(config?: unknown) {
    this.sceneConfig = config;
  }
}

describe('Triptych camera-bound overlay coherence', () => {
  it('refreshes movement, strategic, node, and intelligence overlays as one camera-bound frame', () => {
    const TriptychScene = createTriptychBattlefieldSceneClass(FakeScene);
    const scene = new TriptychScene() as any;

    const calls: string[] = [];
    scene.redrawRoyalMoveMarkers = () => calls.push('move');
    scene.redrawStrategicOverlay = (force: boolean) => calls.push(`strategic:${force}`);
    scene.redrawRoyalNodes = (force: boolean) => calls.push(`nodes:${force}`);
    scene.refreshBattlefieldIntelligence = (force: boolean) => calls.push(`intel:${force}`);

    scene.refreshCameraBoundPresentation(true);

    expect(calls).toEqual([
      'move',
      'strategic:true',
      'nodes:true',
      'intel:true',
    ]);
  });
});
