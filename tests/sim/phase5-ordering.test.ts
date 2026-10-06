import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../../src/sim';
import type { ScheduledAICommand, WorldState } from '../../src/sim';

function withCombat(world:WorldState,id:string,patch:Partial<WorldState['combat'][string]>):WorldState {
  return {...world,combat:{...world.combat,[id]:{...world.combat[id]!,...patch}}};
}

describe('Phase 5 tick ordering',()=>{
  it('keeps legacy pending AI commands inert and never generates new strategic commands from fixed ticks',()=>{
    let world=createWorld([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:10,y:10}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
    ],{aiFactions:['obsidian']});
    const pending:ScheduledAICommand={executeTick:0,command:{type:'move',sequence:1,issuedTick:-1,unitId:'opawn',to:{x:10,y:9}}};
    world={...world,ai:{...world.ai,obsidian:{...world.ai.obsidian,pendingCommands:[pending],nextEvaluationTick:10}}};

    const result=stepWorld(world,[]);

    expect(result.state.units.opawn!.position).toEqual({x:10,y:10});
    expect(result.state.ai.obsidian.pendingCommands).toEqual([pending]);

    const evalWorld=createWorld([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:10,y:10}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
    ],{aiFactions:['obsidian']});
    const evaluated=stepWorld(evalWorld,[]);
    expect(evaluated.state.ai.obsidian.pendingCommands).toEqual([]);
    expect(evaluated.state.units.opawn!.position).toEqual({x:10,y:10});
    expect(evaluated.events.some(e=>e.type==='ai.command.scheduled')).toBe(false);
  });

  it('resolves combat before ability activation and Hold then rejects same-tick hero movement',()=>{
    let world=createWorld([
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
      {id:'vpawn',faction:'victoria',kind:'pawn',position:{x:5,y:4}},
      {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:6,y:4}},
    ],{heroIds:{victoria:'vhero'}});
    world={...world,heroes:{...world.heroes,victoria:{...world.heroes.victoria,level:2}}};
    world=withCombat(world,'vpawn',{targetId:'opawn',cooldownTicks:0});
    const result=stepWorld(world,[
      {type:'hero_ability',sequence:1,issuedTick:0,faction:'victoria',heroId:'vhero',ability:'hold_the_crown'},
      {type:'move',sequence:2,issuedTick:0,unitId:'vhero',to:{x:4,y:5}},
    ]);
    const fired=result.events.find(e=>e.type==='attack.fired'&&e.unitId==='vpawn');
    expect(fired&&fired.type==='attack.fired'?fired.damage:0).toBe(8);
    expect(result.events.find(e=>e.type==='move.rejected')).toMatchObject({reason:'hero_anchored'});
    expect(result.state.heroes.victoria.abilities.hold_the_crown.activeTicksRemaining).toBe(30);
  });

  it('records hero defeat/XP after combat while preserving the fresh 120 respawn counter',()=>{
    let world=createWorld([
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
      {id:'orook',faction:'obsidian',kind:'rook',position:{x:5,y:4}},
    ],{heroIds:{victoria:'vhero'}});
    world=withCombat(world,'vhero',{health:18,targetId:'orook',cooldownTicks:0});
    world=withCombat(world,'orook',{health:16,targetId:'vhero',cooldownTicks:0});
    const result=stepWorld(world,[]);
    const types=result.events.map(e=>e.type);
    expect(types.indexOf('unit.killed')).toBeLessThan(types.indexOf('hero.defeated'));
    expect(result.state.heroes.victoria.respawnTicksRemaining).toBe(120);
    expect(result.state.heroes.victoria.xp).toBe(28);
  });

  it('King terminal outcome short-circuits hero lifecycle, economy, respawn, and AI evaluation',()=>{
    let world=createWorld([
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:2,y:1}},
      {id:'oking',faction:'obsidian',kind:'king',position:{x:3,y:1}},
    ],{heroIds:{victoria:'vhero'},aiFactions:['obsidian']});
    world=withCombat(world,'vking',{health:10,targetId:'oking',cooldownTicks:0});
    world=withCombat(world,'oking',{health:10,targetId:'vking',cooldownTicks:0});
    const result=stepWorld(world,[]);
    expect(result.state.match.status).toBe('draw');
    expect(result.events.some(e=>e.type==='hero.defeated')).toBe(false);
    expect(result.events.some(e=>e.type==='ai.evaluated')).toBe(false);
    expect(result.state.tick).toBe(0);
  });

  it('terminal worlds freeze hero/AI state and reject hero ability commands as match_ended',()=>{
    let world=createWorld([{id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}}],{heroIds:{victoria:'vhero'},aiFactions:['obsidian']});
    world={...world,match:{...world.match,status:'victoria_won',victor:'victoria',endedTick:0}};
    const result=stepWorld(world,[{type:'hero_ability',sequence:1,issuedTick:0,faction:'victoria',heroId:'vhero',ability:'royal_decree'}]);
    expect(result.state).toBe(world);
    expect(result.events[0]).toMatchObject({type:'hero.ability.rejected',reason:'match_ended'});
  });
});
