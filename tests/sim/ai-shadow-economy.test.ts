import { describe, expect, it } from 'vitest';

import {
  createWorld,
  executeShadowStrategicEconomy,
  stepWorld,
} from '../../src/sim';
import type { WorldState } from '../../src/sim';

function withPhase(
  world: WorldState,
  phase: WorldState['turn']['phase'],
): WorldState {
  return {
    ...world,
    turn: {
      ...world.turn,
      phase,
    },
  };
}

function recruitmentWorld(): WorldState {
  let world = createWorld([
    {
      id: 'opawn',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 10, y: 10 },
    },
  ], { aiFactions: ['obsidian'] });

  world = {
    ...world,
    economy: {
      crownPower: {
        ...world.economy.crownPower,
        obsidian: 20,
      },
    },
  };

  return withPhase(world, 'shadow_command');
}

function promotionWorld(): WorldState {
  let world = createWorld([
    {
      id: 'opawn',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 10, y: 14 },
    },
    {
      id: 'opawn-2',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 11, y: 10 },
    },
    {
      id: 'opawn-3',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 12, y: 10 },
    },
    {
      id: 'opawn-4',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 13, y: 10 },
    },
    {
      id: 'opawn-5',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 14, y: 10 },
    },
    {
      id: 'opawn-6',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 15, y: 10 },
    },
  ], { aiFactions: ['obsidian'] });

  const nodeIds = Object.keys(world.territory.nodes).sort().slice(0, 2);
  const nodes = { ...world.territory.nodes };
  for (const id of nodeIds) {
    nodes[id] = {
      ...nodes[id]!,
      owner: 'obsidian',
    };
  }

  world = {
    ...world,
    territory: {
      ...world.territory,
      nodes,
    },
    economy: {
      crownPower: {
        ...world.economy.crownPower,
        obsidian: 14,
      },
    },
  };

  return withPhase(world, 'shadow_command');
}

describe('Shadow AI strategic economy authority', () => {
  it('queues deterministic recruitment only during shadow_command', () => {
    const world = recruitmentWorld();

    const result = executeShadowStrategicEconomy(world);

    expect(result.state.production.queues.obsidian).toHaveLength(1);
    expect(result.state.production.queues.obsidian[0]).toMatchObject({
      faction: 'obsidian',
      unitKind: 'pawn',
      cost: 10,
    });
    expect(result.state.economy.crownPower.obsidian).toBe(10);
    expect(result.events.some(event => event.type === 'production.queued')).toBe(true);
    expect(result.events.some(event =>
      event.type === 'crown.spent' &&
      event.reason === 'recruitment'
    )).toBe(true);
  });

  it('queues a promotion request during shadow_command without spending Crown yet', () => {
    const world = promotionWorld();

    const result = executeShadowStrategicEconomy(world);

    expect(result.state.promotions.pending).toHaveLength(1);
    expect(result.state.promotions.pending[0]).toMatchObject({
      faction: 'obsidian',
      pawnId: 'opawn',
      targetKind: 'knight',
    });
    expect(result.state.economy.crownPower.obsidian).toBe(14);
    expect(result.events.some(event => event.type === 'promotion.requested')).toBe(true);
    expect(result.events.some(event =>
      event.type === 'crown.spent' &&
      event.reason === 'promotion'
    )).toBe(false);
  });

  it.each([
    'victoria_command',
    'victoria_resolve',
    'shadow_resolve',
    'reinforcement',
  ] as const)('is inert during %s', phase => {
    const world = withPhase(recruitmentWorld(), phase);

    const result = executeShadowStrategicEconomy(world);

    expect(result.state).toEqual(world);
    expect(result.events).toEqual([]);
  });

  it('fixed ticks cannot create Shadow economy actions', () => {
    const world = withPhase(recruitmentWorld(), 'shadow_command');

    const result = stepWorld(world, []);

    expect(result.state.production.queues.obsidian).toEqual([]);
    expect(result.state.promotions.pending).toEqual([]);
    expect(result.state.economy.crownPower.obsidian).toBe(20);
  });

  it('is deterministic for identical Shadow economy truth', () => {
    const a = executeShadowStrategicEconomy(recruitmentWorld());
    const b = executeShadowStrategicEconomy(recruitmentWorld());

    expect(a).toEqual(b);
  });
});
