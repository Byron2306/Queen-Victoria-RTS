import { describe, expect, it } from 'vitest';
import strategicTargetingSource from '../../src/client/input/strategic-targeting.ts?raw';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  legalStrategicTargets,
  stageStrategicTarget,
} from '../../src/client/input/strategic-targeting';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';
import {
  canFactionClaimTile,
  topologyForWorld,
} from '../../src/sim/territory';
import { tileId } from '../../src/sim/board-topology';

function hasCell(cells: readonly { x: number; y: number }[], x: number, y: number): boolean {
  return cells.some(cell => cell.x === x && cell.y === y);
}

describe('Triptych strategic targeting authority', () => {
  it('offers banner placement only on friendly playable cells without banners', () => {
    const world = createPhase6SkirmishWorld();
    const targets = legalStrategicTargets(world, 'victoria', 'deploy_banner');

    expect(hasCell(targets, 7, 14)).toBe(true);
    expect(hasCell(targets, 8, 14)).toBe(false);
    expect(hasCell(targets, 0, 0)).toBe(false);
  });

  it('offers fortification placement only where the fortification engine allows it', () => {
    const world = createPhase6SkirmishWorld();
    const bastions = legalStrategicTargets(world, 'victoria', 'build_bastion');
    const redoubts = legalStrategicTargets(world, 'victoria', 'build_redoubt');

    expect(hasCell(bastions, 7, 11)).toBe(true);
    expect(hasCell(redoubts, 7, 11)).toBe(true);
    expect(hasCell(bastions, 8, 14)).toBe(false);
    expect(hasCell(bastions, 24, 14)).toBe(false);
  });

  it('offers annexing only on neutral orthogonally adjacent frontier cells', () => {
    const world = createPhase6SkirmishWorld();
    const targets = legalStrategicTargets(world, 'victoria', 'annex_tile');

    expect(hasCell(targets, 8, 14)).toBe(true);
    expect(hasCell(targets, 10, 14)).toBe(false);
    expect(hasCell(targets, 24, 14)).toBe(false);
  });

  it('matches sim claim legality for every playable V2 cell', () => {
    const world = createPhase6SkirmishWorld();
    const legalIds = new Set(
      legalStrategicTargets(world, 'victoria', 'annex_tile').map(tileId),
    );

    for (const cell of topologyForWorld(world).allPlayableCells()) {
      expect(legalIds.has(tileId(cell))).toBe(
        canFactionClaimTile(world, 'victoria', cell, 'annex_command').allowed,
      );
    }
  });

  it('refuses staging a disconnected neutral annex target', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    expect(stageStrategicTarget(
      bridge,
      world,
      'victoria',
      'annex_tile',
      { x: 10, y: 14 },
    )).toBe(false);
    expect(bridge.drainTactical()).toEqual([]);
  });

  it('delegates annex legality to the canonical sim claim authority', () => {
    expect(strategicTargetingSource).toContain('canFactionClaimTile');
    expect(strategicTargetingSource).not.toContain('hasAdjacentFactionTile');
  });

  it('stages the armed mode through the canonical client bridge', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    stageStrategicTarget(bridge, world, 'victoria', 'build_redoubt', { x: 7, y: 11 });
    stageStrategicTarget(bridge, world, 'victoria', 'annex_tile', { x: 8, y: 14 });

    expect(bridge.drainTactical().map(order => order.kind))
      .toEqual(['build_fortification', 'annex_tile']);
  });
});
