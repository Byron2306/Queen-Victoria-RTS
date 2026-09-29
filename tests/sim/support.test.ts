import { describe, expect, it } from 'vitest';
import {
  supportPressureForChain,
  validateSupportGraph,
} from '../../src/sim/support';
import type {
  AssaultOrder,
  ReinforceOrder,
  TacticalOrder,
} from '../../src/sim/orders';
import { createWorld } from '../../src/sim/world';

const root: AssaultOrder = {
  orderId: 'assault-root',
  kind: 'assault',
  faction: 'victoria',
  unitId: 'root-rook',
  targetUnitId: 'target',
  issuedRound: 1,
  commandCost: 1,
};

function reinforce(
  orderId: string,
  unitId: string,
  supportedUnitId: string,
): ReinforceOrder {
  return {
    orderId,
    kind: 'reinforce',
    faction: 'victoria',
    unitId,
    supportedUnitId,
    rootOrderId: root.orderId,
    issuedRound: 1,
    commandCost: 1,
  };
}

function supportWorld(withBlocker = false) {
  return createWorld([
    { id: 'root-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    { id: 'support-rook', faction: 'victoria', kind: 'rook', position: { x: 5, y: 7 } },
    { id: 'support-bishop', faction: 'victoria', kind: 'bishop', position: { x: 3, y: 5 } },
    { id: 'support-knight', faction: 'victoria', kind: 'knight', position: { x: 2, y: 3 } },
    ...(withBlocker
      ? [{ id: 'blocker', faction: 'victoria' as const, kind: 'pawn' as const, position: { x: 6, y: 7 } }]
      : []),
    { id: 'target', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 8 } },
  ]);
}

const chainOrders: readonly TacticalOrder[] = [
  root,
  reinforce('support-1', 'support-rook', 'root-rook'),
  reinforce('support-2', 'support-bishop', 'support-rook'),
  reinforce('support-3', 'support-knight', 'support-bishop'),
];

describe('chained battlefield reinforcement', () => {
  it('builds a legal multi-link chain with diminishing depth contribution', () => {
    const result = validateSupportGraph(supportWorld(), chainOrders);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.chains[root.orderId]?.links.map((link) => ({
      unitId: link.unitId,
      depth: link.depth,
      contributionBps: link.contributionBps,
    }))).toEqual([
      { unitId: 'support-rook', depth: 1, contributionBps: 10000 },
      { unitId: 'support-bishop', depth: 2, contributionBps: 7000 },
      { unitId: 'support-knight', depth: 3, contributionBps: 4500 },
    ]);
    expect(supportPressureForChain(supportWorld(), result.chains[root.orderId]!)).toBeGreaterThan(0);
  });

  it('rejects duplicate supporters and support cycles', () => {
    const duplicate = validateSupportGraph(supportWorld(), [
      root,
      reinforce('support-a', 'support-rook', 'root-rook'),
      reinforce('support-b', 'support-rook', 'root-rook'),
    ]);
    expect(duplicate).toMatchObject({ valid: false, reason: 'duplicate_supporter' });

    const cycle = validateSupportGraph(supportWorld(), [
      root,
      reinforce('support-a', 'support-rook', 'support-bishop'),
      reinforce('support-b', 'support-bishop', 'support-rook'),
    ]);
    expect(cycle).toMatchObject({ valid: false, reason: 'support_cycle' });
  });

  it('rejects a support link whose chess geometry becomes blocked before resolution', () => {
    const result = validateSupportGraph(supportWorld(true), chainOrders);
    expect(result).toMatchObject({ valid: false, reason: 'support_link_blocked' });
  });
});
