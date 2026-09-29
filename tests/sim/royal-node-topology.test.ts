import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  DEFAULT_CAPTURE_NODES,
  evaluateNodeControlForRound,
} from '../../src/sim/nodes';

describe('Royal Tactical node topology', () => {
  it('has two major Crown nodes and six minor nodes', () => {
    const nodes = Object.values(DEFAULT_CAPTURE_NODES);
    expect(nodes).toHaveLength(8);
    expect(nodes.filter((node) => node.kind === 'crown')).toHaveLength(2);
    expect(nodes.filter((node) => node.kind === 'minor')).toHaveLength(6);
  });

  it('claims a neutral node during reinforcement-round territory resolution', () => {
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
    };

    const result = evaluateNodeControlForRound(positioned);
    expect(result.state.territory.nodes.crown?.owner).toBe('victoria');
  });
});
