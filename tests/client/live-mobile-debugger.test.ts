import { describe, expect, it } from 'vitest';

import debugSource from '../../src/client/debug/live-debug-overlay.ts?raw';
import mainSource from '../../src/client/main.ts?raw';
import sceneSource from '../../src/client/phaser/triptych-battlefield-scene.ts?raw';
import baseSceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('live mobile debugger contract', () => {
  it('provides a non-interactive DOM overlay gated by ?debug=1', () => {
    expect(debugSource).toContain('pointerEvents');
    expect(debugSource).toContain("'none'");
    expect(mainSource).toContain("debug=1");
    expect(mainSource).toContain('installLiveDebugOverlay');
  });

  it('captures Triptych pointer and camera telemetry', () => {
    expect(sceneSource).toContain('publishLiveDebug');
    expect(sceneSource).toContain("'pointerdown'");
    expect(sceneSource).toContain("'pointermove'");
    expect(sceneSource).toContain("'pointerup'");
    expect(sceneSource).toContain('getBattlefieldCameraState()');
  });

  it('captures Victoria motion and authoritative-versus-sprite position', () => {
    expect(baseSceneSource).toContain('publishLiveDebug');
    expect(baseSceneSource).toContain("unit.id === 'victoria-queen'");
    expect(baseSceneSource).toContain('this.motion.isMoving(');
  });
});
