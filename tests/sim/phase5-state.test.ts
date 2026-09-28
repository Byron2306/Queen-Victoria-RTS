import { describe, expect, it } from 'vitest';
import { compareSimCommands, createWorld } from '../../src/sim';

const victoriaHero = { id: 'v-hero', faction: 'victoria' as const, kind: 'queen' as const, position: { x: 2, y: 2 } };
const obsidianHero = { id: 'o-hero', faction: 'obsidian' as const, kind: 'queen' as const, position: { x: 13, y: 13 } };

describe('Phase 5 initial state', () => {
  it('keeps heroes unbound and AI disabled by default', () => {
    const world = createWorld([victoriaHero, obsidianHero]);
    expect(world.heroes.victoria.status).toBe('unbound');
    expect(world.heroes.obsidian.status).toBe('unbound');
    expect(world.heroes.victoria.heroUnitId).toBeNull();
    expect(world.ai.victoria.enabled).toBe(false);
    expect(world.ai.obsidian.enabled).toBe(false);
  });

  it('binds only explicit same-faction queens and enables requested AI factions', () => {
    const world = createWorld([victoriaHero, obsidianHero], {
      heroIds: { victoria: 'v-hero', obsidian: 'missing' },
      aiFactions: ['obsidian'],
    });
    expect(world.heroes.victoria).toMatchObject({ heroUnitId: 'v-hero', status: 'alive', level: 1, xp: 0, respawnTicksRemaining: 0, activeAbility: null });
    expect(world.heroes.obsidian.status).toBe('unbound');
    expect(world.heroes.victoria.abilities.royal_decree.cooldownTicksRemaining).toBe(0);
    expect(world.ai.obsidian).toMatchObject({ enabled: true, profile: 'balanced', commitments: [], pendingCommands: [], nextCommandOrdinal: 1 });
    expect(world.ai.victoria.enabled).toBe(false);
  });

  it('does not bind an explicit non-queen or wrong-faction unit', () => {
    const world = createWorld([
      { id: 'v-pawn', faction: 'victoria', kind: 'pawn', position: { x: 1, y: 2 } },
      obsidianHero,
    ], { heroIds: { victoria: 'v-pawn', obsidian: 'v-pawn' } });
    expect(world.heroes.victoria.status).toBe('unbound');
    expect(world.heroes.obsidian.status).toBe('unbound');
  });

  it('orders hero ability commands deterministically by sequence and hero id', () => {
    const a = { type: 'hero_ability' as const, sequence: 4, issuedTick: 0, faction: 'victoria' as const, heroId: 'b', ability: 'royal_decree' as const };
    const b = { ...a, heroId: 'a' };
    expect([a, b].sort(compareSimCommands).map((command) => command.heroId)).toEqual(['a', 'b']);
  });
});
