import { describe, expect, it } from 'vitest';

import phaserSceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('Victoria walk command seam', () => {
  it('does not erase unit interpolation immediately after committing orders', () => {
    const start =
      phaserSceneSource.indexOf(
        'private commitOrders(): void',
      );

    const end =
      phaserSceneSource.indexOf(
        'private layoutHudText(): void',
        start,
      );

    const commitOrdersSource =
      phaserSceneSource.slice(
        start,
        end,
      );

    expect(commitOrdersSource)
      .not.toContain(
        'this.layoutBattlefield();',
      );
  });
});
