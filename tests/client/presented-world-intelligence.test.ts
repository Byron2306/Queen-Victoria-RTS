import { describe, expect, it } from 'vitest';

import {
  createPresentedWorld,
  createPresentedWorldState,
} from '../../src/client/intelligence/presented-world';
import {
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { strategicTiles } from '../../src/sim/territory';
import { createWorld } from '../../src/sim/world';

function worldWithObservedAndHiddenEnemies() {
  let world = createWorld([
    { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 8 } },
    { id: 'seen-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 11 } },
    { id: 'hidden-knight', faction: 'obsidian', kind: 'knight', position: { x: 14, y: 14 } },
  ]);

  return refreshFactionIntelligence(world, 'victoria');
}

describe('faction-safe presented battlefield world', () => {
  it('includes friendly truth and observed enemies but removes hidden enemy truth', () => {
    const world = worldWithObservedAndHiddenEnemies();
    const presented = createPresentedWorld(world, 'victoria');

    expect(presented.units.map(unit => unit.id)).toContain('v-rook');
    expect(presented.units.map(unit => unit.id)).toContain('seen-pawn');
    expect(presented.units.map(unit => unit.id)).not.toContain('hidden-knight');
  });

  it('presents remembered enemy contacts as ghosts rather than live units', () => {
    let world = worldWithObservedAndHiddenEnemies();
    const memory = world.intelligence.byFaction.victoria['7,11']!;
    const { ['7,11']: _oldOccupant, ...occupancyWithoutOldCell } = world.occupancy;

    world = {
      ...world,
      units: {
        ...world.units,
        'seen-pawn': {
          ...world.units['seen-pawn']!,
          position: { x: 14, y: 13 },
        },
      },
      occupancy: {
        ...occupancyWithoutOldCell,
        '14,13': 'seen-pawn',
      },
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...world.intelligence.byFaction.victoria,
            '7,11': {
              ...memory,
              visibility: 'remembered',
              lastSeenRound: 4,
              lastKnownUnitId: 'seen-pawn',
              lastKnownPolarity: 'white',
            },
          },
        },
      },
    };

    const presented = createPresentedWorld(world, 'victoria');

    expect(presented.units.map(unit => unit.id)).not.toContain('seen-pawn');
    expect(presented.ghosts).toContainEqual({
      unitId: 'seen-pawn',
      cell: { x: 7, y: 11 },
      lastSeenRound: 4,
    });
  });

  it('uses stale remembered polarity rather than hidden authoritative polarity', () => {
    let world = worldWithObservedAndHiddenEnemies();
    const memory = world.intelligence.byFaction.victoria['7,11']!;
    const tiles = strategicTiles(world);

    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles: {
          ...tiles,
          '7,11': {
            ...tiles['7,11']!,
            polarity: 'black',
          },
        },
      } as typeof world.territory,
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...world.intelligence.byFaction.victoria,
            '7,11': {
              ...memory,
              visibility: 'remembered',
              lastSeenRound: 3,
              lastKnownPolarity: 'white',
            },
          },
        },
      },
    };

    const presented = createPresentedWorld(world, 'victoria');
    const tile = presented.tiles.find(tile => tile.id === '7,11');

    expect(tile).toMatchObject({
      visibility: 'remembered',
      polarity: 'white',
      lastSeenRound: 3,
    });
  });

  it('enumerates exactly the selected V2 topology and excludes rectangular void corners', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    const presented = createPresentedWorld(world, 'victoria');

    expect(presented.tiles).toHaveLength(496);
    expect(presented.tiles.some(tile => tile.cell.x === 27 && tile.cell.y === 18)).toBe(true);
    expect(presented.tiles.some(tile => tile.cell.x === 2 && tile.cell.y === 2)).toBe(false);
  });

  it('round-trips remembered V2 frontier intelligence without falling back to V1 tile construction', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    const memory = world.intelligence.byFaction.victoria['27,18']!;

    world = {
      ...world,
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...world.intelligence.byFaction.victoria,
            '27,18': {
              ...memory,
              visibility: 'remembered',
              lastSeenRound: 7,
              lastKnownPolarity: 'black',
              lastKnownControl: 'obsidian',
              lastKnownUnitId: 'shadow-frontier',
            },
          },
        },
      },
    };

    const presented = createPresentedWorld(world, 'victoria');
    const tile = presented.tiles.find(candidate => candidate.id === '27,18');
    expect(tile).toMatchObject({
      visibility: 'remembered',
      polarity: 'black',
      control: 'obsidian',
      lastSeenRound: 7,
    });
    expect(presented.ghosts).toContainEqual({
      unitId: 'shadow-frontier',
      cell: { x: 27, y: 18 },
      lastSeenRound: 7,
    });

    const projected = createPresentedWorldState(world, presented);
    expect(projected.territory.tiles?.['27,18']).toMatchObject({
      x: 27,
      y: 18,
      polarity: 'black',
      factionControl: 'obsidian',
    });
  });
});
