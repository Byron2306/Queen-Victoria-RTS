import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  canFactionClaimTile,
  claimFactionTile,
  getTileFactionControl,
  strategicTiles,
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

  it('claims exactly one adjacent neutral tile while preserving polarity and unrelated strategic state', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 8, y: 14 };
    const beforeTiles = strategicTiles(world);
    const beforePolarity = beforeTiles['8,14']!.polarity;
    const beforeNodes = world.territory.nodes;

    const result = claimFactionTile(world, 'victoria', cell, 'annex_command');

    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(getTileFactionControl(result.state, cell)).toBe('victoria');
    expect(strategicTiles(result.state)['8,14']!.polarity).toBe(beforePolarity);
    expect(result.state.territory.nodes).toEqual(beforeNodes);
    expect(getTileFactionControl(result.state, { x: 9, y: 14 })).toBe(
      getTileFactionControl(world, { x: 9, y: 14 }),
    );
  });

  it('returns the original world unchanged with a stable reason when a claim is rejected', () => {
    const world = createPhase6SkirmishWorld();
    const cell = { x: 10, y: 14 };

    const result = claimFactionTile(world, 'victoria', cell, 'annex_command');

    expect(result).toEqual({
      state: world,
      accepted: false,
      reason: 'not_adjacent_to_friendly_territory',
    });
    expect(result.state).toBe(world);
    expect(getTileFactionControl(result.state, cell)).toBe('neutral');
  });
});
