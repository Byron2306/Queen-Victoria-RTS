import type {
  SimEvent,
  WorldState,
} from '../../sim/types';
import { createPhase6SkirmishWorld } from '../session/skirmish';
import { ClientCommandBridge } from './command-bridge';

export const SIM_TICK_MS = 100;

export interface PresentationClockSnapshot {
  elapsedMs: number;
  tick: number;
  remainderMs: number;
  alpha: number;
}

export interface RuntimeAdvanceResult {
  steps: number;
  events: readonly SimEvent[];
  presentationClock: PresentationClockSnapshot;
}

/**
 * Presentation clock only.
 *
 * Royal Tactical strategic truth advances through explicit command,
 * resolution, Shadow, and reinforcement phase APIs. Wall-clock time may
 * count presentation frames, but it must never mutate WorldState.
 */
export class FixedTickRuntime {
  public world: WorldState;
  public readonly commands: ClientCommandBridge;

  private accumulatedMs = 0;
  private elapsedPresentationMs = 0;

  constructor(
    world: WorldState = createPhase6SkirmishWorld(),
    commands: ClientCommandBridge = new ClientCommandBridge(),
  ) {
    this.world = world;
    this.commands = commands;
  }

  get presentationClock(): PresentationClockSnapshot {
    const remainderMs =
      this.elapsedPresentationMs % SIM_TICK_MS;

    return {
      elapsedMs: this.elapsedPresentationMs,
      tick: Math.floor(
        this.elapsedPresentationMs / SIM_TICK_MS,
      ),
      remainderMs,
      alpha: remainderMs / SIM_TICK_MS,
    };
  }

  advance(elapsedMs: number): RuntimeAdvanceResult {
    this.accumulatedMs += elapsedMs;
    this.elapsedPresentationMs += elapsedMs;

    let steps = 0;

    while (this.accumulatedMs >= SIM_TICK_MS) {
      this.accumulatedMs -= SIM_TICK_MS;
      steps += 1;
    }

    return {
      steps,
      events: [],
      presentationClock:
        this.presentationClock,
    };
  }
}
