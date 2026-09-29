import { describe, expect, it } from 'vitest';

import {
  loadGame,
  saveGame,
  SAVE_KEY,
  SAVE_VERSION,
  type StorageLike,
} from '../../src/client/persistence/save-game';
import {
  getTileMemory,
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { createWorld } from '../../src/sim/world';
import type { WorldState } from '../../src/sim/types';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

function staleWorld(): WorldState {
  let world = createWorld([
    { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
    { id: 'shadow-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
  ]);
  world = refreshFactionIntelligence(world, 'victoria');

  const memory = world.intelligence.byFaction.victoria['7,10']!;
  return {
    ...world,
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        victoria: {
          ...world.intelligence.byFaction.victoria,
          '7,10': {
            ...memory,
            visibility: 'remembered',
            lastSeenRound: 7,
            lastKnownPolarity: 'white',
            lastKnownUnitId: 'shadow-pawn',
          },
        },
      },
    },
  };
}

describe('battlefield intelligence persistence', () => {
  it('uses save version 3 and preserves stale intelligence exactly', () => {
    const storage = new MemoryStorage();
    const world = staleWorld();

    saveGame(storage, world);
    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).version).toBe(3);
    expect(SAVE_VERSION).toBe(3);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.intelligence).toEqual(world.intelligence);
    expect(getTileMemory(loaded!, 'victoria', { x: 7, y: 10 })).toMatchObject({
      visibility: 'remembered',
      lastSeenRound: 7,
      lastKnownPolarity: 'white',
      lastKnownUnitId: 'shadow-pawn',
    });
  });

  it('migrates a version-2 save into valid current intelligence without inventing ghosts', () => {
    const storage = new MemoryStorage();
    let world = createWorld([
      { id: 'v-rook', faction: 'victoria', kind: 'rook', position: { x: 7, y: 7 } },
      { id: 'shadow-pawn', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 10 } },
    ]);
    const legacy = { ...world } as Partial<WorldState>;
    delete legacy.intelligence;

    storage.setItem(SAVE_KEY, JSON.stringify({ version: 2, world: legacy }));
    const loaded = loadGame(storage);

    expect(loaded).not.toBeNull();
    expect(loaded!.intelligence).toBeDefined();
    expect(getTileMemory(loaded!, 'victoria', { x: 7, y: 10 })).toMatchObject({
      visibility: 'observed',
      lastKnownUnitId: 'shadow-pawn',
    });
    expect(
      Object.values(loaded!.intelligence.byFaction.victoria)
        .some(memory => memory.visibility === 'remembered'),
    ).toBe(false);
  });
});
