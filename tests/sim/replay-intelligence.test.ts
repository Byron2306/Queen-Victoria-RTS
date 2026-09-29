import { describe, expect, it } from 'vitest';

import { canonicalSnapshot } from '../../src/sim/replay';
import { refreshFactionIntelligence } from '../../src/sim/intelligence';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { createWorld } from '../../src/sim/world';
import type { MoveOrder } from '../../src/sim/orders';

function rememberedWorld() {
  let world = createWorld([
    { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    { id: 'shadow-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
  ]);
  world = refreshFactionIntelligence(world, 'victoria');
  const memory = world.intelligence.byFaction.victoria['7,10']!;
  return {
    ...world,
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        victoria: {
          ...world.intelligence.byFaction.victoria,
          '7,10': {
            ...memory,
            visibility: 'remembered' as const,
            lastSeenRound: 4,
          },
        },
      },
    },
  };
}

describe('battlefield intelligence replay truth', () => {
  it('includes faction intelligence in canonical replay snapshots', () => {
    const world = rememberedWorld();
    const parsed = JSON.parse(canonicalSnapshot({ state: world, eventsByTick: [] }));

    expect(parsed.state.intelligence).toEqual(world.intelligence);
    expect(parsed.state.intelligence.byFaction.victoria['7,10']).toMatchObject({
      visibility: 'remembered',
      lastSeenRound: 4,
      lastKnownUnitId: 'shadow-pawn',
    });
  });

  it('identical starting knowledge and orders produce identical final intelligence', () => {
    const a = rememberedWorld();
    const b = rememberedWorld();
    const order: MoveOrder = {
      orderId: 'v-move',
      kind: 'move',
      faction: 'victoria',
      unitId: 'v-rook',
      destination: { x: 7, y: 8 },
      issuedRound: 1,
      commandCost: 1,
    };

    const left = resolveCommittedOrders(a, [order]);
    const right = resolveCommittedOrders(b, [order]);

    expect(left.world.intelligence).toEqual(right.world.intelligence);
    expect(canonicalSnapshot({ state: left.world, eventsByTick: [left.events] }))
      .toBe(canonicalSnapshot({ state: right.world, eventsByTick: [right.events] }));
  });
});
