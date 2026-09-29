import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { getTileFactionControl } from '../../src/sim/territory';
import {
  applyMaturePolarityFlips,
  getTilePolarity,
  queueBanner,
  resolveBannerProgress,
} from '../../src/sim/polarity';

describe('Triptych banner polarity', () => {
  it('flips black to white or white to black only after two defended round boundaries', () => {
    let world = createWorld();
    const cell = { x: 7, y: 7 } as const;
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
    const cell = { x: 7, y: 7 } as const;
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
});
