import { expect, it } from 'vitest';
import { legalDestinationsForUnit } from '../../src/client/input/legal-destinations';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getTileMemory } from '../../src/sim/intelligence';
import { createWorld } from '../../src/sim/world';

it('offers reachable outer V2 cells and excludes destinations outside current knowledge', () => {
  const world = createWorld([
    { id: 'rook', faction: 'victoria', kind: 'rook', position: { x: 27, y: 18 } },
  ], { topologyId: 'triptych-v2' });
  const destinations = legalDestinationsForUnit(world, 'rook');
  expect(destinations).toContainEqual({ x: 28, y: 18 });
  expect(destinations).toContainEqual({ x: 30, y: 18 });
  expect(destinations).not.toContainEqual({ x: 31, y: 18 });
});

it('does not mark unseen long moves as legal on the opening board', () => {
  const world = createPhase6SkirmishWorld();
  const destinations = legalDestinationsForUnit(world, 'victoria-queen');
  expect(destinations).toContainEqual({ x: 5, y: 16 });
  expect(destinations).not.toContainEqual({ x: 15, y: 7 });
});

it('opens the skirmish with current local intelligence', () => {
  const world = createPhase6SkirmishWorld();
  expect(getTileMemory(world, 'victoria', { x: 5, y: 16 }).visibility).toBe('observed');
  expect(getTileMemory(world, 'victoria', { x: 25, y: 15 }).visibility).toBe('unknown');
});
