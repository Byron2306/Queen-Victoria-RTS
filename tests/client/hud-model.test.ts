import { describe, expect, it } from 'vitest';
import { createHudModel } from '../../src/client/hud/model';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

describe('Phase 6 HUD model', () => {
  it('projects Victoria economy and match state', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      null,
    );

    expect(hud.tick).toBe(0);
    expect(hud.matchStatus).toBe('active');
    expect(hud.crownPower).toBe(
      world.economy.crownPower.victoria,
    );
    expect(hud.productionQueue).toEqual(
      world.production.queues.victoria,
    );
  });

  it('projects Victoria hero state', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      'victoria-queen',
    );

    expect(hud.hero).toMatchObject({
      unitId: 'victoria-queen',
      status: 'alive',
      level: 1,
      xp: 0,
      activeAbility: null,
      respawnTicksRemaining: 0,
    });

    expect(hud.hero.abilities.royal_decree)
      .toEqual(
        world.heroes.victoria.abilities.royal_decree,
      );
  });

  it('projects sovereign threat state for both factions', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      null,
    );

    expect(hud.sovereigns.victoria).toEqual(
      world.match.sovereigns.victoria,
    );

    expect(hud.sovereigns.obsidian).toEqual(
      world.match.sovereigns.obsidian,
    );
  });

  it('projects the selected unit and combat state', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      'victoria-rook-a',
    );

    expect(hud.selectedUnit).toMatchObject({
      id: 'victoria-rook-a',
      faction: 'victoria',
      kind: 'rook',
      position: { x: 5, y: 14 },
    });

    expect(hud.selectedCombat).toEqual(
      world.combat['victoria-rook-a'],
    );
  });

  it('returns null selection when nothing is selected', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      null,
    );

    expect(hud.selectedUnit).toBeNull();
    expect(hud.selectedCombat).toBeNull();
  });

  it('returns null selection when the selected unit is stale', () => {
    const world = createPhase6SkirmishWorld();

    const hud = createHudModel(
      world,
      'missing-unit',
    );

    expect(hud.selectedUnit).toBeNull();
    expect(hud.selectedCombat).toBeNull();
  });
});
