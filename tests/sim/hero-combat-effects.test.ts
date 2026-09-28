import { describe, expect, it } from 'vitest';
import {
  activateHeroAbility, createWorld, effectiveAttackRange, effectiveCooldownReload,
  effectiveGuardRanges, incomingHeroDamageBps, outgoingHeroDamageBps, resolveCombatTick, stepWorld,
} from '../../src/sim';
import type { HeroAbilityId, WorldState } from '../../src/sim';

function base(level:1|2|3|4|5=5): WorldState {
  let world=createWorld([
    {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
    {id:'vpawn',faction:'victoria',kind:'pawn',position:{x:5,y:4}},
    {id:'vline',faction:'victoria',kind:'rook',position:{x:7,y:4}},
    {id:'vbishop',faction:'victoria',kind:'bishop',position:{x:6,y:6}},
    {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:6,y:4}},
  ],{heroIds:{victoria:'vhero'}});
  world={...world,heroes:{...world.heroes,victoria:{...world.heroes.victoria,level}}};
  return world;
}
function active(world:WorldState,ability:HeroAbilityId):WorldState {
  return activateHeroAbility(world,{type:'hero_ability',sequence:1,issuedTick:world.tick,faction:'victoria',heroId:'vhero',ability}).state;
}

describe('derived hero combat effects',()=>{
  it('derives Royal Decree damage/radius and Guard responsiveness, including hero self aura',()=>{
    let world=active(base(3),'royal_decree');
    expect(outgoingHeroDamageBps(world,'vhero')).toBe(11500);
    expect(outgoingHeroDamageBps(world,'vpawn')).toBe(11500);
    expect(effectiveGuardRanges(world,'vpawn')).toMatchObject({acquisitionRange:4,leashRange:5});
    world=active(base(4),'royal_decree');
    expect(outgoingHeroDamageBps(world,'vpawn')).toBe(12000);
  });

  it('derives Hold reductions and movement lock without blocking attacks',()=>{
    const world=active(base(4),'hold_the_crown');
    expect(incomingHeroDamageBps(world,'vhero')).toBe(5000);
    expect(incomingHeroDamageBps(world,'vpawn')).toBe(7500);
    expect(effectiveGuardRanges(world,'vpawn').leashRange).toBe(6);
    const moved=stepWorld(world,[{type:'move',sequence:1,issuedTick:0,unitId:'vhero',to:{x:4,y:5}}]);
    expect(moved.events.find(e=>e.type==='move.rejected')).toMatchObject({reason:'hero_anchored'});
  });

  it('derives Sovereign Line membership dynamically',()=>{
    const world=active(base(4),'sovereign_line');
    expect(effectiveAttackRange(world,'vline')).toBe(6);
    expect(outgoingHeroDamageBps(world,'vline')).toBe(11500);
    expect(outgoingHeroDamageBps(world,'vpawn')).toBe(11500);
    expect(outgoingHeroDamageBps(world,'vhero')).toBe(10000);
  });

  it('derives Gambit offense, vulnerability, and only new cooldown reloads',()=>{
    const world=active(base(5),'imperial_gambit');
    expect(outgoingHeroDamageBps(world,'vpawn')).toBe(13000);
    expect(incomingHeroDamageBps(world,'vhero')).toBe(13000);
    expect(effectiveCooldownReload(world,'vpawn')).toBe(7);
    const prior={...world,combat:{...world.combat,vpawn:{...world.combat.vpawn!,cooldownTicks:6}}};
    expect(resolveCombatTick(prior).state.combat.vpawn!.cooldownTicks).toBe(5);
  });

  it('applies positional then outgoing then incoming modifiers with integer normalization',()=>{
    let world=active(base(3),'royal_decree');
    world={...world,combat:{...world.combat,vpawn:{...world.combat.vpawn!,targetId:'opawn'},opawn:{...world.combat.opawn!,health:60}}};
    const result=resolveCombatTick(world);
    const fired=result.events.find(e=>e.type==='attack.fired' && e.unitId==='vpawn');
    expect(fired && fired.type==='attack.fired' ? fired.damage : 0).toBeGreaterThan(8);
  });
});
