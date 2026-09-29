import { describe, expect, it } from 'vitest';

import { allPlayableCells, createBoardTile } from '../../src/sim/board-topology';
import { getTileMemory } from '../../src/sim/intelligence';
import { createWorld } from '../../src/sim/world';

describe('battlefield intelligence state', () => {
  it('creates unknown memory for every playable tile for each faction', () => {
    const world = createWorld();
    const playable = allPlayableCells();

    expect(Object.keys(world.intelligence.byFaction.victoria)).toHaveLength(playable.length);
    expect(Object.keys(world.intelligence.byFaction.obsidian)).toHaveLength(playable.length);

    for (const cell of playable) {
      expect(getTileMemory(world, 'victoria', cell)).toMatchObject({
        visibility: 'unknown',
        lastSeenRound: null,
        lastKnownPolarity: null,
        lastKnownControl: null,
        lastKnownUnitId: null,
        lastKnownFortificationId: null,
        lastKnownBannerId: null,
      });
      expect(getTileMemory(world, 'obsidian', cell).visibility).toBe('unknown');
    }
  });

  it('keeps visibility out of shared BoardTile truth', () => {
    const tile = createBoardTile({ x: 7, y: 7 });

    expect(tile).not.toHaveProperty('visibility');
    expect(tile).not.toHaveProperty('lastSeenRound');
    expect(tile).not.toHaveProperty('lastKnownUnitId');
  });
});
