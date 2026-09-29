import type {
  ScreenPoint,
} from '../board/projection';
import {
  interpolateUnitMotion,
} from './unit-motion';

interface UnitMotionState {
  from: ScreenPoint;
  to: ScreenPoint;
  startedAtMs: number;
}

function samePoint(
  a: ScreenPoint,
  b: ScreenPoint,
): boolean {
  return a.x === b.x && a.y === b.y;
}

export class UnitMotionTracker {
  private readonly states =
    new Map<string, UnitMotionState>();

  resolve(
    unitId: string,
    authoritative: ScreenPoint,
    nowMs: number,
  ): ScreenPoint {
    const existing =
      this.states.get(unitId);

    if (!existing) {
      const initial = {
        x: authoritative.x,
        y: authoritative.y,
      };

      this.states.set(unitId, {
        from: initial,
        to: initial,
        startedAtMs: nowMs,
      });

      return initial;
    }

    const elapsed =
      nowMs - existing.startedAtMs;

    const current =
      interpolateUnitMotion(
        existing.from,
        existing.to,
        elapsed,
      );

    if (!samePoint(
      existing.to,
      authoritative,
    )) {
      this.states.set(unitId, {
        from: current,
        to: {
          x: authoritative.x,
          y: authoritative.y,
        },
        startedAtMs: nowMs,
      });

      return current;
    }

    return current;
  }

  reset(
    unitId: string,
    authoritative: ScreenPoint,
    nowMs = 0,
  ): ScreenPoint {
    const point = {
      x: authoritative.x,
      y: authoritative.y,
    };

    this.states.set(unitId, {
      from: point,
      to: point,
      startedAtMs: nowMs,
    });

    return point;
  }

  prune(
    liveUnitIds: ReadonlySet<string>,
  ): void {
    for (const unitId of this.states.keys()) {
      if (!liveUnitIds.has(unitId)) {
        this.states.delete(unitId);
      }
    }
  }

  has(unitId: string): boolean {
    return this.states.has(unitId);
  }
}
