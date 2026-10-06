import { describe, expect, it } from 'vitest';

import sceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('mobile Phaser resize HUD reflow', () => {
  it('relayouts both battlefield and HUD when the Phaser scale resizes', () => {
    const resizeHookStart = sceneSource.indexOf(
      "scale?.on?.(\n        'resize',",
    );

    expect(resizeHookStart)
      .toBeGreaterThanOrEqual(0);

    const resizeHook = sceneSource.slice(
      resizeHookStart,
      resizeHookStart + 320,
    );

    expect(resizeHook).toContain(
      'this.layoutBattlefield()',
    );

    expect(resizeHook).toContain(
      'this.layoutHud()',
    );
  });

  it('keeps resize handling presentation-only', () => {
    const resizeHookStart = sceneSource.indexOf(
      "scale?.on?.(\n        'resize',",
    );

    const resizeHook = sceneSource.slice(
      resizeHookStart,
      resizeHookStart + 320,
    );

    expect(resizeHook).not.toContain(
      'this.controller.runtime.world =',
    );
    expect(resizeHook).not.toContain(
      'stepWorld(',
    );
    expect(resizeHook).not.toContain(
      'transitionTurnPhase(',
    );
  });
});
