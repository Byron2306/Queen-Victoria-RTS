import { describe, expect, it } from 'vitest';

import triptychSource from '../../src/client/phaser/triptych-battlefield-scene.ts?raw';

describe('mobile Triptych drag camera wiring', () => {
  it('uses owned drag state instead of pointer.isDown as the move gate', () => {
    const moveStart = triptychSource.indexOf(
      "input?.on?.(\n        'pointermove',",
    );

    expect(moveStart).toBeGreaterThanOrEqual(0);

    const moveBlock = triptychSource.slice(
      moveStart,
      moveStart + 1100,
    );

    expect(moveBlock).toContain(
      'this.cameraDragPoint',
    );

    expect(moveBlock).not.toContain(
      'pointer.isDown',
    );

    expect(moveBlock).toContain(
      'panStoredBattlefieldCamera(',
    );

    expect(moveBlock).toContain(
      'this.layoutBattlefield()',
    );
  });

  it('clears owned drag state on pointer release', () => {
    expect(triptychSource).toContain(
      "input?.on?.('pointerup', endDrag)",
    );

    expect(triptychSource).toContain(
      "input?.on?.('pointerupoutside', endDrag)",
    );
  });
});
