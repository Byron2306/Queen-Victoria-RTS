import { describe, expect, it } from 'vitest';
import { createWorld, DEFAULT_CAPTURE_NODES } from '../../src/sim';

describe('Phase 4 initial state', () => {
  it('creates the fixed eight-node map and empty economy/production/promotion state', () => {
    const world = createWorld();
    expect(Object.keys(world.territory.nodes).sort()).toEqual(Object.keys(DEFAULT_CAPTURE_NODES).sort());
    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(Object.values(world.territory.nodes).filter(node => node.kind === 'crown')).toHaveLength(2);
    expect(world.economy.crownPower).toEqual({ victoria: 0, obsidian: 0 });
    expect(world.production.queues).toEqual({ victoria: [], obsidian: [] });
    expect(world.production.nextEntryOrdinal).toEqual({ victoria: 1, obsidian: 1 });
    expect(world.production.reinforcementAnchors).toEqual({ victoria: { x: 1, y: 1 }, obsidian: { x: 14, y: 14 } });
    expect(world.promotions.pending).toEqual([]);
    for (const node of Object.values(world.territory.nodes)) {
      expect(node.owner).toBeNull();
      expect(node.capturingFaction).toBeNull();
      expect(node.captureProgressTicks).toBe(0);
      expect(node.contested).toBe(false);
    }
  });

  it('constructs node configuration deterministically', () => {
    expect(createWorld().territory).toEqual(createWorld().territory);
  });
});
