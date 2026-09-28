import { describe, expect, it } from 'vitest';
import { canonicalSnapshot, createWorld, evaluateBalancedAI, runReplay, stepWorld } from '../../src/sim';
import type { ScheduledAICommand, StrategicCommitment, WorldState } from '../../src/sim';

function reverseRecords(world: WorldState): WorldState {
  return {
    ...world,
    units: Object.fromEntries(Object.entries(world.units).reverse()),
    combat: Object.fromEntries(Object.entries(world.combat).reverse()),
    occupancy: Object.fromEntries(Object.entries(world.occupancy).reverse()),
    territory: { nodes: Object.fromEntries(Object.entries(world.territory.nodes).reverse()) },
  };
}

describe('Phase 5 determinism and fairness murder chamber', () => {
  it('reversed insertion order produces identical AI schedules and replay truth', () => {
    let world = createWorld([
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } },
      { id: 'vpawn', faction: 'victoria', kind: 'pawn', position: { x: 5, y: 5 } },
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
      { id: 'opawn', faction: 'obsidian', kind: 'pawn', position: { x: 10, y: 10 } },
    ], { aiFactions: ['obsidian'] });
    const a = runReplay(world, [[], []]);
    const b = runReplay(reverseRecords(world), [[], []]);
    expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b));
    expect(a.eventsByTick).toEqual(b.eventsByTick);
  });

  it('simultaneous hero defeats emit in fixed faction order regardless of insertion order', () => {
    let world = createWorld([
      { id: 'vhero', faction: 'victoria', kind: 'queen', position: { x: 5, y: 5 } },
      { id: 'ohero', faction: 'obsidian', kind: 'queen', position: { x: 6, y: 5 } },
    ], { heroIds: { victoria: 'vhero', obsidian: 'ohero' } });
    world = { ...world, combat: {
      ...world.combat,
      vhero: { ...world.combat.vhero!, health: 16, targetId: 'ohero', cooldownTicks: 0 },
      ohero: { ...world.combat.ohero!, health: 16, targetId: 'vhero', cooldownTicks: 0 },
    }};
    const a = stepWorld(world, []);
    const b = stepWorld(reverseRecords(world), []);
    const defeatA = a.events.filter(e => e.type === 'hero.defeated');
    const defeatB = b.events.filter(e => e.type === 'hero.defeated');
    expect(defeatA).toEqual(defeatB);
    expect(defeatA.map(e => e.type === 'hero.defeated' ? e.faction : null)).toEqual(['victoria', 'obsidian']);
  });

  it('due AI recruitment uses the same ordinary Crown validator as an external recruitment command', () => {
    const base = createWorld([
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
      { id: 'opawn', faction: 'obsidian', kind: 'pawn', position: { x: 10, y: 10 } },
    ], { aiFactions: ['obsidian'] });
    const command = { type: 'recruit' as const, sequence: 7, issuedTick: -1, faction: 'obsidian' as const, unitKind: 'pawn' as const };
    const pending: ScheduledAICommand = { executeTick: 0, command };
    const aiWorld = { ...base, ai: { ...base.ai, obsidian: { ...base.ai.obsidian, pendingCommands: [pending], nextEvaluationTick: 999 } } };
    const externalWorld = { ...base, ai: { ...base.ai, obsidian: { ...base.ai.obsidian, enabled: false, nextEvaluationTick: 999 } } };
    const a = stepWorld(aiWorld, []);
    const b = stepWorld(externalWorld, [command]);
    expect(a.state.economy.crownPower.obsidian).toBe(b.state.economy.crownPower.obsidian);
    expect(a.state.production.queues.obsidian).toEqual(b.state.production.queues.obsidian);
    expect(a.events.filter(e => e.type === 'production.rejected')).toEqual(b.events.filter(e => e.type === 'production.rejected'));
  });

  it('a pending AI command that becomes illegal is rejected by the ordinary validator', () => {
    let world = createWorld([
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
    ], { aiFactions: ['obsidian'] });
    const pending: ScheduledAICommand = { executeTick: 0, command: { type: 'recruit', sequence: 1, issuedTick: -1, faction: 'obsidian', unitKind: 'pawn' } };
    world = { ...world, economy: { crownPower: { ...world.economy.crownPower, obsidian: 0 } }, ai: { ...world.ai, obsidian: { ...world.ai.obsidian, pendingCommands: [pending], nextEvaluationTick: 999 } } };
    const result = stepWorld(world, []);
    expect(result.events.find(e => e.type === 'production.rejected')).toMatchObject({ faction: 'obsidian', reason: 'insufficient_crown' });
    expect(result.state.production.queues.obsidian).toHaveLength(0);
  });

  it('invalid commitments are retained between cadence ticks and re-evaluated only on cadence', () => {
    let world = createWorld([{ id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } }], { aiFactions: ['obsidian'] });
    const commitment: StrategicCommitment = { intention: 'pressure_position', objectiveId: 'gone', startedTick: 0, expiresTick: 30, score: 10 };
    world = { ...world, ai: { ...world.ai, obsidian: { ...world.ai.obsidian, commitments: [commitment], nextEvaluationTick: 10 } } };
    const early = evaluateBalancedAI(world, 'obsidian');
    expect(early.state.ai.obsidian.commitments).toEqual([commitment]);
    const cadence = evaluateBalancedAI({ ...world, tick: 10 }, 'obsidian');
    expect(cadence.events).toContainEqual(expect.objectContaining({ type: 'ai.commitment.ended', objectiveId: 'gone', reason: 'invalidated' }));
  });

  it('terminal worlds do not mutate AI or hero counters', () => {
    let world = createWorld([{ id: 'vhero', faction: 'victoria', kind: 'queen', position: { x: 4, y: 4 } }], { heroIds: { victoria: 'vhero' }, aiFactions: ['obsidian'] });
    world = { ...world, match: { ...world.match, status: 'victoria_won', victor: 'victoria', endedTick: 0 } };
    expect(stepWorld(world, []).state).toBe(world);
  });

  it('blocked ready-to-respawn state emits ready once and stays stable until a tile opens', () => {
    let world = createWorld([
      { id: 'vhero', faction: 'victoria', kind: 'queen', position: { x: 4, y: 4 } },
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } },
    ], { heroIds: { victoria: 'vhero' } });
    const nodeCenters = new Set(Object.values(world.territory.nodes).map(node => `${node.center.x},${node.center.y}`));
    const blockers = [] as Array<{id:string;faction:'victoria';kind:'pawn';position:{x:number;y:number}}>;
    let n = 0;
    for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
      if ((x === 1 && y === 1) || nodeCenters.has(`${x},${y}`)) continue;
      blockers.push({ id: `b${n++}`, faction: 'victoria', kind: 'pawn', position: { x, y } });
    }
    world = createWorld([{ id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } }, ...blockers], { heroIds: { victoria: 'vhero' } });
    world = { ...world, heroes: { ...world.heroes, victoria: { ...world.heroes.victoria, heroUnitId: 'vhero', status: 'respawning', respawnTicksRemaining: 0 } } };
    const first = stepWorld(world, []);
    const second = stepWorld(first.state, []);
    expect(first.events.filter(e => e.type === 'hero.respawn.ready')).toHaveLength(1);
    expect(second.events.filter(e => e.type === 'hero.respawn.ready')).toHaveLength(0);
    expect(second.state.heroes.victoria.status).toBe('ready_to_respawn');
  });
});
