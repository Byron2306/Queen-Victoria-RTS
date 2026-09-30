import type { Faction } from '../../sim/types';

export interface BannerArtPresentation {
  textureKey: 'royal-banner-victoria' | 'royal-banner-shadow';
  displayWidth: number;
  displayHeight: number;
  origin: Readonly<{ x: 0.5; y: 1 }>;
}

export function bannerArtPresentation(
  faction: Faction,
  tileWidth: number,
): BannerArtPresentation {
  const source = faction === 'victoria'
    ? { textureKey: 'royal-banner-victoria' as const, width: 63, height: 137 }
    : { textureKey: 'royal-banner-shadow' as const, width: 72, height: 137 };
  const displayHeight = Math.max(42, tileWidth * 1.08);
  return {
    textureKey: source.textureKey,
    displayWidth: displayHeight * source.width / source.height,
    displayHeight,
    origin: { x: 0.5, y: 1 },
  };
}
