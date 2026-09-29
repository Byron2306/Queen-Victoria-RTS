import { describe, expect, it } from 'vitest';
import {
  nodeArtPresentation,
  NODE_ART_SOURCE,
} from '../../src/client/render/node-art-layout';

describe('Triptych node art layout', () => {
  it('uses a shared bottom-center anchor so state swaps never jump', () => {
    for (const source of Object.values(NODE_ART_SOURCE)) {
      expect(source.origin).toEqual({ x: 0.5, y: 1 });
    }
  });

  it('normalizes every minor state to the same visible battlefield width while preserving crop aspect ratio', () => {
    const tileWidth = 100;
    const states = [
      nodeArtPresentation('minor', null, false, tileWidth),
      nodeArtPresentation('minor', 'victoria', false, tileWidth),
      nodeArtPresentation('minor', 'obsidian', false, tileWidth),
      nodeArtPresentation('minor', null, true, tileWidth),
    ];

    for (const state of states) {
      expect(state.displayWidth).toBeCloseTo(105);
      expect(state.displayHeight / state.displayWidth)
        .toBeCloseTo(state.crop.height / state.crop.width);
      expect(state.origin).toEqual({ x: 0.5, y: 1 });
    }
  });

  it('keeps crown nodes larger than minor nodes without stretching their art', () => {
    const tileWidth = 100;
    const major = nodeArtPresentation('crown', 'victoria', false, tileWidth);
    const minor = nodeArtPresentation('minor', 'victoria', false, tileWidth);

    expect(major.displayWidth).toBeCloseTo(170);
    expect(major.displayWidth).toBeGreaterThan(minor.displayWidth);
    expect(major.displayHeight / major.displayWidth)
      .toBeCloseTo(major.crop.height / major.crop.width);
  });

  it('maps contested minor nodes to the dedicated split-crystal asset', () => {
    const presentation = nodeArtPresentation('minor', null, true, 100);
    expect(presentation.textureKey).toBe('royal-node-minor-contested');
  });
});
