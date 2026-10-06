import { describe, expect, it } from 'vitest';

import phaserSceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('Victoria V1 Phaser integration', () => {
  it('preloads all eight stabilized Victoria walk textures', () => {
    for (let index = 1; index <= 8; index += 1) {
      const suffix = String(index).padStart(2, '0');

      expect(phaserSceneSource).toContain(
        `victoria-walk-${suffix}`,
      );

      expect(phaserSceneSource).toContain(
        `assets/units/victoria-walk/victoria-walk-${suffix}.png`,
      );
    }
  });

  it('drives Victoria walk texture selection from canonical presentation time', () => {
    expect(phaserSceneSource).toContain(
      'victoriaWalkFrameKey(',
    );

    expect(phaserSceneSource).toContain(
      'presentationClock.elapsedMs',
    );

    expect(phaserSceneSource).toContain(
      "unit.id === 'victoria-hero'",
    );

    expect(phaserSceneSource).toContain(
      "sprite.setTexture?.(",
    );
  });

  it('returns Victoria to canonical idle art when visual movement is complete', () => {
    expect(phaserSceneSource).toContain(
      "victoria-idle",
    );

    expect(phaserSceneSource).toContain(
      'motion.isMoving(',
    );
  });

  it('does not use Phaser animation timers as authority', () => {
    expect(phaserSceneSource).not.toContain(
      'scene.anims.create(',
    );
    expect(phaserSceneSource).not.toContain(
      '.play(',
    );
  });
});
