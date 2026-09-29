import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { resolveSettlement } from '../../src/sim/territory';
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
});
