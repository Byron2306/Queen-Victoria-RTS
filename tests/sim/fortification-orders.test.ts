import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { damageFortification, fortificationsFor } from '../../src/sim/fortifications';
import { enqueueTacticalOrder } from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';

function buildFort(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'fort-build-1',
    kind: 'build_fortification',
    faction: 'victoria',
    fortificationId: 'victoria-forward-bastion',
    fortificationKind: 'bastion',
    cell: { x: 7, y: 11 },
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

function repairFort(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'fort-repair-1',
    kind: 'repair_fortification',
    faction: 'victoria',
    fortificationId: 'victoria-redoubt',
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

describe('Triptych fortification Royal Commands', () => {
  it('queues and resolves BUILD_FORTIFICATION on friendly controlled ground', () => {
    const world = createPhase6SkirmishWorld();
    const queued = enqueueTacticalOrder(world, buildFort());

    expect(queued.status).toBe('ACCEPTED');
    if (queued.status !== 'ACCEPTED') return;

    const resolved = resolveCommittedOrders(queued.world, queued.world.pendingOrders);
    expect(resolved.outcomes).toEqual([
      { orderId: 'fort-build-1', status: 'RESOLVED' },
    ]);
    expect(fortificationsFor(resolved.world)['victoria-forward-bastion'])
      .toMatchObject({
        faction: 'victoria',
        kind: 'bastion',
        cell: { x: 7, y: 11 },
        durability: 3,
      });
  });

  it('refuses BUILD_FORTIFICATION on neutral ground', () => {
    const world = createPhase6SkirmishWorld();
    const resolved = resolveCommittedOrders(world, [
      buildFort({ cell: { x: 10, y: 11 } }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'fort-build-1',
        status: 'REFUSED',
        reason: 'not_friendly_territory',
      },
    ]);
  });

  it('repairs an owned damaged fortification by one durability up to its cap', () => {
    let world = createPhase6SkirmishWorld();
    world = damageFortification(world, 'victoria-redoubt', 2);
    expect(fortificationsFor(world)['victoria-redoubt']?.durability).toBe(1);

    const queued = enqueueTacticalOrder(world, repairFort());
    expect(queued.status).toBe('ACCEPTED');
    if (queued.status !== 'ACCEPTED') return;

    const resolved = resolveCommittedOrders(queued.world, queued.world.pendingOrders);
    expect(resolved.outcomes).toEqual([
      { orderId: 'fort-repair-1', status: 'RESOLVED' },
    ]);
    expect(fortificationsFor(resolved.world)['victoria-redoubt']?.durability)
      .toBe(2);
  });

  it('refuses repair of an enemy fortification', () => {
    const world = createPhase6SkirmishWorld();
    const resolved = resolveCommittedOrders(world, [
      repairFort({ fortificationId: 'obsidian-redoubt' }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'fort-repair-1',
        status: 'REFUSED',
        reason: 'fortification_not_owned',
      },
    ]);
  });
});
