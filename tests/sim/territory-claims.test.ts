import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  annexTile,
  canFactionClaimTile,
  claimFactionTile,
  getTileFactionControl,
  resolveSettlement,
  strategicTiles,
} from '../../src/sim/territory';
import { placeUnit } from '../../src/sim/world';

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

  it('gives annex and settlement the same adjacent neutral ownership result', () => {
    const base = createPhase6SkirmishWorld();
    const cell = { x: 8, y: 14 };

    const annexed = annexTile(base, 'victoria', cell);
    let settledWorld = placeUnit(base, {
      id: 'settler', faction: 'victoria', kind: 'pawn', position: cell,
    });
    settledWorld = resolveSettlement(settledWorld);

    expect(annexed.accepted).toBe(true);
    expect(getTileFactionControl(annexed.state, cell)).toBe('victoria');
    expect(getTileFactionControl(settledWorld, cell)).toBe('victoria');
  });

  it('keeps a remote neutral raider in place without granting ownership', () => {
    const cell = { x: 10, y: 14 };
    let world = createPhase6SkirmishWorld();
    world = placeUnit(world, {
      id: 'remote-raider', faction: 'victoria', kind: 'knight', position: cell,
    });

    const settled = resolveSettlement(world);

    expect(settled.units['remote-raider']!.position).toEqual(cell);
    expect(getTileFactionControl(settled, cell)).toBe('neutral');
  });

  it('does not flip enemy territory merely because an enemy unit occupies it', () => {
    const cell = { x: 24, y: 14 };
    let world = createPhase6SkirmishWorld();
    world = placeUnit(world, {
      id: 'occupier', faction: 'victoria', kind: 'knight', position: cell,
    });

    const settled = resolveSettlement(world);

    expect(settled.units.occupier!.position).toEqual(cell);
    expect(getTileFactionControl(settled, cell)).toBe('obsidian');
  });

  it('ignores dead units during settlement claims', () => {
    const cell = { x: 8, y: 14 };
    let world = createPhase6SkirmishWorld();
    world = placeUnit(world, {
      id: 'dead-settler', faction: 'victoria', kind: 'pawn', position: cell,
    });
    world = {
      ...world,
      combat: {
        ...world.combat,
        'dead-settler': { ...world.combat['dead-settler']!, health: 0 },
      },
    };

    const settled = resolveSettlement(world);

    expect(getTileFactionControl(settled, cell)).toBe('neutral');
  });

  it('processes settlement claims in unit-id order regardless of insertion order', () => {
    let world = createPhase6SkirmishWorld();
    world = placeUnit(world, {
      id: 'b-next', faction: 'victoria', kind: 'pawn', position: { x: 9, y: 14 },
    });
    world = placeUnit(world, {
      id: 'a-frontier', faction: 'victoria', kind: 'pawn', position: { x: 8, y: 14 },
    });

    const settled = resolveSettlement(world);

    expect(getTileFactionControl(settled, { x: 8, y: 14 })).toBe('victoria');
    expect(getTileFactionControl(settled, { x: 9, y: 14 })).toBe('victoria');
  });
});
