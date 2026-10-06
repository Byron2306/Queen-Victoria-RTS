import { describe, expect, it } from 'vitest';

import {
  createWorld,
  planShadowTurn,
} from '../../src/sim';
import { tileId } from '../../src/sim/board-topology';
import type { TileMemory, WorldState } from '../../src/sim';

function shadow(world: WorldState): WorldState {
  return {
    ...world,
    turn: {
      ...world.turn,
      phase: 'shadow_command',
    },
  };
}

function remembered(
  world: WorldState,
  faction: 'obsidian',
  unitId: string,
  cell: { x: number; y: number },
  lastSeenRound = 1,
): WorldState {
  const id = tileId(cell);
  const memory: TileMemory = {
    visibility: 'remembered',
    lastSeenRound,
    lastKnownPolarity: 'white',
    lastKnownControl: 'neutral',
    lastKnownUnitId: unitId,
    lastKnownFortificationId: null,
    lastKnownBannerId: null,
  };

  return {
    ...world,
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        [faction]: {
          ...world.intelligence.byFaction[faction],
          [id]: memory,
        },
      },
    },
  };
}

describe('Shadow AI knowledge boundary', () => {
  it('does not change direct decisions when a hidden enemy relocates outside observed truth', () => {
    const common = [
      { id: 'orook', faction: 'obsidian' as const, kind: 'rook' as const, position: { x: 27, y: 15 } },
      { id: 'opawn', faction: 'obsidian' as const, kind: 'pawn' as const, position: { x: 28, y: 16 } },
    ];

    let a = shadow(createWorld([
      ...common,
      { id: 'hidden', faction: 'victoria', kind: 'rook', position: { x: 1, y: 14 } },
    ], { topologyId: 'triptych-v2', aiFactions: ['obsidian'] }));

    let b = shadow(createWorld([
      ...common,
      { id: 'hidden', faction: 'victoria', kind: 'rook', position: { x: 4, y: 18 } },
    ], { topologyId: 'triptych-v2', aiFactions: ['obsidian'] }));

    a = remembered(a, 'obsidian', 'hidden', { x: 4, y: 15 });
    b = remembered(b, 'obsidian', 'hidden', { x: 4, y: 15 });

    expect(planShadowTurn(a)).toEqual(planShadowTurn(b));
  });

  it('may use a remembered contact for pressure but never attacks it while unobserved', () => {
    let world = shadow(createWorld([
      { id: 'orook', faction: 'obsidian', kind: 'rook', position: { x: 27, y: 15 } },
      { id: 'hidden', faction: 'victoria', kind: 'pawn', position: { x: 1, y: 14 } },
    ], { topologyId: 'triptych-v2', aiFactions: ['obsidian'] }));

    world = remembered(world, 'obsidian', 'hidden', { x: 22, y: 15 });

    const orders = planShadowTurn(world);

    expect(
      orders.some(order => order.kind === 'attack' && order.targetUnitId === 'hidden'),
    ).toBe(false);

    expect(
      orders.some(order => order.kind === 'move'),
    ).toBe(true);
  });

  it('prioritizes an observed immediate King attack over lower-value movement', () => {
    const world = shadow(createWorld([
      { id: 'orook', faction: 'obsidian', kind: 'rook', position: { x: 18, y: 15 } },
      { id: 'opawn', faction: 'obsidian', kind: 'pawn', position: { x: 27, y: 15 } },
      { id: 'vking', faction: 'victoria', kind: 'king', position: { x: 18, y: 18 } },
    ], { topologyId: 'triptych-v2', aiFactions: ['obsidian'] }));

    const orders = planShadowTurn(world);

    expect(orders[0]).toMatchObject({
      kind: 'attack',
      faction: 'obsidian',
      unitId: 'orook',
      targetUnitId: 'vking',
    });
  });

  it('is deterministic regardless of hidden enemy insertion order', () => {
    const friendlies = [
      { id: 'orook', faction: 'obsidian' as const, kind: 'rook' as const, position: { x: 27, y: 15 } },
      { id: 'opawn', faction: 'obsidian' as const, kind: 'pawn' as const, position: { x: 28, y: 16 } },
    ];
    const hidden = [
      { id: 'vh1', faction: 'victoria' as const, kind: 'pawn' as const, position: { x: 1, y: 14 } },
      { id: 'vh2', faction: 'victoria' as const, kind: 'bishop' as const, position: { x: 3, y: 18 } },
    ];

    let a = shadow(createWorld(
      [...friendlies, ...hidden],
      { topologyId: 'triptych-v2', aiFactions: ['obsidian'] },
    ));
    let b = shadow(createWorld(
      [...friendlies, ...hidden].reverse(),
      { topologyId: 'triptych-v2', aiFactions: ['obsidian'] },
    ));

    a = remembered(a, 'obsidian', 'vh1', { x: 22, y: 15 });
    a = remembered(a, 'obsidian', 'vh2', { x: 21, y: 16 });
    b = remembered(b, 'obsidian', 'vh1', { x: 22, y: 15 });
    b = remembered(b, 'obsidian', 'vh2', { x: 21, y: 16 });

    expect(planShadowTurn(a)).toEqual(planShadowTurn(b));
  });
});
