import { describe, expect, it } from 'vitest';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { TRIPTYCH_V2_CAPTURE_NODES } from '../../src/sim/nodes';
import { createWorld } from '../../src/sim/world';

const APPROVED_V2_NODES = [
  ['crown', 'crown', 15, 1],
  ['crown-south', 'crown', 16, 30],
  ['minor-nw', 'minor', 12, 10],
  ['minor-ne', 'minor', 19, 10],
  ['minor-w', 'minor', 13, 15],
  ['minor-e', 'minor', 18, 16],
  ['minor-sw', 'minor', 12, 21],
  ['minor-se', 'minor', 19, 21],
] as const;

describe('Triptych V2 strategic nodes', () => {
  it('pins the frozen 32x32 objective map exactly', () => {
    expect(Object.values(TRIPTYCH_V2_CAPTURE_NODES).map(node => [
      node.id,
      node.kind,
      node.center.x,
      node.center.y,
    ] as const)).toEqual(APPROVED_V2_NODES);
  });

  it('initializes V2 worlds with the V2 nodes and keeps every center playable', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    const topology = getBattlefieldTopology('triptych-v2');

    expect(Object.values(world.territory.nodes).map(node => [
      node.id,
      node.kind,
      node.center.x,
      node.center.y,
    ] as const)).toEqual(APPROVED_V2_NODES);
    expect(Object.values(world.territory.nodes).every(node =>
      topology.isPlayableCell(node.center.x, node.center.y),
    )).toBe(true);
  });
});
