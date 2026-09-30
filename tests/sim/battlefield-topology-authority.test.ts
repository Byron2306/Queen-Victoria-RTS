import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BATTLEFIELD_TOPOLOGY_ID,
  getBattlefieldTopology,
} from '../../src/sim/battlefield-topology-authority';

describe('battlefield topology authority', () => {
  it('keeps the verified 24x24 Triptych as the default live authority', () => {
    const topology = getBattlefieldTopology();

    expect(DEFAULT_BATTLEFIELD_TOPOLOGY_ID).toBe('triptych-v1');
    expect(topology.id).toBe('triptych-v1');
    expect(topology.width).toBe(24);
    expect(topology.height).toBe(24);
    expect(topology.allPlayableCells()).toHaveLength(288);
    expect(topology.isPlayableCell(23, 15)).toBe(true);
    expect(topology.isPlayableCell(24, 15)).toBe(false);
  });

  it('exposes the verified 32x32 candidate without activating it globally', () => {
    const topology = getBattlefieldTopology('triptych-v2');

    expect(topology.id).toBe('triptych-v2');
    expect(topology.width).toBe(32);
    expect(topology.height).toBe(32);
    expect(topology.allPlayableCells()).toHaveLength(496);
    expect(topology.isPlayableCell(31, 11)).toBe(true);
    expect(topology.isPlayableCell(32, 11)).toBe(false);
  });

  it('routes neighbour queries through the selected topology', () => {
    const legacy = getBattlefieldTopology('triptych-v1');
    const candidate = getBattlefieldTopology('triptych-v2');

    expect(legacy.orthogonalNeighbors(9, 7))
      .not.toContainEqual({ x: 8, y: 7 });

    expect(candidate.orthogonalNeighbors(12, 10))
      .not.toContainEqual({ x: 11, y: 10 });
  });
});
