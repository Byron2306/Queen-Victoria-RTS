import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  canFactionClaimTile,
  getTileFactionControl,
} from '../../src/sim/territory';

describe('canonical faction claim authority', () => {
  it('allows an adjacent neutral frontier claim', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 8, y: 14 };

    expect(getTileFactionControl(world, cell)).toBe('neutral');
    expect(canFactionClaimTile(world, 'victoria', cell, 'annex_command'))
      .toEqual({ allowed: true });
  });

  it('rejects a tile already controlled by the requesting faction', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 7, y: 14 };

    expect(getTileFactionControl(world, cell)).toBe('victoria');
    expect(canFactionClaimTile(world, 'victoria', cell, 'annex_command'))
      .toEqual({ allowed: false, reason: 'already_controlled' });
  });

  it('rejects enemy-controlled territory', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 24, y: 14 };

    expect(getTileFactionControl(world, cell)).toBe('obsidian');
    expect(canFactionClaimTile(world, 'victoria', cell, 'annex_command'))
      .toEqual({ allowed: false, reason: 'enemy_controlled' });
  });

  it('rejects disconnected neutral territory', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 10, y: 14 };

    expect(getTileFactionControl(world, cell)).toBe('neutral');
    expect(canFactionClaimTile(world, 'victoria', cell, 'annex_command'))
      .toEqual({ allowed: false, reason: 'not_adjacent_to_friendly_territory' });
  });

  it('rejects a V2 rectangular void as off board', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 2, y: 2 };

    expect(canFactionClaimTile(world, 'victoria', cell, 'annex_command'))
      .toEqual({ allowed: false, reason: 'off_board' });
  });
});
