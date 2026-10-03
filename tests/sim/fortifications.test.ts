import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { resolveSettlement, strategicTiles } from '../../src/sim/territory';
import { validateMoveGeometry } from '../../src/sim/geometry';
import {
  buildFortification,
  canBuildFortification,
  damageFortification,
  getFortificationAt,
} from '../../src/sim/fortifications';

describe('Triptych fortifications', () => {
  it('builds only on friendly faction territory with durability 3', () => {
    const cell = { x: 7, y: 10 } as const;
    let world = createWorld([
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: cell },
    ]);
    world = resolveSettlement(world);

    expect(canBuildFortification(world, 'victoria', cell)).toEqual({ allowed: true });
    expect(canBuildFortification(world, 'obsidian', cell)).toEqual({
      allowed: false,
      reason: 'not_friendly_territory',
    });

    const result = buildFortification(world, {
      id: 'fort-v-1',
      faction: 'victoria',
      cell,
    });

    expect(result.accepted).toBe(true);
    expect(getFortificationAt(result.state, cell)).toMatchObject({
      id: 'fort-v-1',
      faction: 'victoria',
      durability: 3,
    });
  });

  it('survives two hits and disappears on the third', () => {
    const cell = { x: 7, y: 10 } as const;
    let world = createWorld([
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: cell },
    ]);
    world = resolveSettlement(world);
    world = buildFortification(world, {
      id: 'fort-v-1',
      faction: 'victoria',
      cell,
    }).state;

    world = damageFortification(world, 'fort-v-1', 1);
    expect(getFortificationAt(world, cell)?.durability).toBe(2);
    world = damageFortification(world, 'fort-v-1', 1);
    expect(getFortificationAt(world, cell)?.durability).toBe(1);
    world = damageFortification(world, 'fort-v-1', 1);
    expect(getFortificationAt(world, cell)).toBeNull();
  });

  it('blocks both ray traversal and direct landing while it survives', () => {
    const fortCell = { x: 7, y: 10 } as const;
    let world = createWorld([
      { id: 'builder', faction: 'victoria', kind: 'pawn', position: fortCell },
    ]);
    world = resolveSettlement(world);
    world = buildFortification(world, {
      id: 'fort-v-1',
      faction: 'victoria',
      cell: fortCell,
    }).state;

    const rook = { id: 'rook', faction: 'obsidian', kind: 'rook', position: { x: 7, y: 8 } } as const;
    const knight = { id: 'knight', faction: 'obsidian', kind: 'knight', position: { x: 6, y: 8 } } as const;
    world = {
      ...world,
      units: { rook, knight },
      occupancy: {
        '7,8': 'rook',
        '6,8': 'knight',
      },
    };

    expect(validateMoveGeometry(world, rook, { x: 7, y: 12 })).toEqual({
      legal: false,
      reason: 'blocked',
    });
    expect(validateMoveGeometry(world, knight, fortCell)).toEqual({
      legal: false,
      reason: 'blocked',
    });
  });

  it('uses the selected V2 topology when deciding whether a fortification cell is on-board', () => {
    const frontier = { x: 27, y: 18 } as const;
    let world = createWorld([], { topologyId: 'triptych-v2' });
    const tiles = strategicTiles(world);
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles: {
          ...tiles,
          '27,18': {
            ...tiles['27,18']!,
            factionControl: 'victoria',
          },
        },
      } as typeof world.territory,
    };

    expect(canBuildFortification(world, 'victoria', frontier)).toEqual({ allowed: true });
    expect(canBuildFortification(world, 'victoria', { x: 11, y: 10 })).toEqual({
      allowed: false,
      reason: 'off_board',
    });
  });
});
