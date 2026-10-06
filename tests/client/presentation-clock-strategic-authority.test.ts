import { describe, expect, it } from 'vitest';

import runtimeSource from '../../src/client/runtime/fixed-tick-runtime.ts?raw';
import {
  FixedTickRuntime,
  SIM_TICK_MS,
} from '../../src/client/runtime/fixed-tick-runtime';

describe('presentation clock strategic-authority tripwires', () => {
  it('keeps strategic APIs out of FixedTickRuntime.advance authority', () => {
    for (const forbidden of [
      'stepWorld',
      'planShadowTurn',
      'resolveReinforcementPhase',
      'queueRecruitment',
      'deployReadyUnit',
      'resolveCommittedOrders',
      'transitionTurnPhase',
      'enqueueTacticalOrder',
    ]) {
      expect(runtimeSource).not.toContain(forbidden);
    }
  });

  it('does not drain tactical or legacy commands while presentation time advances', () => {
    const runtime = new FixedTickRuntime();
    const world = runtime.world;
    const queen = world.units['victoria-queen'];

    expect(queen).toBeDefined();

    runtime.commands.move(
      world,
      'victoria-queen',
      {
        x: queen!.position.x + 1,
        y: queen!.position.y,
      },
    );

    runtime.commands.recruit(
      world.tick,
      'victoria',
      'pawn',
    );

    const tacticalBefore =
      runtime.commands.peekTactical();

    runtime.advance(SIM_TICK_MS * 20);

    expect(
      runtime.commands.peekTactical(),
    ).toEqual(tacticalBefore);

    expect(
      runtime.commands.drainLegacy(
        runtime.world.tick,
      ),
    ).toEqual([]);
  });

  it('does not change strategic world truth across large presentation advances', () => {
    const runtime = new FixedTickRuntime();
    const before = runtime.world;

    const snapshot = {
      tick: before.tick,
      phase: before.turn.phase,
      crown: before.economy.crownPower,
      queues: before.production.queues,
      ready: before.production.ready,
      combat: before.combat,
      units: before.units,
      intelligence: before.intelligence,
      supply: before.supply,
    };

    runtime.advance(
      SIM_TICK_MS * 1000,
    );

    expect(runtime.world).toBe(before);
    expect(runtime.world.tick).toBe(
      snapshot.tick,
    );
    expect(runtime.world.turn.phase).toBe(
      snapshot.phase,
    );
    expect(
      runtime.world.economy.crownPower,
    ).toEqual(snapshot.crown);
    expect(
      runtime.world.production.queues,
    ).toEqual(snapshot.queues);
    expect(
      runtime.world.production.ready,
    ).toEqual(snapshot.ready);
    expect(runtime.world.combat).toEqual(
      snapshot.combat,
    );
    expect(runtime.world.units).toEqual(
      snapshot.units,
    );
    expect(
      runtime.world.intelligence,
    ).toEqual(snapshot.intelligence);
    expect(runtime.world.supply).toEqual(
      snapshot.supply,
    );
  });

  it('advances presentation ticks without changing WorldState.tick', () => {
    const runtime = new FixedTickRuntime();

    const result = runtime.advance(
      SIM_TICK_MS * 7,
    );

    expect(result.steps).toBe(7);
    expect(
      result.presentationClock.tick,
    ).toBe(7);
    expect(runtime.world.tick).toBe(0);
  });
});
