import { describe, expect, it } from 'vitest';

import { strategicTiles } from '../../src/sim/territory';
import { tileId } from '../../src/sim/board-topology';
import {
  getTileMemory,
  isTileKnown,
  isTileObserved,
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { queueBanner } from '../../src/sim/polarity';
import { createWorld } from '../../src/sim/world';
import type { WorldState } from '../../src/sim/types';

const target = { x: 7, y: 10 } as const;

function hideVictoriaObserver(world: WorldState): WorldState {
  const enemy = world.units.enemy;
  return {
    ...world,
    units: enemy ? { enemy } : {},
    occupancy: enemy ? { [tileId(enemy.position)]: enemy.id } : {},
    combat: enemy && world.combat.enemy ? { enemy: world.combat.enemy } : {},
    military: enemy && world.military.enemy ? { enemy: world.military.enemy } : {},
  };
}

describe('battlefield intelligence memory', () => {
  it('snapshots only currently observed battlefield truth', () => {
    let world = createWorld([
      { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      { id: 'enemy', faction: 'obsidian', kind: 'pawn', position: target },
    ]);
    world = queueBanner(world, {
      bannerId: 'shadow-banner', faction: 'obsidian', cell: target,
    }).state;
    world = {
      ...world,
      territory: {
        ...world.territory,
        fortifications: {
          'shadow-fort': {
            id: 'shadow-fort', faction: 'obsidian', kind: 'bastion', cell: target, durability: 3,
          },
        },
      } as any,
    };

    world = refreshFactionIntelligence(world, 'victoria');
    const memory = getTileMemory(world, 'victoria', target);

    expect(memory.visibility).toBe('observed');
    expect(memory.lastSeenRound).toBe(world.turn.round);
    expect(memory.lastKnownPolarity).toBe(strategicTiles(world)[tileId(target)]!.polarity);
    expect(memory.lastKnownControl).toBe('neutral');
    expect(memory.lastKnownUnitId).toBe('enemy');
    expect(memory.lastKnownFortificationId).toBe('shadow-fort');
    expect(memory.lastKnownBannerId).toBe('shadow-banner');
    expect(isTileObserved(world, 'victoria', target)).toBe(true);
    expect(isTileKnown(world, 'victoria', target)).toBe(true);
  });

  it('changes lost sight to remembered without updating the stored snapshot', () => {
    let world = createWorld([
      { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      { id: 'enemy', faction: 'obsidian', kind: 'pawn', position: target },
    ]);
    world = refreshFactionIntelligence(world, 'victoria');
    const observed = getTileMemory(world, 'victoria', target);

    world = refreshFactionIntelligence(hideVictoriaObserver(world), 'victoria');
    const remembered = getTileMemory(world, 'victoria', target);

    expect(remembered.visibility).toBe('remembered');
    expect(remembered).toEqual({ ...observed, visibility: 'remembered' });
    expect(isTileObserved(world, 'victoria', target)).toBe(false);
    expect(isTileKnown(world, 'victoria', target)).toBe(true);
  });

  it('keeps a hidden polarity flip stale until the tile is re-observed', () => {
    let world = createWorld([
      { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    ]);
    world = refreshFactionIntelligence(world, 'victoria');
    const first = getTileMemory(world, 'victoria', target).lastKnownPolarity!;

    world = refreshFactionIntelligence(hideVictoriaObserver(world), 'victoria');
    const tiles = { ...strategicTiles(world) };
    tiles[tileId(target)] = {
      ...tiles[tileId(target)]!,
      polarity: first === 'white' ? 'black' : 'white',
    };
    world = {
      ...world,
      territory: { ...world.territory, tiles } as any,
    };
    world = refreshFactionIntelligence(world, 'victoria');

    expect(getTileMemory(world, 'victoria', target)).toMatchObject({
      visibility: 'remembered',
      lastKnownPolarity: first,
    });

    world = {
      ...world,
      units: {
        ...world.units,
        scout: { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      },
      occupancy: { ...world.occupancy, '7,7': 'scout' },
    };
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', target).lastKnownPolarity).not.toBe(first);
  });

  it('leaves a ghost at the last seen cell and clears it when that cell is observed empty', () => {
    let world = createWorld([
      { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      { id: 'enemy', faction: 'obsidian', kind: 'pawn', position: target },
    ]);
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', target).lastKnownUnitId).toBe('enemy');

    const movedEnemy = { ...world.units.enemy!, position: { x: 12, y: 12 } };
    world = {
      ...hideVictoriaObserver(world),
      units: { enemy: movedEnemy },
      occupancy: { '12,12': 'enemy' },
    };
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', target)).toMatchObject({
      visibility: 'remembered',
      lastKnownUnitId: 'enemy',
    });

    world = {
      ...world,
      units: {
        ...world.units,
        scout: { id: 'scout', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      },
      occupancy: { ...world.occupancy, '7,7': 'scout' },
    };
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', target)).toMatchObject({
      visibility: 'observed',
      lastKnownUnitId: null,
    });
  });
});
