import { describe, expect, it } from 'vitest';

import triptychSource from '../../src/client/phaser/triptych-battlefield-scene.ts?raw';

describe('Triptych scene creation ordering', () => {
  it('does not run camera-bound Triptych presentation during base create layout', () => {
    expect(triptychSource).toContain(
      'private triptychPresentationReady = false',
    );

    const layoutStart = triptychSource.indexOf(
      'layoutBattlefield(): void',
    );

    const createStart = triptychSource.indexOf(
      'create(): void',
      layoutStart,
    );

    const layoutBlock = triptychSource.slice(
      layoutStart,
      createStart,
    );

    expect(layoutBlock).toContain(
      'if (this.triptychPresentationReady)',
    );

    expect(layoutBlock).toContain(
      'this.refreshCameraBoundPresentation(true)',
    );
  });

  it('enables Triptych presentation only after base scene creation completes', () => {
    const createStart = triptychSource.indexOf(
      'create(): void',
    );

    const updateStart = triptychSource.indexOf(
      'update(time: number, delta: number): void',
      createStart,
    );

    const createBlock = triptychSource.slice(
      createStart,
      updateStart,
    );

    const superCreate =
      createBlock.indexOf('super.create()');

    const ready =
      createBlock.indexOf(
        'this.triptychPresentationReady = true',
      );

    expect(superCreate).toBeGreaterThanOrEqual(0);
    expect(ready).toBeGreaterThan(superCreate);
  });
});
