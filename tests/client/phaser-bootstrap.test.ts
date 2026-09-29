import { describe, expect, it } from 'vitest';
import {
  buildPhaserGameConfig,
  startPhaserGame,
} from '../../src/client/phaser/bootstrap';

describe('Phase 6 Phaser bootstrap', () => {
  it('builds the real Phaser-facing config from the 4:3 shell contract', () => {
    const config = buildPhaserGameConfig(
      {
        AUTO: 0,
        RESIZE: 5,
        CENTER_BOTH: 1,
      },
      class BattlefieldScene {},
    );

    expect(config).toMatchObject({
      type: 0,
      width: 1600,
      height: 1200,
      parent: 'queen-victoria-rts',
      backgroundColor: '#100d18',
      transparent: false,
      scale: {
        mode: 5,
        autoCenter: 1,
        width: 1600,
        height: 1200,
      },
    });

    expect(config.scene).toHaveLength(1);
  });

  it('refuses to boot Phaser when no browser DOM exists', async () => {
    expect(typeof document).toBe('undefined');

    await expect(
      startPhaserGame(),
    ).rejects.toThrow(
      'Phaser client requires a browser DOM',
    );
  });
});
