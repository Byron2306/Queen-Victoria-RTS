import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { findReinforcementSpawn } from '../../src/sim/production';
import { strategicTiles } from '../../src/sim/territory';
import { tileId } from '../../src/sim/board-topology';

describe('Triptych V2 reinforcement anchors', () => {
  it('uses symmetric rear deployment anchors for the 32x32 opening', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.production.reinforcementAnchors).toEqual({
      victoria: { x: 1, y: 16 },
      obsidian: { x: 30, y: 15 },
    });
  });

  it('keeps both V2 anchors playable, empty, and on friendly opening territory', () => {
    const world = createPhase6SkirmishWorld();
    const topology = getBattlefieldTopology('triptych-v2');
    const tiles = strategicTiles(world);

    for (const faction of ['victoria', 'obsidian'] as const) {
      const anchor = world.production.reinforcementAnchors[faction];
      expect(topology.isPlayableCell(anchor.x, anchor.y)).toBe(true);
      expect(world.occupancy[`${anchor.x},${anchor.y}`]).toBeUndefined();
      expect(tiles[tileId(anchor)]?.factionControl).toBe(faction);
    }
  });

  it('uses the V2 anchors as valid deterministic spawn origins', () => {
    const world = createPhase6SkirmishWorld();

    expect(findReinforcementSpawn(world, 'victoria')).toEqual({ x: 1, y: 16 });
    expect(findReinforcementSpawn(world, 'obsidian')).toEqual({ x: 30, y: 15 });
  });
});
