import { describe, expect, it } from 'vitest';

import { createWorld, stepWorld } from '../../src/sim';
import type { ReadyDeployment, WorldState } from '../../src/sim';

function enabledWorld(): WorldState {
  return createWorld([
    { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
    { id: 'opawn', faction: 'obsidian', kind: 'pawn', position: { x: 10, y: 10 } },
    { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 1, y: 1 } },
  ], { aiFactions: ['obsidian'] });
}

describe('fixed-tick AI strategic authority', () => {
  it('does not create AI commitments or pending strategic commands', () => {
    const world = enabledWorld();

    expect(world.ai.obsidian.commitments).toEqual([]);
    expect(world.ai.obsidian.pendingCommands).toEqual([]);

    const result = stepWorld(world, []);

    expect(result.state.ai.obsidian.commitments).toEqual([]);
    expect(result.state.ai.obsidian.pendingCommands).toEqual([]);
    expect(result.events.some(event => event.type === 'ai.evaluated')).toBe(false);
    expect(result.events.some(event => event.type === 'ai.command.scheduled')).toBe(false);
  });

  it('does not consume a legacy pending recruitment command on a fixed tick', () => {
    let world = enabledWorld();
    world = {
      ...world,
      economy: {
        crownPower: {
          ...world.economy.crownPower,
          obsidian: 20,
        },
      },
      ai: {
        ...world.ai,
        obsidian: {
          ...world.ai.obsidian,
          pendingCommands: [{
            executeTick: world.tick,
            command: {
              type: 'recruit',
              sequence: 1,
              issuedTick: world.tick,
              faction: 'obsidian',
              unitKind: 'pawn',
            },
          }],
        },
      },
    };

    const result = stepWorld(world, []);

    expect(result.state.economy.crownPower.obsidian).toBe(20);
    expect(result.state.production.queues.obsidian).toEqual([]);
    expect(result.state.ai.obsidian.pendingCommands).toEqual(
      world.ai.obsidian.pendingCommands,
    );
    expect(result.events.some(event => event.type === 'production.queued')).toBe(false);
    expect(result.events.some(event => event.type === 'crown.spent')).toBe(false);
  });

  it('does not consume a legacy pending READY deployment on a fixed tick', () => {
    const ready: ReadyDeployment = {
      id: 'obsidian-recruit-1',
      faction: 'obsidian',
      unitKind: 'pawn',
      cost: 10,
      capacityWeight: 1,
      queuedTick: 0,
      readyRound: 1,
    };

    let world = enabledWorld();
    world = {
      ...world,
      turn: {
        ...world.turn,
        phase: 'shadow_command',
      },
      production: {
        ...world.production,
        ready: {
          ...world.production.ready,
          obsidian: [ready],
        },
      },
      ai: {
        ...world.ai,
        obsidian: {
          ...world.ai.obsidian,
          pendingCommands: [{
            executeTick: world.tick,
            command: {
              type: 'deploy_ready',
              sequence: 1,
              issuedTick: world.tick,
              faction: 'obsidian',
              readyId: ready.id,
              to: { x: 28, y: 15 },
            },
          }],
        },
      },
    };

    const result = stepWorld(world, []);

    expect(result.state.production.ready.obsidian).toEqual([ready]);
    expect(result.state.units['unit:obsidian-recruit-1']).toBeUndefined();
    expect(result.state.ai.obsidian.pendingCommands).toEqual(
      world.ai.obsidian.pendingCommands,
    );
    expect(
      result.events.some(event => event.type === 'reinforcement.deployed'),
    ).toBe(false);
  });

  it('repeated fixed ticks cannot autonomously create strategic AI state', () => {
    let world = enabledWorld();
    world = {
      ...world,
      economy: {
        crownPower: {
          ...world.economy.crownPower,
          obsidian: 100,
        },
      },
    };

    const baseline = {
      crown: world.economy.crownPower.obsidian,
      queue: world.production.queues.obsidian,
      ready: world.production.ready.obsidian,
      promotions: world.promotions.pending,
      commitments: world.ai.obsidian.commitments,
      pendingCommands: world.ai.obsidian.pendingCommands,
    };

    for (let index = 0; index < 20; index += 1) {
      world = stepWorld(world, []).state;
    }

    expect(world.economy.crownPower.obsidian).toBe(baseline.crown);
    expect(world.production.queues.obsidian).toEqual(baseline.queue);
    expect(world.production.ready.obsidian).toEqual(baseline.ready);
    expect(world.promotions.pending).toEqual(baseline.promotions);
    expect(world.ai.obsidian.commitments).toEqual(baseline.commitments);
    expect(world.ai.obsidian.pendingCommands).toEqual(baseline.pendingCommands);
  });
});
