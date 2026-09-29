import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { isPlayableCell, tileId } from '../../src/sim/board-topology';
import { strategicTiles } from '../../src/sim/territory';

describe('Triptych opening reinforcement anchors', () => {
  it('uses the approved West/East deployment anchors', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.production.reinforcementAnchors).toEqual({
      victoria: { x: 2, y: 12 },
      obsidian: { x: 21, y: 11 },
    });
  });

  it('keeps both anchors playable, empty, and inside friendly opening territory', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);

    for (const faction of ['victoria', 'obsidian'] as const) {
      const anchor = world.production.reinforcementAnchors[faction];
      expect(isPlayableCell(anchor.x, anchor.y)).toBe(true);
      expect(world.occupancy[`${anchor.x},${anchor.y}`]).toBeUndefined();
      expect(tiles[tileId(anchor)]?.factionControl).toBe(faction);
    }
  });
});
