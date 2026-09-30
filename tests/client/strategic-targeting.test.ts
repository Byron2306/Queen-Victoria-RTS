import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  legalStrategicTargets,
  stageStrategicTarget,
} from '../../src/client/input/strategic-targeting';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';

function hasCell(cells: readonly { x: number; y: number }[], x: number, y: number): boolean {
  return cells.some(cell => cell.x === x && cell.y === y);
}

describe('Triptych strategic targeting authority', () => {
  it('offers banner placement only on friendly playable cells without banners', () => {
    const world = createPhase6SkirmishWorld();
    const targets = legalStrategicTargets(world, 'victoria', 'deploy_banner');

    expect(hasCell(targets, 8, 11)).toBe(true);
    expect(hasCell(targets, 9, 11)).toBe(false);
    expect(hasCell(targets, 0, 0)).toBe(false);
  });

  it('offers fortification placement only where the fortification engine allows it', () => {
    const world = createPhase6SkirmishWorld();
    const bastions = legalStrategicTargets(world, 'victoria', 'build_bastion');
    const redoubts = legalStrategicTargets(world, 'victoria', 'build_redoubt');

    expect(hasCell(bastions, 7, 11)).toBe(true);
    expect(hasCell(redoubts, 7, 11)).toBe(true);
    expect(hasCell(bastions, 8, 11)).toBe(false);
    expect(hasCell(bastions, 9, 11)).toBe(false);
  });

  it('offers annexing only on neutral orthogonally adjacent frontier cells', () => {
    const world = createPhase6SkirmishWorld();
    const targets = legalStrategicTargets(world, 'victoria', 'annex_tile');

    expect(hasCell(targets, 9, 11)).toBe(true);
    expect(hasCell(targets, 11, 11)).toBe(false);
    expect(hasCell(targets, 15, 12)).toBe(false);
  });

  it('stages the armed mode through the canonical client bridge', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    stageStrategicTarget(bridge, world, 'victoria', 'build_redoubt', { x: 7, y: 11 });
    stageStrategicTarget(bridge, world, 'victoria', 'annex_tile', { x: 9, y: 11 });

    expect(bridge.drainTactical().map(order => order.kind))
      .toEqual(['build_fortification', 'annex_tile']);
  });
});
