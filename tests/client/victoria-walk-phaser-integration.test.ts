import { describe, expect, it } from 'vitest';

import phaserSceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('Victoria V1 Phaser integration', () => {
  it('preloads the canonical stabilized Victoria walk texture family', () => {
    expect(phaserSceneSource).toContain(
      'VICTORIA_WALK_FRAME_PATHS',
    );

    expect(phaserSceneSource).toContain(
      'scene.load.image(',
    );

    expect(phaserSceneSource).toContain(
      'victoria-walk-',
    );
  });

  it('drives Victoria walk texture selection from canonical presentation time', () => {
    expect(phaserSceneSource).toContain(
      'victoriaWalkFrameKey(',
    );

    expect(phaserSceneSource).toContain(
      'presentationClock.elapsedMs',
    );

    expect(phaserSceneSource).toContain(
      "unit.id === 'victoria-queen'",
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
