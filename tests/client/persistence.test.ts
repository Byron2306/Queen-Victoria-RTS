import { describe, expect, it } from 'vitest';
import {
  loadGame,
  saveGame,
  SAVE_KEY,
  SAVE_VERSION,
  type StorageLike,
} from '../../src/client/persistence/save-game';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('Phase 6 local persistence', () => {
  it('saves a versioned authoritative world snapshot', () => {
    const storage = new MemoryStorage();
    const world = createPhase6SkirmishWorld();

    saveGame(storage, world);

    const raw = storage.getItem(SAVE_KEY);

    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);

    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.world).toEqual(world);
  });

  it('loads an intact saved world', () => {
    const storage = new MemoryStorage();
    const world = createPhase6SkirmishWorld();

    saveGame(storage, world);

    expect(loadGame(storage)).toEqual(world);
  });

  it('returns null when no save exists', () => {
    const storage = new MemoryStorage();

    expect(loadGame(storage)).toBeNull();
  });

  it('rejects malformed JSON without crashing', () => {
    const storage = new MemoryStorage();

    storage.setItem(SAVE_KEY, '{not-json');

    expect(loadGame(storage)).toBeNull();
  });

  it('rejects an unsupported save version', () => {
    const storage = new MemoryStorage();
    const world = createPhase6SkirmishWorld();

    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: SAVE_VERSION + 1,
        world,
      }),
    );

    expect(loadGame(storage)).toBeNull();
  });

  it('does not mutate the world while saving', () => {
    const storage = new MemoryStorage();
    const world = createPhase6SkirmishWorld();
    const before = JSON.stringify(world);

    saveGame(storage, world);

    expect(JSON.stringify(world)).toBe(before);
  });
});

import { FixedTickRuntime, SIM_TICK_MS } from '../../src/client/runtime/fixed-tick-runtime';

describe('Phase 6 persisted runtime continuity', () => {
  it('continues ticking from a loaded save', () => {
    const storage = new MemoryStorage();
    const world = createPhase6SkirmishWorld();

    const runtime = new FixedTickRuntime(world);

    runtime.advance(SIM_TICK_MS * 2);

    saveGame(storage, runtime.world);

    const loaded = loadGame(storage);

    expect(loaded).not.toBeNull();
    expect(loaded!.tick).toBe(0);

    const resumed = new FixedTickRuntime(loaded!);

    resumed.advance(SIM_TICK_MS);

    expect(resumed.world.tick).toBe(0);
  });
});
