import { describe, expect, it } from 'vitest';

import {
  createWorld,
  planShadowTurn,
} from '../../src/sim';
import type { WorldState } from '../../src/sim';

function shadowWorld(): WorldState {
  return {
    ...createWorld([
      { id: 'oking', faction: 'obsidian', kind: 'king', position: { x: 14, y: 14 } },
      { id: 'or1', faction: 'obsidian', kind: 'rook', position: { x: 12, y: 12 } },
      { id: 'or2', faction: 'obsidian', kind: 'rook', position: { x: 10, y: 12 } },
      { id: 'ob1', faction: 'obsidian', kind: 'bishop', position: { x: 11, y: 11 } },
      { id: 'on1', faction: 'obsidian', kind: 'knight', position: { x: 13, y: 11 } },
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 9, y: 12 } },
      { id: 'vp1', faction: 'victoria', kind: 'pawn', position: { x: 8, y: 11 } },
    ], { aiFactions: ['obsidian'] }),
    turn: {
      round: 3,
      phase: 'shadow_command',
      royalCommandsRemaining: {
        victoria: 4,
        obsidian: 4,
      },
      pendingOrderIds: [],
    },
  };
}

describe('Shadow AI Royal Command budget', () => {
  it('never emits more than four costed TacticalOrders', () => {
    const orders = planShadowTurn(shadowWorld());

    expect(orders.length).toBeLessThanOrEqual(4);
    expect(
      orders.reduce((sum, order) => sum + order.commandCost, 0),
    ).toBeLessThanOrEqual(4);
  });

  it('respects a partially spent Obsidian Royal Command budget', () => {
    const world = shadowWorld();
    const constrained: WorldState = {
      ...world,
      turn: {
        ...world.turn,
        royalCommandsRemaining: {
          ...world.turn.royalCommandsRemaining,
          obsidian: 2,
        },
      },
    };

    const orders = planShadowTurn(constrained);

    expect(orders.length).toBeLessThanOrEqual(2);
    expect(
      orders.reduce((sum, order) => sum + order.commandCost, 0),
    ).toBeLessThanOrEqual(2);
  });

  it('emits no costed orders when Obsidian has no Royal Commands left', () => {
    const world = shadowWorld();
    const exhausted: WorldState = {
      ...world,
      turn: {
        ...world.turn,
        royalCommandsRemaining: {
          ...world.turn.royalCommandsRemaining,
          obsidian: 0,
        },
      },
    };

    expect(planShadowTurn(exhausted)).toEqual([]);
  });

  it('assigns deterministic round-scoped order ids in emitted order', () => {
    const a = planShadowTurn(shadowWorld());
    const b = planShadowTurn(shadowWorld());

    expect(a).toEqual(b);
    expect(a.map(order => order.orderId)).toEqual(
      a.map((_, index) => `obsidian-r3-o${index}`),
    );
  });

  it('never spends more commandCost than each emitted order declares', () => {
    const orders = planShadowTurn(shadowWorld());

    expect(orders.every(order => Number.isInteger(order.commandCost))).toBe(true);
    expect(orders.every(order => order.commandCost > 0)).toBe(true);
    expect(orders.every(order => order.commandCost === 1)).toBe(true);
  });
});
