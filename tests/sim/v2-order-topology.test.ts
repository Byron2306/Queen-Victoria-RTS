import { expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

it('resolves movement beyond legacy bounds on a legal V2 ray', () => {
  const world = createWorld([
    { id: 'rook', faction: 'victoria', kind: 'rook', position: { x: 27, y: 18 } },
  ], { topologyId: 'triptych-v2' });
  const result = resolveCommittedOrders(world, [{
    orderId: 'frontier-move', kind: 'move', faction: 'victoria',
    unitId: 'rook', destination: { x: 28, y: 18 }, issuedRound: 1, commandCost: 1,
  }]);
  expect(result.outcomes[0]?.status).toBe('RESOLVED');
  expect(result.world.units.rook?.position).toEqual({ x: 28, y: 18 });
});

it('deploys banners on controlled V2 territory beyond legacy bounds', () => {
  const world = createPhase6SkirmishWorld();
  const result = resolveCommittedOrders(world, [{
    orderId: 'frontier-banner', kind: 'deploy_banner', faction: 'obsidian',
    bannerId: 'banner', cell: { x: 27, y: 18 }, issuedRound: 1, commandCost: 1,
  }]);
  expect(result.outcomes[0]?.status).toBe('RESOLVED');
});
