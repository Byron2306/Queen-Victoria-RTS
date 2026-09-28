import type { WorldState } from '../../sim/types';
import {
  FixedTickRuntime,
  type RuntimeAdvanceResult,
} from '../runtime/fixed-tick-runtime';

export class BattlefieldSceneController {
  public readonly runtime: FixedTickRuntime;

  constructor(
    runtime: FixedTickRuntime = new FixedTickRuntime(),
  ) {
    this.runtime = runtime;
  }

  get world(): WorldState {
    return this.runtime.world;
  }

  update(deltaMs: number): RuntimeAdvanceResult {
    return this.runtime.advance(deltaMs);
  }
}
