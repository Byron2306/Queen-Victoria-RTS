import { describe, expect, it } from 'vitest';

import {
  createIntelligenceTileVisuals,
} from '../../src/client/render/intelligence-visuals';
import type {
  IntelligenceOverlayModel,
} from '../../src/client/render/intelligence-overlay';

const overlay: IntelligenceOverlayModel = {
  tiles: [
    {
      id: '9,9',
      cell: { x: 9, y: 9 },
      visibility: 'unknown',
      treatment: 'terrain_only',
    },
    {
      id: '2,2',
      cell: { x: 2, y: 2 },
      visibility: 'observed',
      treatment: 'normal',
    },
    {
      id: '6,6',
      cell: { x: 6, y: 6 },
      visibility: 'remembered',
      treatment: 'subdued',
    },
  ],
  ghosts: [],
};

describe('battlefield intelligence visual primitives', () => {
  it('maps observed, remembered and unknown to increasingly stronger veils', () => {
    const visuals = createIntelligenceTileVisuals(overlay);
    const byId = new Map(visuals.map(visual => [visual.id, visual]));

    expect(byId.get('2,2')).toMatchObject({
      treatment: 'normal',
      alpha: 0,
    });

    expect(byId.get('6,6')).toMatchObject({
      treatment: 'subdued',
    });

    expect(byId.get('9,9')).toMatchObject({
      treatment: 'terrain_only',
    });

    expect(byId.get('6,6')!.alpha).toBeGreaterThan(0);
    expect(byId.get('9,9')!.alpha)
      .toBeGreaterThan(byId.get('6,6')!.alpha);
  });

  it('keeps the veil beneath units and above battlefield art', () => {
    for (const visual of createIntelligenceTileVisuals(overlay)) {
      expect(visual.depth).toBeGreaterThan(0);
      expect(visual.depth).toBeLessThan(1000);
    }
  });

  it('sorts tile primitives deterministically by tile id', () => {
    expect(createIntelligenceTileVisuals(overlay).map(visual => visual.id))
      .toEqual(['2,2', '6,6', '9,9']);
  });
});
