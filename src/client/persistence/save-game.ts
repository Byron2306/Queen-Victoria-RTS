import {
  createInitialIntelligenceState,
  refreshAllIntelligence,
} from '../../sim/intelligence';
import { createInitialTurnState } from '../../sim/turns';
import type { WorldState } from '../../sim/types';

export const SAVE_VERSION = 3;
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

function reconstructCurrentIntelligence(
  world: WorldState,
): WorldState {
  return refreshAllIntelligence({
    ...world,
    intelligence:
      createInitialIntelligenceState(),
  });
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

    if (!parsed.world) {
      return null;
    }

    if (parsed.version === SAVE_VERSION) {
      return parsed.world;
    }

    if (parsed.version === 2) {
      return reconstructCurrentIntelligence(
        parsed.world,
      );
    }

    if (parsed.version === 1) {
      const legacy =
        parsed.world as Partial<WorldState>;

      const migrated = {
        ...(legacy as WorldState),

        turn:
          legacy.turn ??
          createInitialTurnState(),

        pendingOrders:
          legacy.pendingOrders ??
          [],
      };

      return reconstructCurrentIntelligence(
        migrated,
      );
    }

    return null;
  } catch {
    return null;
  }
}
