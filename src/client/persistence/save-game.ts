import type { WorldState } from '../../sim/types';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'queen-victoria-rts.save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveEnvelope {
  version: number;
  world: WorldState;
}

export function saveGame(
  storage: StorageLike,
  world: WorldState,
): void {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    world,
  };

  storage.setItem(
    SAVE_KEY,
    JSON.stringify(envelope),
  );
}

export function loadGame(
  storage: StorageLike,
): WorldState | null {
  const raw = storage.getItem(SAVE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;

    if (parsed.version !== SAVE_VERSION) {
      return null;
    }

    if (!parsed.world) {
      return null;
    }

    return parsed.world;
  } catch {
    return null;
  }
}
