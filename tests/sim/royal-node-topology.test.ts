import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  DEFAULT_CAPTURE_NODES,
  evaluateNodeControlForRound,
} from '../../src/sim/nodes';
import { isPlayableCell } from '../../src/sim/board-topology';
import { resolveSettlement } from '../../src/sim/territory';

describe('Royal Tactical node topology', () => {
  it('has two major Crown nodes and six minor nodes, all on the cross battlefield', () => {
    const nodes = Object.values(DEFAULT_CAPTURE_NODES);
    expect(nodes).toHaveLength(8);
    expect(nodes.filter((node) => node.kind === 'crown')).toHaveLength(2);
    expect(nodes.filter((node) => node.kind === 'minor')).toHaveLength(6);
    expect(nodes.every((node) => isPlayableCell(node.center.x, node.center.y))).toBe(true);
  });

  it('refuses node capture without orthogonally adjacent faction supply', () => {
    const world = createPhase6SkirmishWorld();
    const crown = world.territory.nodes.crown!;
    const queen = world.units['victoria-queen']!;

    const positioned = {
      ...world,
      units: {
        ...world.units,
        [queen.id]: {
          ...queen,
          position: { ...crown.center },
        },
      },
      occupancy: {
        [`${crown.center.x},${crown.center.y}`]: queen.id,
      },
    };

    const result = evaluateNodeControlForRound(positioned);
    expect(result.state.territory.nodes.crown?.owner).toBeNull();
  });

  it('claims a neutral node when occupation is supplied by an adjacent faction tile', () => {
    const world = createPhase6SkirmishWorld();
    const crown = world.territory.nodes.crown!;
    const queen = world.units['victoria-queen']!;
    const supplyCell = { x: crown.center.x, y: crown.center.y + 1 };

    let supplied = resolveSettlement({
      ...world,
      units: {
        'supply-pawn': {
          id: 'supply-pawn',
          faction: 'victoria',
          kind: 'pawn',
          position: supplyCell,
        },
      },
      occupancy: {
        [`${supplyCell.x},${supplyCell.y}`]: 'supply-pawn',
      },
      combat: {
        'supply-pawn': world.combat[queen.id]!,
      },
    });

    supplied = {
      ...supplied,
      units: {
        [queen.id]: {
          ...queen,
          position: { ...crown.center },
        },
      },
      occupancy: {
        [`${crown.center.x},${crown.center.y}`]: queen.id,
      },
      combat: {
        [queen.id]: world.combat[queen.id]!,
      },
    };

    const result = evaluateNodeControlForRound(supplied);
    expect(result.state.territory.nodes.crown?.owner).toBe('victoria');
  });
});
