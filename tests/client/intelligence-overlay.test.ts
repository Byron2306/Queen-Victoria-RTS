import { describe, expect, it } from 'vitest';

import { createIntelligenceOverlayModel } from '../../src/client/render/intelligence-overlay';
import type { PresentedWorld } from '../../src/client/intelligence/presented-world';

const presented: PresentedWorld = {
  faction: 'victoria',
  units: [],
  ghosts: [
    {
      unitId: 'shadow-knight',
      cell: { x: 8, y: 9 },
      lastSeenRound: 6,
    },
  ],
  tiles: [
    {
      id: '7,7',
      cell: { x: 7, y: 7 },
      visibility: 'observed',
      polarity: 'white',
      control: 'victoria',
      lastSeenRound: 7,
    },
    {
      id: '8,9',
      cell: { x: 8, y: 9 },
      visibility: 'remembered',
      polarity: 'black',
      control: 'neutral',
      lastSeenRound: 6,
    },
    {
      id: '12,12',
      cell: { x: 12, y: 12 },
      visibility: 'unknown',
      polarity: null,
      control: null,
      lastSeenRound: null,
    },
  ],
};

describe('battlefield intelligence overlay model', () => {
  it('maps observed, remembered, and unknown tiles to distinct treatments', () => {
    const overlay = createIntelligenceOverlayModel(presented);

    expect(overlay.tiles.find(tile => tile.id === '7,7')).toMatchObject({
      visibility: 'observed',
      treatment: 'normal',
    });
    expect(overlay.tiles.find(tile => tile.id === '8,9')).toMatchObject({
      visibility: 'remembered',
      treatment: 'subdued',
    });
    expect(overlay.tiles.find(tile => tile.id === '12,12')).toMatchObject({
      visibility: 'unknown',
      treatment: 'terrain_only',
    });
  });

  it('keeps last-seen metadata on ghost contacts for UI disclosure', () => {
    const overlay = createIntelligenceOverlayModel(presented);

    expect(overlay.ghosts).toContainEqual({
      unitId: 'shadow-knight',
      cell: { x: 8, y: 9 },
      lastSeenRound: 6,
    });
  });
});
