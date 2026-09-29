import { describe, expect, it } from 'vitest';

import { getTileMemory, refreshFactionIntelligence } from '../../src/sim/intelligence';
import { targetIsObserved } from '../../src/sim/knowledge-legality';
import { evaluateNodeControlForRound } from '../../src/sim/nodes';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { deriveSovereignThreat } from '../../src/sim/sovereign';
import { validateSupportGraph } from '../../src/sim/support';
import { createWorld } from '../../src/sim/world';
import type { AttackOrder, ReinforceOrder } from '../../src/sim/orders';
import type { TileMemory, UnitState, WorldState } from '../../src/sim/types';

function unit(
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState {
  return { id, faction, kind, position: { x, y } };
}

function withGhost(
  world: WorldState,
  faction: 'victoria' | 'obsidian',
  x: number,
  y: number,
  unitId: string,
): WorldState {
  const id = `${x},${y}` as const;
  const previous = world.intelligence.byFaction[faction][id]!;
  const memory: TileMemory = {
    ...previous,
    visibility: 'remembered',
    lastSeenRound: 1,
    lastKnownPolarity: previous.lastKnownPolarity ?? 'white',
    lastKnownControl: previous.lastKnownControl ?? 'neutral',
    lastKnownUnitId: unitId,
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

describe('intelligence never becomes simulation authority', () => {
  it('does not put ghost contacts into occupancy or combat target existence', () => {
    let world = createWorld([
      unit('victoria-rook', 'victoria', 'rook', 7, 7),
    ]);
    world = withGhost(world, 'victoria', 7, 10, 'ghost-enemy');

    expect(getTileMemory(world, 'victoria', { x: 7, y: 10 }).lastKnownUnitId).toBe('ghost-enemy');
    expect(world.units['ghost-enemy']).toBeUndefined();
    expect(world.occupancy['7,10']).toBeUndefined();
    expect(world.combat['ghost-enemy']).toBeUndefined();

    const order: AttackOrder = {
      orderId: 'attack-ghost',
      kind: 'attack',
      faction: 'victoria',
      unitId: 'victoria-rook',
      targetUnitId: 'ghost-enemy',
      issuedRound: 1,
      commandCost: 1,
    };
    expect(resolveCommittedOrders(world, [order]).outcomes[0])
      .toMatchObject({ status: 'REFUSED', reason: 'target_missing' });
  });

  it('does not let a ghost satisfy Reinforce support links', () => {
    let world = createWorld([
      unit('victoria-rook', 'victoria', 'rook', 11, 11),
      unit('enemy', 'obsidian', 'pawn', 11, 12),
    ]);
    world = withGhost(world, 'victoria', 10, 11, 'ghost-supporter');

    const root: AttackOrder = {
      orderId: 'root', kind: 'attack', faction: 'victoria', unitId: 'victoria-rook',
      targetUnitId: 'enemy', issuedRound: 1, commandCost: 1,
    };
    const reinforce: ReinforceOrder = {
      orderId: 'ghost-link', kind: 'reinforce', faction: 'victoria', unitId: 'ghost-supporter',
      supportedUnitId: 'victoria-rook', rootOrderId: 'root', issuedRound: 1, commandCost: 1,
    };

    expect(validateSupportGraph(world, [root, reinforce]))
      .toMatchObject({ valid: false, reason: 'supporter_unavailable' });
  });

  it('does not let a ghost threaten a sovereign or capture a node', () => {
    let world = createWorld([
      unit('victoria-king', 'victoria', 'king', 7, 7),
    ]);
    world = withGhost(world, 'victoria', 7, 8, 'ghost-rook');

    expect(deriveSovereignThreat(world, 'victoria')).toMatchObject({
      threatened: false,
      threateningUnitIds: [],
    });

    const node = world.territory.nodes['minor-w']!;
    world = withGhost(world, 'obsidian', node.center.x, node.center.y, 'ghost-capturer');
    const result = evaluateNodeControlForRound(world);
    expect(result.state.territory.nodes['minor-w']!.owner).toBeNull();
  });

  it('keeps hidden real enemies authoritative for threat resolution while denying issued targeting', () => {
    let world = createWorld([
      unit('victoria-king', 'victoria', 'king', 7, 7),
      unit('obsidian-rook', 'obsidian', 'rook', 7, 10),
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    expect(targetIsObserved(world, 'victoria', 'obsidian-rook')).toBe(false);
    expect(deriveSovereignThreat(world, 'victoria')).toMatchObject({
      threatened: true,
      threateningUnitIds: ['obsidian-rook'],
    });
  });
});
