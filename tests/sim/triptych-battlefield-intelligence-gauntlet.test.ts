import { describe, expect, it } from 'vitest';

import { selectPriorityTarget } from '../../src/sim/ai';
import { tileId } from '../../src/sim/board-topology';
import {
  buildFortification,
  damageFortification,
} from '../../src/sim/fortifications';
import {
  getTileMemory,
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { validateMoveKnowledge } from '../../src/sim/knowledge-legality';
import {
  applyMaturePolarityFlips,
  getTilePolarity,
  queueBanner,
  resolveBannerProgress,
} from '../../src/sim/polarity';
import { strategicTiles } from '../../src/sim/territory';
import type { Coord, WorldState } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

function reposition(
  world: WorldState,
  unitId: string,
  destination: Coord,
): WorldState {
  const unit = world.units[unitId]!;
  const occupancy = { ...world.occupancy };
  delete occupancy[`${unit.position.x},${unit.position.y}`];
  occupancy[`${destination.x},${destination.y}`] = unitId;

  return {
    ...world,
    units: {
      ...world.units,
      [unitId]: {
        ...unit,
        position: destination,
      },
    },
    occupancy,
  };
}

describe('Royal War Triptych battlefield intelligence gauntlet', () => {
  it('lets hidden banner warfare poison stale remembered geometry without rewriting enemy memory', () => {
    const trap = { x: 7, y: 9 } as const;
    let world = createWorld([
      {
        id: 'v-rook',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 7, y: 6 },
      },
      {
        id: 'shadow-pawn',
        faction: 'obsidian',
        kind: 'pawn',
        position: { x: 13, y: 9 },
      },
    ]);

    expect(getTilePolarity(world, trap)).toBe('white');

    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', trap)).toMatchObject({
      visibility: 'observed',
      lastKnownPolarity: 'white',
    });

    world = reposition(world, 'v-rook', { x: 12, y: 6 });
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', trap)).toMatchObject({
      visibility: 'remembered',
      lastKnownPolarity: 'white',
    });

    const planted = queueBanner(world, {
      bannerId: 'shadow-trap-banner',
      faction: 'obsidian',
      cell: trap,
    });
    expect(planted.accepted).toBe(true);
    world = planted.state;

    world = resolveBannerProgress(world).state;
    world = resolveBannerProgress(world).state;
    world = applyMaturePolarityFlips(world).state;

    expect(getTilePolarity(world, trap)).toBe('black');

    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', trap)).toMatchObject({
      visibility: 'remembered',
      lastKnownPolarity: 'white',
    });

    world = reposition(world, 'v-rook', { x: 7, y: 6 });
    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', trap)).toMatchObject({
      visibility: 'observed',
      lastKnownPolarity: 'black',
    });
  });

  it('stops LEEEEROOOY routes at unknown knowledge while Knight hop-windows reveal isolated frontier cells', () => {
    let world = createWorld([
      {
        id: 'victoria-queen',
        faction: 'victoria',
        kind: 'queen',
        position: { x: 4, y: 8 },
      },
      {
        id: 'v-knight',
        faction: 'victoria',
        kind: 'knight',
        position: { x: 5, y: 7 },
      },
    ]);

    world = refreshFactionIntelligence(world, 'victoria');

    const leeeeroooy = validateMoveKnowledge(
      world,
      'victoria',
      { x: 4, y: 8 },
      { x: 12, y: 8 },
      'queen',
    );

    expect(leeeeroooy).toEqual({
      legal: false,
      reason: 'unknown_destination',
    });

    const hopWindow = { x: 7, y: 8 } as const;
    expect(getTileMemory(world, 'victoria', hopWindow).visibility)
      .toBe('observed');

    expect(validateMoveKnowledge(
      world,
      'victoria',
      { x: 5, y: 7 },
      hopWindow,
      'knight',
    )).toEqual({ legal: true });
  });

  it('uses a Bastion as a watchtower beacon and loses that borrowed certainty when the Bastion falls', () => {
    const bastionCell = { x: 9, y: 9 } as const;
    const watchedCell = { x: 12, y: 9 } as const;
    let world = createWorld();

    const tiles = {
      ...strategicTiles(world),
    };
    tiles[tileId(bastionCell)] = {
      ...tiles[tileId(bastionCell)]!,
      factionControl: 'victoria',
    };
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles,
      } as typeof world.territory,
    };

    const built = buildFortification(world, {
      id: 'royal-watch-bastion',
      faction: 'victoria',
      kind: 'bastion',
      cell: bastionCell,
    });
    expect(built.accepted).toBe(true);
    world = built.state;

    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', watchedCell).visibility)
      .toBe('observed');

    world = damageFortification(world, 'royal-watch-bastion', 3);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(getTileMemory(world, 'victoria', watchedCell).visibility)
      .toBe('remembered');
  });

  it('keeps Shadow AI blind to Victoria units outside Shadow intelligence', () => {
    let world = createWorld([
      {
        id: 'shadow-rook',
        faction: 'obsidian',
        kind: 'rook',
        position: { x: 7, y: 7 },
      },
      {
        id: 'victoria-queen',
        faction: 'victoria',
        kind: 'queen',
        position: { x: 7, y: 12 },
      },
    ]);

    world = refreshFactionIntelligence(world, 'obsidian');

    expect(
      getTileMemory(world, 'obsidian', { x: 7, y: 12 }).visibility,
    ).not.toBe('observed');

    expect(
      selectPriorityTarget(world, 'obsidian', 'shadow-rook'),
    ).toBeNull();
  });
});
