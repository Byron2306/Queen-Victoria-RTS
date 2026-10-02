import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { enqueueTacticalOrder } from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { getTileFactionControl } from '../../src/sim/territory';

function annexTile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'annex-1',
    kind: 'annex_tile',
    faction: 'victoria',
    cell: { x: 8, y: 14 },
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

describe('Triptych ANNEX_TILE Royal Command', () => {
  it('annexes one neutral orthogonally adjacent frontier tile', () => {
    const world = createPhase6SkirmishWorld();
    expect(getTileFactionControl(world, { x: 8, y: 14 })).toBe('neutral');

    const queued = enqueueTacticalOrder(world, annexTile());
    expect(queued.status).toBe('ACCEPTED');
    if (queued.status !== 'ACCEPTED') return;

    const resolved = resolveCommittedOrders(queued.world, queued.world.pendingOrders);
    expect(resolved.outcomes).toEqual([
      { orderId: 'annex-1', status: 'RESOLVED' },
    ]);
    expect(getTileFactionControl(resolved.world, { x: 8, y: 14 }))
      .toBe('victoria');
  });

  it('refuses annexing a disconnected neutral tile', () => {
    const world = createPhase6SkirmishWorld();
    const resolved = resolveCommittedOrders(world, [
      annexTile({ cell: { x: 10, y: 14 } }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'annex-1',
        status: 'REFUSED',
        reason: 'not_adjacent_to_friendly_territory',
      },
    ]);
    expect(getTileFactionControl(resolved.world, { x: 10, y: 14 }))
      .toBe('neutral');
  });

  it('refuses annexing an enemy-controlled tile', () => {
    const world = createPhase6SkirmishWorld();
    const resolved = resolveCommittedOrders(world, [
      annexTile({ cell: { x: 24, y: 14 } }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'annex-1',
        status: 'REFUSED',
        reason: 'enemy_controlled',
      },
    ]);
    expect(getTileFactionControl(resolved.world, { x: 24, y: 14 }))
      .toBe('obsidian');
  });
});
