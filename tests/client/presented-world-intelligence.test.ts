import { describe, expect, it } from 'vitest';

import { createPresentedWorld } from '../../src/client/intelligence/presented-world';
import {
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { createWorld } from '../../src/sim/world';

function worldWithObservedAndHiddenEnemies() {
  let world = createWorld([
    { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    { id: 'seen-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
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
    const memory = world.intelligence.byFaction.victoria['7,10']!;

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
        ...world.occupancy,
        '7,10': undefined,
        '14,13': 'seen-pawn',
      },
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...world.intelligence.byFaction.victoria,
            '7,10': {
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
      cell: { x: 7, y: 10 },
      lastSeenRound: 4,
    });
  });

  it('uses stale remembered polarity rather than hidden authoritative polarity', () => {
    let world = worldWithObservedAndHiddenEnemies();
    const memory = world.intelligence.byFaction.victoria['7,10']!;

    world = {
      ...world,
      polarity: {
        ...world.polarity,
        tiles: {
          ...world.polarity.tiles,
          '7,10': 'black',
        },
      },
      intelligence: {
        ...world.intelligence,
        byFaction: {
          ...world.intelligence.byFaction,
          victoria: {
            ...world.intelligence.byFaction.victoria,
            '7,10': {
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
    const tile = presented.tiles.find(tile => tile.id === '7,10');

    expect(tile).toMatchObject({
      visibility: 'remembered',
      polarity: 'white',
      lastSeenRound: 3,
    });
  });
});
