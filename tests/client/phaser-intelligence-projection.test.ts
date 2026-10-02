import { describe, expect, it } from 'vitest';

import { createBattlefieldSceneRuntime } from '../../src/client/phaser/scene-rendering';
import { refreshFactionIntelligence } from '../../src/sim/intelligence';
import { createWorld } from '../../src/sim/world';

describe('Phaser battlefield intelligence projection', () => {
  it('never places a hidden enemy into Victoria battlefield frame units', () => {
    let world = createWorld([
      { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      { id: 'seen-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
      { id: 'hidden-knight', faction: 'obsidian', kind: 'knight', position: { x: 14, y: 14 } },
    ]);
    world = refreshFactionIntelligence(world, 'victoria');

    const runtime = createBattlefieldSceneRuntime(world, null);
    const renderedIds = runtime.frame.units.map(unit => unit.id);

    expect(renderedIds).toContain('v-rook');
    expect(renderedIds).toContain('seen-pawn');
    expect(renderedIds).not.toContain('hidden-knight');
  });

  it('carries the full V2 presented topology into the Phaser runtime without void-corner tiles', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    const runtime = createBattlefieldSceneRuntime(world, null);

    expect(runtime.presented.tiles).toHaveLength(496);
    expect(runtime.presented.tiles.some(tile => tile.id === '27,18')).toBe(true);
    expect(runtime.presented.tiles.some(tile => tile.id === '2,2')).toBe(false);
  });
});
