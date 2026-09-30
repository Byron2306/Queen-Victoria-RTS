import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { enqueueTacticalOrder } from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { getBannerState } from '../../src/sim/polarity';

function deployBanner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderId: 'banner-order-1',
    kind: 'deploy_banner',
    faction: 'victoria',
    bannerId: 'banner-v-1',
    cell: { x: 8, y: 11 },
    issuedRound: 1,
    commandCost: 1,
    ...overrides,
  } as any;
}

describe('Triptych banner Royal Commands', () => {
  it('queues and resolves DEPLOY_BANNER as a first-class tactical order', () => {
    const world = createWorld();
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
      cell: { x: 8, y: 11 },
      roundsHeld: 0,
      mature: false,
    });
  });

  it('refuses an off-board DEPLOY_BANNER without mutating banner state', () => {
    const world = createWorld();
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
});
