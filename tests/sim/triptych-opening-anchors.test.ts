import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { tileId } from '../../src/sim/board-topology';
import { strategicTiles } from '../../src/sim/territory';

describe('Triptych opening reinforcement anchors', () => {
  it('uses the approved V2 West/East deployment anchors', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.production.reinforcementAnchors).toEqual({
      victoria: { x: 1, y: 16 },
      obsidian: { x: 30, y: 15 },
    });
  });

  it('keeps both anchors playable, empty, and inside friendly opening territory', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);
    const topology = getBattlefieldTopology('triptych-v2');

    for (const faction of ['victoria', 'obsidian'] as const) {
      const anchor = world.production.reinforcementAnchors[faction];
      expect(topology.isPlayableCell(anchor.x, anchor.y)).toBe(true);
      expect(world.occupancy[`${anchor.x},${anchor.y}`]).toBeUndefined();
      expect(tiles[tileId(anchor)]?.factionControl).toBe(faction);
    }
  });
});
