import type { Faction, WorldState } from './types';

export type StrategicAbilityModifiers = Readonly<{
  supportPressureBps: number;
  fortificationDurabilityBonus: number;
  bannerProgressBonus: number;
}>;

const NEUTRAL_MODIFIERS: StrategicAbilityModifiers = {
  supportPressureBps: 10000,
  fortificationDurabilityBonus: 0,
  bannerProgressBonus: 0,
};

export function strategicAbilityModifiers(
  world: WorldState,
  faction: Faction,
): StrategicAbilityModifiers {
  // These are Victoria's doctrine abilities. Shadow can gain its own doctrine
  // table later without silently inheriting royal effects.
  if (faction !== 'victoria') return NEUTRAL_MODIFIERS;

  const hero = world.heroes[faction];
  if (
    hero.status !== 'alive' ||
    !hero.heroUnitId ||
    !world.units[hero.heroUnitId] ||
    !hero.activeAbility
  ) {
    return NEUTRAL_MODIFIERS;
  }

  switch (hero.activeAbility) {
    case 'royal_decree':
      return {
        ...NEUTRAL_MODIFIERS,
        supportPressureBps: 11500,
      };

    case 'hold_the_crown':
      return {
        ...NEUTRAL_MODIFIERS,
        fortificationDurabilityBonus: 1,
      };

    case 'sovereign_line':
      return {
        ...NEUTRAL_MODIFIERS,
        supportPressureBps: 11000,
      };

    case 'imperial_gambit':
      return {
        ...NEUTRAL_MODIFIERS,
        bannerProgressBonus: 1,
      };
  }
}
