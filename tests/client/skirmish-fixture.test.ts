import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

describe('Phase 6 skirmish fixture', () => {
  it('creates the authoritative 16x16 battlefield', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.width).toBe(16);
    expect(world.height).toBe(16);
    expect(world.tick).toBe(0);
    expect(world.match.status).toBe('active');
  });

  it('binds Victoria as the player hero', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.heroes.victoria).toMatchObject({
      heroUnitId: 'victoria-queen',
      status: 'alive',
      level: 1,
      xp: 0,
    });

    expect(world.units['victoria-queen']).toMatchObject({
      faction: 'victoria',
      kind: 'queen',
      position: { x: 3, y: 13 },
    });
  });

  it('enables only the balanced Obsidian AI', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.ai.victoria.enabled).toBe(false);

    expect(world.ai.obsidian).toMatchObject({
      enabled: true,
      profile: 'balanced',
      commitments: [],
      pendingCommands: [],
    });
  });

  it('places both sovereign kings', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.match.sovereigns.victoria.kingId)
      .toBe('victoria-king');

    expect(world.match.sovereigns.obsidian.kingId)
      .toBe('obsidian-king');

    expect(world.units['victoria-king']?.position)
      .toEqual({ x: 7, y: 15 });

    expect(world.units['obsidian-king']?.position)
      .toEqual({ x: 7, y: 0 });
  });

  it('loads eight capture nodes while preserving the proven major-objective anchors', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(world.territory.nodes.crown?.center)
      .toEqual({ x: 1, y: 7 });
    expect(world.territory.nodes['crown-south']?.center)
      .toEqual({ x: 14, y: 8 });
    expect(
      Object.values(world.territory.nodes)
        .filter(node => node.kind === 'crown'),
    ).toHaveLength(2);
  });

  it('is deterministic across repeated construction', () => {
    expect(createPhase6SkirmishWorld())
      .toEqual(createPhase6SkirmishWorld());
  });
});
