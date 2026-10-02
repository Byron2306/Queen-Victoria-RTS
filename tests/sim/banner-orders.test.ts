import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { enqueueTacticalOrder } from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { getBannerState, queueBanner } from '../../src/sim/polarity';

function deployBanner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'banner-order-1',
    kind: 'deploy_banner',
    faction: 'victoria',
    bannerId: 'banner-v-1',
    cell: { x: 7, y: 14 },
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

function removeBanner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'banner-remove-1',
    kind: 'remove_banner',
    faction: 'victoria',
    bannerId: 'banner-v-1',
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

describe('Triptych banner Royal Commands', () => {
  it('queues and resolves DEPLOY_BANNER as a first-class tactical order', () => {
    const world = createPhase6SkirmishWorld();
    const queued = enqueueTacticalOrder(world, deployBanner());

    expect(queued.status).toBe('ACCEPTED');
    if (queued.status !== 'ACCEPTED') return;

    expect(queued.world.turn.royalCommandsRemaining.victoria)
      .toBe(world.turn.royalCommandsRemaining.victoria - 1);

    const resolved = resolveCommittedOrders(
      queued.world,
      queued.world.pendingOrders,
    );

    expect(resolved.outcomes).toEqual([
      { orderId: 'banner-order-1', status: 'RESOLVED' },
    ]);
    expect(getBannerState(resolved.world, 'banner-v-1')).toMatchObject({
      faction: 'victoria',
      cell: { x: 7, y: 14 },
      roundsHeld: 0,
      mature: false,
    });
  });

  it('refuses an off-board DEPLOY_BANNER without mutating banner state', () => {
    const world = createPhase6SkirmishWorld();
    const resolved = resolveCommittedOrders(world, [
      deployBanner({
        orderId: 'banner-order-off-board',
        bannerId: 'banner-v-off-board',
        cell: { x: 0, y: 0 },
      }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'banner-order-off-board',
        status: 'REFUSED',
        reason: 'illegal_banner_cell',
      },
    ]);
    expect(getBannerState(resolved.world, 'banner-v-off-board'))
      .toBeUndefined();
  });

  it('queues and resolves REMOVE_BANNER for the owning faction', () => {
    let world = createPhase6SkirmishWorld();
    world = queueBanner(world, {
      bannerId: 'banner-v-1',
      faction: 'victoria',
      cell: { x: 7, y: 14 },
    }).state;

    const queued = enqueueTacticalOrder(world, removeBanner());
    expect(queued.status).toBe('ACCEPTED');
    if (queued.status !== 'ACCEPTED') return;

    const resolved = resolveCommittedOrders(
      queued.world,
      queued.world.pendingOrders,
    );

    expect(resolved.outcomes).toEqual([
      { orderId: 'banner-remove-1', status: 'RESOLVED' },
    ]);
    expect(getBannerState(resolved.world, 'banner-v-1')).toBeUndefined();
  });

  it('refuses REMOVE_BANNER against an enemy banner', () => {
    let world = createPhase6SkirmishWorld();
    world = queueBanner(world, {
      bannerId: 'banner-shadow-1',
      faction: 'obsidian',
      cell: { x: 24, y: 14 },
    }).state;

    const resolved = resolveCommittedOrders(world, [
      removeBanner({ bannerId: 'banner-shadow-1' }),
    ]);

    expect(resolved.outcomes).toEqual([
      {
        orderId: 'banner-remove-1',
        status: 'REFUSED',
        reason: 'banner_not_owned',
      },
    ]);
    expect(getBannerState(resolved.world, 'banner-shadow-1')).toBeDefined();
  });
});
