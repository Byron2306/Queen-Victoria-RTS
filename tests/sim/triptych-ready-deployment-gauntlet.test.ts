import { describe, expect, it } from 'vitest';

import {
  canonicalSnapshot,
  deployReadyUnit,
  deploymentZoneForFaction,
  legalDeploymentCells,
  queueRecruitment,
  resolveReinforcementPhase,
  selectAIReadyDeploymentCell,
  stepWorld,
} from '../../src/sim';
import type {
  ReplayResult,
  SimCommand,
  WorldState,
} from '../../src/sim';
import { coordKey, createWorld, placeUnit } from '../../src/sim/world';

function fundedWorld(): WorldState {
  const world = createWorld([], {
    topologyId: 'triptych-v2',
    aiFactions: ['obsidian'],
  });
  return {
    ...world,
    economy: {
      crownPower: {
        victoria: 100,
        obsidian: 100,
      },
    },
  };
}

function snapshot(world: WorldState): string {
  const result: ReplayResult = {
    state: world,
    eventsByTick: [],
  };
  return canonicalSnapshot(result);
}

function mature(world: WorldState): WorldState {
  return resolveReinforcementPhase({
    ...world,
    turn: {
      ...world.turn,
      phase: 'reinforcement',
    },
  });
}

function removeUnit(world: WorldState, unitId: string): WorldState {
  const unit = world.units[unitId];
  if (!unit) return world;

  const units = { ...world.units };
  const occupancy = { ...world.occupancy };
  const combat = { ...world.combat };
  const military = { ...world.military };
  const exposureRoundsByUnit = {
    ...world.supply.exposureRoundsByUnit,
  };

  delete units[unitId];
  delete occupancy[coordKey(unit.position)];
  delete combat[unitId];
  delete military[unitId];
  delete exposureRoundsByUnit[unitId];

  return {
    ...world,
    units,
    occupancy,
    combat,
    military,
    supply: { exposureRoundsByUnit },
  };
}

describe('Triptych READY deployment integrated gauntlet', () => {
  it('proves purchase, READY, explicit placement, blocking, AI parity, supply timing, identity, and replay determinism', () => {
    let world = fundedWorld();

    const victoriaPurchase = queueRecruitment(world, {
      type: 'recruit',
      sequence: 1,
      issuedTick: world.tick,
      faction: 'victoria',
      unitKind: 'pawn',
    });
    const obsidianPurchase = queueRecruitment(victoriaPurchase.state, {
      type: 'recruit',
      sequence: 2,
      issuedTick: world.tick,
      faction: 'obsidian',
      unitKind: 'pawn',
    });
    world = obsidianPurchase.state;

    expect(world.production.queues.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1']);
    expect(world.production.queues.obsidian.map(entry => entry.id))
      .toEqual(['obsidian-recruit-1']);
    expect(world.units['unit:victoria-recruit-1']).toBeUndefined();

    const beforeMaturation = snapshot(world);
    expect(beforeMaturation).toBe(snapshot(world));

    world = mature(world);

    expect(world.production.queues.victoria).toEqual([]);
    expect(world.production.queues.obsidian).toEqual([]);
    expect(world.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1']);
    expect(world.production.ready.obsidian.map(entry => entry.id))
      .toEqual(['obsidian-recruit-1']);
    expect(world.units['unit:victoria-recruit-1']).toBeUndefined();

    const victoriaZone = deploymentZoneForFaction(world, 'victoria');
    const obsidianZone = deploymentZoneForFaction(world, 'obsidian');
    expect(victoriaZone).toHaveLength(25);
    expect(obsidianZone).toHaveLength(25);
    expect(Math.min(...victoriaZone.map(cell => cell.x))).toBe(1);
    expect(Math.max(...victoriaZone.map(cell => cell.x))).toBe(5);
    expect(Math.min(...victoriaZone.map(cell => cell.y))).toBe(14);
    expect(Math.max(...victoriaZone.map(cell => cell.y))).toBe(18);
    expect(Math.min(...obsidianZone.map(cell => cell.x))).toBe(26);
    expect(Math.max(...obsidianZone.map(cell => cell.x))).toBe(30);
    expect(Math.min(...obsidianZone.map(cell => cell.y))).toBe(13);
    expect(Math.max(...obsidianZone.map(cell => cell.y))).toBe(17);

    const royalBefore = world.turn.royalCommandsRemaining.victoria;
    const deployCommand: SimCommand = {
      type: 'deploy_ready',
      sequence: 3,
      issuedTick: world.tick,
      faction: 'victoria',
      readyId: 'victoria-recruit-1',
      to: { x: 3, y: 16 },
    };
    const deployed = stepWorld(world, [deployCommand]);
    world = deployed.state;

    expect(world.production.ready.victoria).toEqual([]);
    expect(world.turn.royalCommandsRemaining.victoria).toBe(royalBefore);
    expect(world.units['unit:victoria-recruit-1']).toMatchObject({
      id: 'unit:victoria-recruit-1',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 3, y: 16 },
    });
    expect(world.occupancy['3,16']).toBe('unit:victoria-recruit-1');
    expect(world.combat['unit:victoria-recruit-1']).toBeDefined();
    expect(world.military['unit:victoria-recruit-1'])
      .toEqual({ kills: 0, rank: 'recruit' });
    expect(world.supply.exposureRoundsByUnit['unit:victoria-recruit-1'])
      .toBeUndefined();

    const aiCellA = selectAIReadyDeploymentCell(
      world,
      'obsidian',
      'obsidian-recruit-1',
    );
    const aiCellB = selectAIReadyDeploymentCell(
      world,
      'obsidian',
      'obsidian-recruit-1',
    );
    expect(aiCellA).toEqual(aiCellB);
    expect(aiCellA).not.toBeNull();
    expect(legalDeploymentCells(
      world,
      'obsidian',
      'obsidian-recruit-1',
    )).toContainEqual(aiCellA);

    const afterDeployment = snapshot(world);
    expect(afterDeployment).toBe(snapshot(world));

    world = mature(world);
    expect(world.supply.exposureRoundsByUnit['unit:victoria-recruit-1'])
      .toBeDefined();

    let blocked = fundedWorld();
    blocked = queueRecruitment(blocked, {
      type: 'recruit',
      sequence: 10,
      issuedTick: blocked.tick,
      faction: 'victoria',
      unitKind: 'pawn',
    }).state;
    blocked = queueRecruitment(blocked, {
      type: 'recruit',
      sequence: 11,
      issuedTick: blocked.tick,
      faction: 'victoria',
      unitKind: 'pawn',
    }).state;

    blocked = mature(blocked);
    blocked = mature(blocked);

    expect(blocked.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1', 'victoria-recruit-2']);

    for (const cell of deploymentZoneForFaction(blocked, 'victoria')) {
      blocked = placeUnit(blocked, {
        id: `block-${cell.x}-${cell.y}`,
        faction: 'obsidian',
        kind: 'pawn',
        position: cell,
      });
    }

    expect(legalDeploymentCells(
      blocked,
      'victoria',
      'victoria-recruit-1',
    )).toEqual([]);
    expect(blocked.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1', 'victoria-recruit-2']);

    blocked = removeUnit(blocked, 'block-5-18');

    expect(legalDeploymentCells(
      blocked,
      'victoria',
      'victoria-recruit-1',
    )).toEqual([{ x: 5, y: 18 }]);

    const placedOne = deployReadyUnit(
      blocked,
      'victoria',
      'victoria-recruit-1',
      { x: 5, y: 18 },
    ).state;

    expect(placedOne.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-2']);
    expect(placedOne.units['unit:victoria-recruit-1']).toBeDefined();
    expect(placedOne.units['unit:victoria-recruit-2']).toBeUndefined();
  });
});
