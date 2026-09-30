import { describe, expect, it } from 'vitest';
import { bannerArtPresentation } from '../../src/client/render/banner-art-layout';

describe('Triptych banner art layout', () => {
  it('maps each faction to its recovered standard and bottom-centre anchor', () => {
    expect(bannerArtPresentation('victoria', 64)).toMatchObject({
      textureKey: 'royal-banner-victoria',
      origin: { x: 0.5, y: 1 },
    });
    expect(bannerArtPresentation('obsidian', 64)).toMatchObject({
      textureKey: 'royal-banner-shadow',
      origin: { x: 0.5, y: 1 },
    });
  });

  it('preserves source aspect ratios while scaling from current tile width', () => {
    const victoria = bannerArtPresentation('victoria', 80);
    const shadow = bannerArtPresentation('obsidian', 80);

    expect(victoria.displayHeight).toBeCloseTo(86.4);
    expect(victoria.displayWidth / victoria.displayHeight)
      .toBeCloseTo(63 / 137, 6);
    expect(shadow.displayWidth / shadow.displayHeight)
      .toBeCloseTo(72 / 137, 6);
  });
});
