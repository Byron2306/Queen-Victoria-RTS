import { describe, expect, it } from 'vitest';
import { activateHeroAbility, advanceHeroAbilityLifecycle, createWorld, qualifiesForSovereignLine } from '../../src/sim';
import type { HeroAbilityCommand, WorldState } from '../../src/sim';

function command(ability: HeroAbilityCommand['ability'], heroId='vhero'): HeroAbilityCommand {
  return { type:'hero_ability', sequence:1, issuedTick:0, faction:'victoria', heroId, ability };
}
function heroWorld(level:1|2|3|4|5=1): WorldState {
  const base=createWorld([
    {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
    {id:'ally-rank',faction:'victoria',kind:'rook',position:{x:6,y:4}},
    {id:'ally-diag',faction:'victoria',kind:'bishop',position:{x:6,y:6}},
  ],{heroIds:{victoria:'vhero'}});
  return {...base,heroes:{...base.heroes,victoria:{...base.heroes.victoria,level}}};
}

describe('hero abilities',()=>{
  it('enforces level unlocks and exact full activation counters',()=>{
    const low=activateHeroAbility(heroWorld(1),command('hold_the_crown'));
    expect(low.events[0]).toMatchObject({type:'hero.ability.rejected',reason:'locked_level'});
    const cast=activateHeroAbility(heroWorld(1),command('royal_decree'));
    expect(cast.state.heroes.victoria.activeAbility).toBe('royal_decree');
    expect(cast.state.heroes.victoria.abilities.royal_decree).toEqual({cooldownTicksRemaining:120,activeTicksRemaining:40});
    expect(cast.events[0]).toMatchObject({type:'hero.ability.activated',activeTicks:40,cooldownTicks:120});
  });

  it('rejects wrong/dead/cooling/active heroes deterministically',()=>{
    const world=heroWorld(5);
    expect(activateHeroAbility(world,command('royal_decree','other')).events[0]).toMatchObject({reason:'wrong_hero'});
    const dead={...world,heroes:{...world.heroes,victoria:{...world.heroes.victoria,status:'respawning' as const}}};
    expect(activateHeroAbility(dead,command('royal_decree')).events[0]).toMatchObject({reason:'hero_not_alive'});
    const cooling={...world,heroes:{...world.heroes,victoria:{...world.heroes.victoria,abilities:{...world.heroes.victoria.abilities,royal_decree:{cooldownTicksRemaining:2,activeTicksRemaining:0}}}}};
    expect(activateHeroAbility(cooling,command('royal_decree')).events[0]).toMatchObject({reason:'cooldown_active'});
    const active=activateHeroAbility(world,command('royal_decree')).state;
    expect(activateHeroAbility(active,command('imperial_gambit')).events[0]).toMatchObject({reason:'ability_active'});
  });

  it('requires a real aligned Sovereign Line formation',()=>{
    expect(qualifiesForSovereignLine(heroWorld(3),'victoria')).toBe(true);
    const sparse=createWorld([{id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}}],{heroIds:{victoria:'vhero'}});
    const leveled={...sparse,heroes:{...sparse.heroes,victoria:{...sparse.heroes.victoria,level:3 as const}}};
    expect(qualifiesForSovereignLine(leveled,'victoria')).toBe(false);
    expect(activateHeroAbility(leveled,command('sovereign_line')).events[0]).toMatchObject({reason:'formation_missing'});
  });

  it('does not decrement creation-tick counters, then expires exactly once',()=>{
    const cast=activateHeroAbility(heroWorld(1),command('royal_decree')).state;
    const skipped=advanceHeroAbilityLifecycle(cast,new Set(['victoria']));
    expect(skipped.state.heroes.victoria.abilities.royal_decree).toEqual({cooldownTicksRemaining:120,activeTicksRemaining:40});
    let state={...cast,heroes:{...cast.heroes,victoria:{...cast.heroes.victoria,abilities:{...cast.heroes.victoria.abilities,royal_decree:{cooldownTicksRemaining:81,activeTicksRemaining:1}}}}};
    const expired=advanceHeroAbilityLifecycle(state);
    expect(expired.state.heroes.victoria.activeAbility).toBeNull();
    expect(expired.state.heroes.victoria.abilities.royal_decree).toEqual({cooldownTicksRemaining:80,activeTicksRemaining:0});
    expect(expired.events).toHaveLength(1);
    expect(expired.events[0]?.type).toBe('hero.ability.expired');
    expect(advanceHeroAbilityLifecycle(expired.state).events).toHaveLength(0);
  });
});
