import { describe, expect, it } from 'vitest';
import { commandsForCommitments } from '../../src/sim/ai';
import { createWorld } from '../../src/sim/world';
import type { StrategicCommitment, UnitState } from '../../src/sim/types';

const unit = (id: string, kind: UnitState['kind'], x: number, y: number, faction: UnitState['faction']): UnitState => ({
  id,
  kind,
  faction,
  position: { x, y },
});

describe('Triptych V2 AI board search', () => {
  it('lets east-realm Obsidian movers choose progress cells beyond the retired 16x16 quadrant', () => {
    const world = createWorld([
      unit('obsidian-king', 'king', 29, 15, 'obsidian'),
      unit('obsidian-rook', 'rook', 27, 12, 'obsidian'),
      unit('victoria-king', 'king', 2, 16, 'victoria'),
    ], { topologyId: 'triptych-v2', aiFactions: ['obsidian'] });

    const commitment: StrategicCommitment = {
      intention: 'capture_node',
      objectiveId: 'minor-ne',
      startedTick: 0,
      expiresTick: 30,
      score: 1,
    };

    const move = commandsForCommitments(world, 'obsidian', [commitment])
      .find(command => command.type === 'move');

    expect(move?.type).toBe('move');
    if (move?.type === 'move') {
      expect(move.to.x).toBeGreaterThan(15);
    }
  });
});
