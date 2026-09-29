import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

describe('Phase 6 skirmish fixture', () => {
  it('creates the authoritative 16x16 battlefield', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.board).toEqual({ width: 16, height: 16 });
  });

  it('binds Victoria as the player hero', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.heroes.victoria.heroUnitId).toBe('victoria-queen');
    expect(world.units['victoria-queen']?.kind).toBe('queen');
  });

  it('enables only the balanced Obsidian AI', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.ai.victoria.enabled).toBe(false);
    expect(world.ai.obsidian.enabled).toBe(true);
    expect(world.ai.obsidian.mode).toBe('balanced');
  });

  it('places both sovereign kings', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.units['victoria-king']?.position)
      .toEqual({ x: 7, y: 15 });

    expect(world.units['obsidian-king']?.position)
      .toEqual({ x: 7, y: 0 });
  });

  it('loads eight capture nodes with major objectives in the north/south sanctums', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(world.territory.nodes.crown?.center)
      .toEqual({ x: 7, y: 1 });
    expect(world.territory.nodes['crown-south']?.center)
      .toEqual({ x: 8, y: 14 });
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
