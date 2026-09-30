import { describe, expect, it } from 'vitest';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

describe('Triptych strategic Royal Command bridge', () => {
  it('stages DEPLOY_BANNER with deterministic banner custody', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    bridge.deployBanner(world, 'victoria', { x: 8, y: 11 });

    expect(bridge.drainTactical()).toEqual([{
      orderId: 'victoria-r1-o0',
      kind: 'deploy_banner',
      faction: 'victoria',
      bannerId: 'victoria-r1-o0-banner',
      cell: { x: 8, y: 11 },
      issuedRound: 1,
      commandCost: 1,
    }]);
  });

  it('stages REMOVE_BANNER against an existing banner id', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    bridge.removeBanner(world, 'victoria', 'banner-v-1');

    expect(bridge.drainTactical()).toEqual([{
      orderId: 'victoria-r1-o0',
      kind: 'remove_banner',
      faction: 'victoria',
      bannerId: 'banner-v-1',
      issuedRound: 1,
      commandCost: 1,
    }]);
  });

  it('stages BUILD_FORTIFICATION with deterministic fort custody', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    bridge.buildFortification(world, 'victoria', 'bastion', { x: 7, y: 11 });

    expect(bridge.drainTactical()).toEqual([{
      orderId: 'victoria-r1-o0',
      kind: 'build_fortification',
      faction: 'victoria',
      fortificationId: 'victoria-r1-o0-fort',
      fortificationKind: 'bastion',
      cell: { x: 7, y: 11 },
      issuedRound: 1,
      commandCost: 1,
    }]);
  });

  it('stages REPAIR_FORTIFICATION and ANNEX_TILE as Royal Commands', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    bridge.repairFortification(world, 'victoria', 'victoria-redoubt');
    bridge.annexTile(world, 'victoria', { x: 9, y: 11 });

    expect(bridge.drainTactical()).toEqual([
      {
        orderId: 'victoria-r1-o0',
        kind: 'repair_fortification',
        faction: 'victoria',
        fortificationId: 'victoria-redoubt',
        issuedRound: 1,
        commandCost: 1,
      },
      {
        orderId: 'victoria-r1-o1',
        kind: 'annex_tile',
        faction: 'victoria',
        cell: { x: 9, y: 11 },
        issuedRound: 1,
        commandCost: 1,
      },
    ]);
  });

  it('does not stage strategic orders beyond remaining Royal Commands', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();

    for (let x = 0; x < 5; x += 1) {
      bridge.annexTile(world, 'victoria', { x: 9 + x, y: 11 });
    }

    expect(bridge.peekTactical()).toHaveLength(4);
  });
});
