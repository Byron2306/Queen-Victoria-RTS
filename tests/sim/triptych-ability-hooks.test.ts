import { describe, expect, it } from 'vitest';
import { buildFortification, getFortificationAt } from '../../src/sim/fortifications';
import { queueBanner, resolveBannerProgress, getBannerState } from '../../src/sim/polarity';
import { supportPressureForChain, type SupportChain } from '../../src/sim/support';
import { resolveSettlement } from '../../src/sim/territory';
import { createWorld } from '../../src/sim/world';
import type { HeroAbilityId, UnitState, WorldState } from '../../src/sim/types';

const unit = (
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState => ({ id, faction, kind, position: { x, y } });

function withVictoriaAbility(world: WorldState, ability: HeroAbilityId): WorldState {
  return {
    ...world,
    heroes: {
      ...world.heroes,
      victoria: {
        ...world.heroes.victoria,
        heroUnitId: 'victoria-queen',
        status: 'alive',
        level: 5,
        activeAbility: ability,
        abilities: {
          ...world.heroes.victoria.abilities,
          [ability]: {
            cooldownTicksRemaining: 10,
            activeTicksRemaining: 10,
          },
        },
      },
    },
  };
}

describe('Victoria abilities modify shared Triptych verbs', () => {
  it.each([
    'royal_decree',
    'sovereign_line',
  ] as const)('%s increases committed reinforcement pressure instead of creating a parallel combat system', (ability) => {
    const units = [
      unit('victoria-queen', 'victoria', 'queen', 4, 4),
      unit('support-rook', 'victoria', 'rook', 4, 6),
      unit('root-knight', 'victoria', 'knight', 5, 5),
      unit('shadow-pawn', 'obsidian', 'pawn', 7, 6),
    ];
    const baseline = createWorld(units);
    const empowered = withVictoriaAbility(createWorld(units), ability);
    const chain: SupportChain = {
      rootOrderId: 'assault-root',
      rootUnitId: 'root-knight',
      targetUnitId: 'shadow-pawn',
      links: [{
        orderId: 'support-1',
        unitId: 'support-rook',
        supportedUnitId: 'root-knight',
        depth: 1,
        contributionBps: 10000,
      }],
    };

    expect(supportPressureForChain(empowered, chain))
      .toBeGreaterThan(supportPressureForChain(baseline, chain));
  });

  it('Hold the Crown hardens a newly built fortification on friendly territory', () => {
    const cell = { x: 7, y: 10 } as const;
    let baseline = resolveSettlement(createWorld([
      unit('victoria-queen', 'victoria', 'queen', 6, 10),
      unit('builder', 'victoria', 'pawn', cell.x, cell.y),
    ]));
    let fortified = withVictoriaAbility(baseline, 'hold_the_crown');

    baseline = buildFortification(baseline, {
      id: 'baseline-wall', faction: 'victoria', cell,
    }).state;
    fortified = buildFortification(fortified, {
      id: 'royal-wall', faction: 'victoria', cell,
    }).state;

    expect(getFortificationAt(fortified, cell)?.durability)
      .toBeGreaterThan(getFortificationAt(baseline, cell)?.durability ?? 0);
  });

  it('Imperial Gambit accelerates the existing banner hold clock without changing faction ownership', () => {
    const cell = { x: 11, y: 11 } as const;
    let baseline = createWorld([
      unit('victoria-queen', 'victoria', 'queen', 11, 10),
    ]);
    let gambit = withVictoriaAbility(baseline, 'imperial_gambit');

    baseline = queueBanner(baseline, {
      bannerId: 'baseline-banner', faction: 'victoria', cell,
    }).state;
    gambit = queueBanner(gambit, {
      bannerId: 'gambit-banner', faction: 'victoria', cell,
    }).state;

    baseline = resolveBannerProgress(baseline).state;
    gambit = resolveBannerProgress(gambit).state;

    expect(getBannerState(baseline, 'baseline-banner')?.mature).toBe(false);
    expect(getBannerState(gambit, 'gambit-banner')?.mature).toBe(true);
  });
});
