import { describe, expect, it } from 'vitest';
import { createWorld, placeUnit } from '../../src/sim/world';
import {
  getTileFactionControl,
  resolveSettlement,
} from '../../src/sim/territory';
import { getTilePolarity } from '../../src/sim/polarity';

describe('Triptych faction settlement', () => {
  it('annexes only the tile occupied at strategic round resolution', () => {
    let world = createWorld();
    world = placeUnit(world, {
      id: 'victoria-pawn',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 7, y: 10 },
    });

    const beforePolarity = getTilePolarity(world, { x: 7, y: 10 });
    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 7, y: 10 })).toBe('victoria');
    expect(getTileFactionControl(world, { x: 7, y: 9 })).toBe('neutral');
    expect(getTilePolarity(world, { x: 7, y: 10 })).toBe(beforePolarity);
  });

  it('allows enemy settlement to annex a previously controlled tile without changing polarity', () => {
    let world = createWorld([
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: { x: 7, y: 10 } },
    ]);
    world = resolveSettlement(world);
    const polarity = getTilePolarity(world, { x: 7, y: 10 });

    world = {
      ...world,
      units: {
        'obsidian-pawn': { id: 'obsidian-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
      },
      occupancy: { '7,10': 'obsidian-pawn' },
      combat: {
        'obsidian-pawn': world.combat['victoria-pawn']!,
      },
    };
    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 7, y: 10 })).toBe('obsidian');
    expect(getTilePolarity(world, { x: 7, y: 10 })).toBe(polarity);
  });

  it('settles territory on the far edge of an explicit 32x32 Triptych V2 world', () => {
    let world = createWorld(
      [
        {
          id: 'victoria-rook',
          faction: 'victoria',
          kind: 'rook',
          position: { x: 31, y: 11 },
        },
      ],
      { topologyId: 'triptych-v2' },
    );

    expect(getTileFactionControl(world, { x: 31, y: 11 })).toBe('neutral');

    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 31, y: 11 })).toBe('victoria');
  });
});
