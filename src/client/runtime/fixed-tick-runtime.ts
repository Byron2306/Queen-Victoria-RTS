import { stepWorld } from '../../sim/step';
import { enqueueTacticalOrder } from '../../sim/orders';
import type {
  SimEvent,
  WorldState,
} from '../../sim/types';
import { createPhase6SkirmishWorld } from '../session/skirmish';
import { ClientCommandBridge } from './command-bridge';

export const SIM_TICK_MS = 100;

export interface RuntimeAdvanceResult {
  steps: number;
  events: readonly SimEvent[];
}

export class FixedTickRuntime {
  public world: WorldState;
  public readonly commands: ClientCommandBridge;

  private accumulatedMs = 0;

  constructor(
    world: WorldState = createPhase6SkirmishWorld(),
    commands: ClientCommandBridge = new ClientCommandBridge(),
  ) {
    this.world = world;
    this.commands = commands;
  }

  advance(elapsedMs: number): RuntimeAdvanceResult {
    this.accumulatedMs += elapsedMs;

    let steps = 0;
    const events: SimEvent[] = [];

    while (this.accumulatedMs >= SIM_TICK_MS) {
      for (
        const order of
        this.commands.drainTactical()
      ) {
        const queued =
          enqueueTacticalOrder(
            this.world,
            order,
          );

        this.world =
          queued.world;
      }

      const dueCommands =
        this.commands.drainLegacy(
          this.world.tick,
        );

      const result = stepWorld(
        this.world,
        dueCommands,
      );

      this.world = result.state;
      events.push(...result.events);

      this.accumulatedMs -= SIM_TICK_MS;
      steps += 1;
    }

    return {
      steps,
      events,
    };
  }
}
