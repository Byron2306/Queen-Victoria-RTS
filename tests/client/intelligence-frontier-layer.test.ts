import { describe, expect, it } from 'vitest';

import {
  tilePolygon,
  type BoardProjection,
} from '../../src/client/board/projection';
import {
  createProjectedIntelligenceFrontier,
} from '../../src/client/render/intelligence-frontier-layer';
import type {
  IntelligenceOverlayModel,
} from '../../src/client/render/intelligence-overlay';

const projection: BoardProjection = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 900, y: 150 },
  bottomLeft: { x: 150, y: 800 },
  bottomRight: { x: 950, y: 850 },
};

const overlay: IntelligenceOverlayModel = {
  tiles: [
    {
      id: '7,8',
      cell: { x: 7, y: 8 },
      visibility: 'remembered',
      treatment: 'subdued',
    },
    {
      id: '8,8',
      cell: { x: 8, y: 8 },
      visibility: 'unknown',
      treatment: 'terrain_only',
    },
    {
      id: '6,8',
      cell: { x: 6, y: 8 },
      visibility: 'observed',
      treatment: 'normal',
    },
  ],
  ghosts: [],
};

describe('projected battlefield intelligence frontier', () => {
  it('projects each visible veil onto the exact board tile polygon', () => {
    const frontier = createProjectedIntelligenceFrontier(
      overlay,
      projection,
    );

    expect(frontier.map(record => record.id))
      .toEqual(['7,8', '8,8']);

    for (const record of frontier) {
      expect(record.polygon)
        .toEqual(tilePolygon(record.cell, projection));
      expect(record.alpha).toBeGreaterThan(0);
    }
  });

  it('omits observed tiles because their treatment has zero veil alpha', () => {
    const frontier = createProjectedIntelligenceFrontier(
      overlay,
      projection,
    );

    expect(frontier.some(record => record.id === '6,8'))
      .toBe(false);
  });
});
