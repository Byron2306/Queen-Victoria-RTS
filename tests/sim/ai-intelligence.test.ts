import { describe, expect, it } from 'vitest';

import {
  commandsForCommitments,
  scoreStrategicIntentions,
  selectPriorityTarget,
} from '../../src/sim/ai';
import { getFortificationAt } from '../../src/sim/fortifications';
import { refreshFactionIntelligence } from '../../src/sim/intelligence';
import {
  createFactionKnowledgeView,
  createFactionPlanningWorld,
} from '../../src/sim/intelligence-view';
import { getTilePolarity } from '../../src/sim/polarity';
import { strategicTiles } from '../../src/sim/territory';
import { createWorld } from '../../src/sim/world';
import type { StrategicCommitment, UnitState, WorldState } from '../../src/sim/types';

function unit(
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState {
  return { id, faction, kind, position: { x, y } };
}

function reposition(
  world: WorldState,
  unitId: string,
  x: number,
  y: number,
): WorldState {
  const actor = world.units[unitId]!;
  const occupancy = { ...world.occupancy };
  delete occupancy[`${actor.position.x},${actor.position.y}`];
  occupancy[`${x},${y}`] = unitId;
  return {
    ...world,
    units: { ...world.units, [unitId]: { ...actor, position: { x, y } } },
    occupancy,
    combat: {
      ...world.combat,
      [unitId]: { ...world.combat[unitId]!, guardAnchor: { x, y } },
    },
  };
}

describe('AI obeys faction battlefield intelligence', () => {
  it('does not expose hidden authoritative enemies to targeting or pressure scoring', () => {
    let world = createWorld([
      unit('shadow-rook', 'obsidian', 'rook', 7, 7),
      unit('victoria-queen', 'victoria', 'queen', 7, 12),
    ]);
    world = refreshFactionIntelligence(world, 'obsidian');

    const view = createFactionKnowledgeView(world, 'obsidian');
    expect(view.observedEnemyUnits.map(candidate => candidate.id)).not.toContain('victoria-queen');
    expect(selectPriorityTarget(world, 'obsidian', 'shadow-rook')).toBeNull();
    expect(scoreStrategicIntentions(world, 'obsidian'))
      .not.toContainEqual(expect.objectContaining({ intention: 'pressure_position', objectiveId: 'victoria-queen' }));
  });

  it('allows currently observed enemies back into AI targeting', () => {
    let world = createWorld([
      unit('shadow-rook', 'obsidian', 'rook', 7, 7),
      unit('victoria-queen', 'victoria', 'queen', 7, 10),
    ]);
    world = refreshFactionIntelligence(world, 'obsidian');

    expect(createFactionKnowledgeView(world, 'obsidian').observedEnemyUnits.map(unit => unit.id))
      .toContain('victoria-queen');
    expect(selectPriorityTarget(world, 'obsidian', 'shadow-rook')).toBe('victoria-queen');
  });

  it('may investigate a stale ghost but never converts it into an Attack target', () => {
    let world = createWorld([
      unit('shadow-rook', 'obsidian', 'rook', 7, 7),
      unit('victoria-queen', 'victoria', 'queen', 7, 10),
    ]);
    world = refreshFactionIntelligence(world, 'obsidian');

    world = reposition(world, 'shadow-rook', 12, 7);
    world = reposition(world, 'victoria-queen', 7, 12);
    world = refreshFactionIntelligence(world, 'obsidian');

    const view = createFactionKnowledgeView(world, 'obsidian');
    expect(view.rememberedContacts).toContainEqual(expect.objectContaining({
      unitId: 'victoria-queen',
      position: { x: 7, y: 10 },
    }));
    expect(view.observedEnemyUnits.map(unit => unit.id)).not.toContain('victoria-queen');
    expect(selectPriorityTarget(world, 'obsidian', 'shadow-rook')).toBeNull();

    const pressure = scoreStrategicIntentions(world, 'obsidian').find(
      candidate => candidate.intention === 'pressure_position' && candidate.objectiveId === 'victoria-queen',
    );
    expect(pressure).toBeDefined();

    const commitment: StrategicCommitment = {
      intention: 'pressure_position',
      objectiveId: 'victoria-queen',
      startedTick: world.tick,
      expiresTick: world.tick + 30,
      score: pressure!.score,
    };
    const commands = commandsForCommitments(world, 'obsidian', [commitment]);
    expect(commands.some(command => command.type === 'attack' && command.targetId === 'victoria-queen'))
      .toBe(false);
  });

  it('plans from remembered polarity and fortification truth until re-observation', () => {
    const target = { x: 7, y: 10 } as const;
    let world = createWorld([
      unit('shadow-rook', 'obsidian', 'rook', 7, 7),
    ]);
    world = refreshFactionIntelligence(world, 'obsidian');
    const rememberedPolarity = getTilePolarity(world, target);

    world = reposition(world, 'shadow-rook', 12, 7);
    world = refreshFactionIntelligence(world, 'obsidian');

    const tiles = { ...strategicTiles(world) };
    tiles['7,10'] = {
      ...tiles['7,10']!,
      polarity: rememberedPolarity === 'white' ? 'black' : 'white',
    };
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles,
        fortifications: {
          'secret-bastion': {
            id: 'secret-bastion', faction: 'victoria', kind: 'bastion', cell: target, durability: 3,
          },
        },
      } as any,
    };

    let planning = createFactionPlanningWorld(world, 'obsidian');
    expect(getTilePolarity(planning, target)).toBe(rememberedPolarity);
    expect(getFortificationAt(planning, target)).toBeNull();

    world = reposition(world, 'shadow-rook', 7, 7);
    world = refreshFactionIntelligence(world, 'obsidian');
    planning = createFactionPlanningWorld(world, 'obsidian');
    expect(getTilePolarity(planning, target)).not.toBe(rememberedPolarity);
    expect(getFortificationAt(planning, target)?.id).toBe('secret-bastion');
  });
});
