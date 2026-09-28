import { describe, expect, it } from 'vitest';
import { createWorld, heroLevelForXp, interpretHeroCombat } from '../../src/sim';
import type { SimEvent, WorldState } from '../../src/sim';

function withHealth(world: WorldState, id: string, health: number): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, health } } };
}

describe('hero progression', () => {
  it('uses exact XP thresholds', () => {
    expect([0,39,40,99,100,179,180,279,280,999].map(heroLevelForXp)).toEqual([1,1,2,2,3,3,4,4,5,5]);
  });

  it('grants nearby death XP without last-hit and excludes Kings/out-of-range deaths', () => {
    const units = [
      { id:'vhero', faction:'victoria' as const, kind:'queen' as const, position:{x:4,y:4}},
      { id:'pawn-near', faction:'obsidian' as const, kind:'pawn' as const, position:{x:9,y:4}},
      { id:'rook-far', faction:'obsidian' as const, kind:'rook' as const, position:{x:12,y:12}},
      { id:'oking', faction:'obsidian' as const, kind:'king' as const, position:{x:8,y:8}},
    ];
    const before=createWorld(units,{heroIds:{victoria:'vhero'}});
    const after={...before, units:{vhero:before.units.vhero!}, combat:{vhero:before.combat.vhero!}, occupancy:{'4,4':'vhero'}};
    const events: SimEvent[]=[
      {type:'unit.killed',tick:0,unitId:'pawn-near',byUnitIds:['someone'],positionalBonusApplied:false},
      {type:'unit.killed',tick:0,unitId:'rook-far',byUnitIds:['someone'],positionalBonusApplied:false},
      {type:'unit.killed',tick:0,unitId:'oking',byUnitIds:['someone'],positionalBonusApplied:false},
    ];
    const result=interpretHeroCombat(before,after,events);
    expect(result.state.heroes.victoria.xp).toBe(10);
    expect(result.events.filter(e=>e.type==='hero.xp_gained')).toHaveLength(1);
  });

  it('preserves same-resolution XP when hero dies and starts exact 120 tick respawn', () => {
    const before=createWorld([
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
      {id:'orook',faction:'obsidian',kind:'rook',position:{x:5,y:4}},
    ],{heroIds:{victoria:'vhero'}});
    const after={...before, units:{}, combat:{}, occupancy:{}};
    const events: SimEvent[]=[
      {type:'unit.killed',tick:0,unitId:'vhero',byUnitIds:['orook'],positionalBonusApplied:false},
      {type:'unit.killed',tick:0,unitId:'orook',byUnitIds:['vhero'],positionalBonusApplied:false},
    ];
    const result=interpretHeroCombat(before,after,events);
    expect(result.state.heroes.victoria).toMatchObject({status:'respawning',respawnTicksRemaining:120,xp:28,level:1,activeAbility:null});
    expect(result.events.map(e=>e.type)).toEqual(['hero.defeated','hero.xp_gained']);
  });

  it('emits each crossed level in ascending order without healing or resetting cooldowns', () => {
    const base=createWorld([
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
      {id:'q1',faction:'obsidian',kind:'queen',position:{x:5,y:4}},
      {id:'q2',faction:'obsidian',kind:'queen',position:{x:6,y:4}},
      {id:'r1',faction:'obsidian',kind:'rook',position:{x:7,y:4}},
    ],{heroIds:{victoria:'vhero'}});
    const before={...base, heroes:{...base.heroes,victoria:{...base.heroes.victoria,xp:30,abilities:{...base.heroes.victoria.abilities,royal_decree:{cooldownTicksRemaining:77,activeTicksRemaining:0}}}}, combat:{...base.combat,vhero:{...base.combat.vhero!,health:73}}};
    const after={...before, units:{vhero:before.units.vhero!}, combat:{vhero:before.combat.vhero!}, occupancy:{'4,4':'vhero'}};
    const killed=(id:string): SimEvent => ({type:'unit.killed',tick:0,unitId:id,byUnitIds:['x'],positionalBonusApplied:false});
    const result=interpretHeroCombat(before,after,[killed('q1'),killed('q2'),killed('r1')]);
    expect(result.state.heroes.victoria.xp).toBe(138);
    expect(result.state.heroes.victoria.level).toBe(3);
    expect(result.state.heroes.victoria.abilities.royal_decree.cooldownTicksRemaining).toBe(77);
    expect(result.state.combat.vhero!.health).toBe(73);
    expect(result.events.filter(e=>e.type==='hero.leveled').map(e=>e.type==='hero.leveled' ? e.toLevel : 0)).toEqual([2,3]);
  });
});
