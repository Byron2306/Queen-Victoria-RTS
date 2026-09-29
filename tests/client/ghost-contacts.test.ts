import { describe, expect, it } from 'vitest';

import type {
  PresentedWorld,
} from '../../src/client/intelligence/presented-world';
import {
  createGhostContactVisuals,
} from '../../src/client/render/ghost-contacts';
import type {
  BoardProjection,
} from '../../src/client/board/projection';
import { tileCenter } from '../../src/client/board/projection';

const projection: BoardProjection = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 900, y: 150 },
  bottomLeft: { x: 150, y: 800 },
  bottomRight: { x: 950, y: 850 },
};

const presented: PresentedWorld = {
  faction: 'victoria',
  units: [],
  ghosts: [
    {
      unitId: 'shadow-knight',
      cell: { x: 10, y: 7 },
      lastSeenRound: 6,
    },
  ],
  tiles: [],
  nodes: [],
};

describe('stale battlefield ghost contacts', () => {
  it('anchors a ghost on the remembered cell and preserves last-seen metadata', () => {
    const ghosts = createGhostContactVisuals(
      presented,
      projection,
    );

    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toMatchObject({
      unitId: 'shadow-knight',
      cell: { x: 10, y: 7 },
      lastSeenRound: 6,
      interactive: false,
    });
    expect(ghosts[0]!.anchor)
      .toEqual(tileCenter({ x: 10, y: 7 }, projection));
    expect(ghosts[0]!.opacity).toBeGreaterThan(0);
    expect(ghosts[0]!.opacity).toBeLessThan(1);
  });

  it('never invents a live unit record or hidden current position', () => {
    const ghosts = createGhostContactVisuals(
      presented,
      projection,
    );

    expect(presented.units).toHaveLength(0);
    expect(Object.keys(ghosts[0]!))
      .not.toContain('currentPosition');
    expect(Object.keys(ghosts[0]!))
      .not.toContain('targetable');
  });
});
