import { describe, expect, it } from 'vitest';
import { getTilePolarity, queueBanner } from '../../src/sim/polarity';
import { getTileFactionControl } from '../../src/sim/territory';
import { resolveReinforcementPhase } from '../../src/sim/turns';
import { createWorld } from '../../src/sim/world';

describe('Triptych strategic round boundary', () => {
  it('annexes at reinforcement and delays a two-round polarity flip until the following command phase', () => {
    const cell = { x: 7, y: 10 } as const;
    let world = createWorld([
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: cell },
    ]);
    const initialPolarity = getTilePolarity(world, cell);
    world = queueBanner(world, {
      bannerId: 'boundary-banner',
      faction: 'victoria',
      cell,
    }).state;

    world = {
      ...world,
      turn: { ...world.turn, phase: 'reinforcement' },
    };
    world = resolveReinforcementPhase(world);

    expect(world.turn.phase).toBe('victoria_command');
    expect(getTileFactionControl(world, cell)).toBe('victoria');
    expect(getTilePolarity(world, cell)).toBe(initialPolarity);

    world = {
      ...world,
      turn: { ...world.turn, phase: 'reinforcement' },
    };
    world = resolveReinforcementPhase(world);

    expect(world.turn.phase).toBe('victoria_command');
    expect(getTilePolarity(world, cell)).toBe(
      initialPolarity === 'black' ? 'white' : 'black',
    );
  });
});
