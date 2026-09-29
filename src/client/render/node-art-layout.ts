import type { Faction } from '../../sim/types';

export type NodeArtCrop = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type NodeArtSource = Readonly<{
  textureKey: string;
  crop: NodeArtCrop;
  origin: Readonly<{ x: 0.5; y: 1 }>;
}>;

export const NODE_ART_SOURCE = {
  majorNeutral: {
    textureKey: 'royal-node-major-neutral',
    crop: { x: 4, y: 4, width: 243, height: 318 },
    origin: { x: 0.5, y: 1 },
  },
  majorVictoria: {
    textureKey: 'royal-node-major-victoria',
    crop: { x: 4, y: 4, width: 263, height: 322 },
    origin: { x: 0.5, y: 1 },
  },
  majorShadow: {
    textureKey: 'royal-node-major-shadow',
    crop: { x: 4, y: 4, width: 267, height: 325 },
    origin: { x: 0.5, y: 1 },
  },
  minorNeutral: {
    textureKey: 'royal-node-minor-neutral',
    crop: { x: 145, y: 293, width: 961, height: 713 },
    origin: { x: 0.5, y: 1 },
  },
  minorVictoria: {
    textureKey: 'royal-node-minor-victoria',
    crop: { x: 152, y: 251, width: 951, height: 769 },
    origin: { x: 0.5, y: 1 },
  },
  minorShadow: {
    textureKey: 'royal-node-minor-shadow',
    crop: { x: 215, y: 276, width: 823, height: 707 },
    origin: { x: 0.5, y: 1 },
  },
  minorContested: {
    textureKey: 'royal-node-minor-contested',
    crop: { x: 181, y: 181, width: 890, height: 886 },
    origin: { x: 0.5, y: 1 },
  },
} as const satisfies Readonly<Record<string, NodeArtSource>>;

function sourceFor(
  kind: 'crown' | 'minor',
  owner: Faction | null,
  contested: boolean,
): NodeArtSource {
  if (kind === 'crown') {
    if (owner === 'victoria') return NODE_ART_SOURCE.majorVictoria;
    if (owner === 'obsidian') return NODE_ART_SOURCE.majorShadow;
    return NODE_ART_SOURCE.majorNeutral;
  }

  if (contested) return NODE_ART_SOURCE.minorContested;
  if (owner === 'victoria') return NODE_ART_SOURCE.minorVictoria;
  if (owner === 'obsidian') return NODE_ART_SOURCE.minorShadow;
  return NODE_ART_SOURCE.minorNeutral;
}

export function nodeArtPresentation(
  kind: 'crown' | 'minor',
  owner: Faction | null,
  contested: boolean,
  tileWidth: number,
): Readonly<{
  textureKey: string;
  crop: NodeArtCrop;
  origin: Readonly<{ x: 0.5; y: 1 }>;
  displayWidth: number;
  displayHeight: number;
}> {
  const source = sourceFor(kind, owner, contested);
  const displayWidth = Math.max(
    kind === 'crown' ? 78 : 48,
    tileWidth * (kind === 'crown' ? 1.7 : 1.05),
  );

  return {
    textureKey: source.textureKey,
    crop: source.crop,
    origin: source.origin,
    displayWidth,
    displayHeight: displayWidth * source.crop.height / source.crop.width,
  };
}
