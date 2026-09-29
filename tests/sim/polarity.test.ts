import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { getTileFactionControl } from '../../src/sim/territory';
import type { MoveOrder } from '../../src/sim/orders';
import type { UnitState } from '../../src/sim/types';
import {
  applyMaturePolarityFlips,
  getBannerState,
  getTilePolarity,
  queueBanner,
  resolveBannerProgress,
} from '../../src/sim/polarity';

const unit = (
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState => ({ id, faction, kind, position: { x, y } });

describe('Triptych banner polarity', () => {
  it('flips black to white or white to black only after two defended round boundaries', () => {
    let world = createWorld();
    const cell = { x: 11, y: 11 } as const;
    const initialPolarity = getTilePolarity(world, cell);

    world = queueBanner(world, {
      bannerId: 'banner-v-1',
      faction: 'victoria',
      cell,
    }).state;

    world = applyMaturePolarityFlips(resolveBannerProgress(world).state).state;
    expect(getTilePolarity(world, cell)).toBe(initialPolarity);

    world = applyMaturePolarityFlips(resolveBannerProgress(world).state).state;
    expect(getTilePolarity(world, cell)).toBe(
      initialPolarity === 'black' ? 'white' : 'black',
    );
  });

  it('never changes faction control when polarity flips', () => {
    let world = createWorld();
    const cell = { x: 11, y: 11 } as const;
    const factionBefore = getTileFactionControl(world, cell);

    world = queueBanner(world, {
      bannerId: 'banner-v-2',
      faction: 'victoria',
      cell,
    }).state;
    world = resolveBannerProgress(world).state;
    world = resolveBannerProgress(world).state;
    world = applyMaturePolarityFlips(world).state;

    expect(getTileFactionControl(world, cell)).toBe(factionBefore);
  });

  it('is not contested by adjacency or threat, only by a completed legal enemy landing', () => {
    let world = createWorld([
      unit('shadow-knight', 'obsidian', 'knight', 9, 10),
    ]);
    const cell = { x: 11, y: 11 } as const;

    world = queueBanner(world, {
      bannerId: 'banner-v-contest',
      faction: 'victoria',
      cell,
    }).state;

    world = resolveBannerProgress(world).state;
    expect(getBannerState(world, 'banner-v-contest')).toMatchObject({
      roundsHeld: 1,
      contestedBy: null,
    });

    const landing: MoveOrder = {
      orderId: 'contest-landing',
      kind: 'move',
      faction: 'obsidian',
      unitId: 'shadow-knight',
      destination: cell,
      issuedRound: 1,
      commandCost: 1,
    };

    const resolved = resolveCommittedOrders(world, [landing]);
    expect(resolved.outcomes[0]?.status).toBe('RESOLVED');
    expect(getBannerState(resolved.world, 'banner-v-contest')).toMatchObject({
      roundsHeld: 1,
      contestedBy: 'obsidian',
    });

    const afterBoundary = resolveBannerProgress(resolved.world).state;
    expect(getBannerState(afterBoundary, 'banner-v-contest')).toMatchObject({
      roundsHeld: 1,
      mature: false,
      contestedBy: 'obsidian',
    });
  });
});
