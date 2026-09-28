import { describe, expect, it } from 'vitest';
import { canonicalSnapshot, createWorld, runReplay } from '../../src/sim';
import type { WorldState } from '../../src/sim';

function reorder(world: WorldState): WorldState {
  return {
    ...world,
    units: Object.fromEntries(Object.entries(world.units).reverse()),
    combat: Object.fromEntries(Object.entries(world.combat).reverse()),
    occupancy: Object.fromEntries(Object.entries(world.occupancy).reverse()),
    territory: { nodes: Object.fromEntries(Object.entries(world.territory.nodes).reverse()) },
  };
}

describe('Phase 5 replay custody', () => {
  it('canonicalizes complete hero and AI state independent of object insertion order', () => {
    let world = createWorld([
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } },
      { id: 'vhero', faction: 'victoria', kind: 'queen', position: { x: 3, y: 3 } },
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
      { id: 'opawn', faction: 'obsidian', kind: 'pawn', position: { x: 10, y: 10 } },
    ], { heroIds: { victoria: 'vhero' }, aiFactions: ['obsidian'] });
    world = {
      ...world,
      heroes: { ...world.heroes, victoria: { ...world.heroes.victoria, level: 5, xp: 120 } },
      ai: { ...world.ai, obsidian: { ...world.ai.obsidian, nextCommandOrdinal: 7 } },
    };
    const frames = [
      [{ type: 'hero_ability' as const, sequence: 1, issuedTick: 0, faction: 'victoria' as const, heroId: 'vhero', ability: 'royal_decree' as const }],
      [], [],
    ];
    const a = runReplay(world, frames);
    const b = runReplay(reorder(world), frames);
    expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b));
    expect(a.eventsByTick).toEqual(b.eventsByTick);
    const parsed = JSON.parse(canonicalSnapshot(a));
    expect(parsed.state.heroes.victoria.abilities.royal_decree.cooldownTicksRemaining).toBeGreaterThan(0);
    expect(parsed.state.ai.obsidian).toHaveProperty('commitments');
    expect(parsed.state.ai.obsidian).toHaveProperty('pendingCommands');
    expect(parsed.state.ai.obsidian).toHaveProperty('nextCommandOrdinal');
  });

  it('keeps simultaneous hero outcomes and delayed AI execution replay-identical', () => {
    let world = createWorld([
      { id: 'vhero', faction: 'victoria', kind: 'queen', position: { x: 5, y: 5 } },
      { id: 'ohero', faction: 'obsidian', kind: 'queen', position: { x: 6, y: 5 } },
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } },
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
    ], { heroIds: { victoria: 'vhero', obsidian: 'ohero' }, aiFactions: ['obsidian'] });
    world = {
      ...world,
      combat: {
        ...world.combat,
        vhero: { ...world.combat.vhero!, health: 16, targetId: 'ohero', cooldownTicks: 0 },
        ohero: { ...world.combat.ohero!, health: 16, targetId: 'vhero', cooldownTicks: 0 },
      },
    };
    const a = runReplay(world, [[], [], []]);
    const b = runReplay(reorder(world), [[], [], []]);
    expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b));
    expect(a.eventsByTick).toEqual(b.eventsByTick);
  });
});
