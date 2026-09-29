import { describe, expect, it } from 'vitest';
import {
  commandsForCommitments, createWorld, scheduleAICommands, selectPriorityTarget, validateMoveGeometry,
} from '../../src/sim';
import type { StrategicCommitment, WorldState } from '../../src/sim';

const commitment=(intention:StrategicCommitment['intention'],objectiveId:string):StrategicCommitment=>({intention,objectiveId,startedTick:0,expiresTick:30,score:100});

describe('balanced AI tactics',()=>{
  it('prioritizes immediate King opportunity, then hero, rook, minor pieces, health/distance/id',()=>{
    let world=createWorld([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:10,y:10}},
      {id:'orook',faction:'obsidian',kind:'rook',position:{x:3,y:3}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:3,y:6}},
      {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:3}},
      {id:'vrook',faction:'victoria',kind:'rook',position:{x:5,y:3}},
      {id:'vpawn',faction:'victoria',kind:'pawn',position:{x:6,y:3}},
    ],{heroIds:{victoria:'vhero'},aiFactions:['obsidian']});
    expect(selectPriorityTarget(world,'obsidian','orook')).toBe('vking');
    world={...world,units:{...world.units,vking:{...world.units.vking!,position:{x:14,y:1}}}};
    expect(selectPriorityTarget(world,'obsidian','orook')).toBe('vhero');
  });

  it('creates legal objective-progress movement and caps an evaluation at six ordinary commands',()=>{
    const world=createWorld([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'or1',faction:'obsidian',kind:'rook',position:{x:10,y:10}},
      {id:'on1',faction:'obsidian',kind:'knight',position:{x:11,y:10}},
      {id:'ob1',faction:'obsidian',kind:'bishop',position:{x:12,y:10}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
      {id:'vp1',faction:'victoria',kind:'pawn',position:{x:8,y:8}},
    ],{aiFactions:['obsidian']});
    const commands=commandsForCommitments(world,'obsidian',[
      commitment('capture_node','crown'),commitment('pressure_position','vp1'),commitment('attack_king','vking'),
    ]);
    expect(commands.length).toBeLessThanOrEqual(6);
    for(const command of commands) expect(['move','attack','recruit','promote','hero_ability']).toContain(command.type);
    const move=commands.find(c=>c.type==='move');
    if(move?.type==='move') expect(validateMoveGeometry(world,world.units[move.unitId]!,move.to).legal).toBe(true);
  });

  it('schedules commands for exactly next tick and advances ordinal only by scheduled count',()=>{
    const world=createWorld([{id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}}],{aiFactions:['obsidian']});
    const commands=[{type:'move' as const,sequence:1,issuedTick:0,unitId:'oking',to:{x:13,y:14}}];
    const result=scheduleAICommands(world,'obsidian',commands);
    expect(result.state.ai.obsidian.pendingCommands[0]?.executeTick).toBe(1);
    expect(result.state.ai.obsidian.nextCommandOrdinal).toBe(2);
    expect(result.events[0]).toMatchObject({type:'ai.command.scheduled',executeTick:1,commandType:'move'});
  });

  it('can spend the same command budget on a legal hero cast rather than a free extra channel',()=>{
    let world=createWorld([
      {id:'ohero',faction:'obsidian',kind:'queen',position:{x:10,y:10}},
      {id:'oa',faction:'obsidian',kind:'rook',position:{x:11,y:10}},
      {id:'ob',faction:'obsidian',kind:'bishop',position:{x:10,y:11}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:6,y:6}},
    ],{heroIds:{obsidian:'ohero'},aiFactions:['obsidian']});
    world={...world,heroes:{...world.heroes,obsidian:{...world.heroes.obsidian,level:5}}};
    const commands=commandsForCommitments(world,'obsidian',[commitment('pressure_position','vking')]);
    expect(commands.length).toBeLessThanOrEqual(6);
    expect(commands.some(c=>c.type==='hero_ability')).toBe(true);
  });
});

describe('balanced AI hero-use heuristics',()=>{
  function heroWorld(level:1|2|3|4|5, extra:Parameters<typeof createWorld>[0]=[]):WorldState {
    let world=createWorld([
      {id:'ohero',faction:'obsidian',kind:'queen',position:{x:10,y:10}},
      {id:'oa',faction:'obsidian',kind:'rook',position:{x:11,y:10}},
      {id:'ob',faction:'obsidian',kind:'bishop',position:{x:12,y:10}},
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:7,y:7}},
      ...extra,
    ],{heroIds:{obsidian:'ohero'},aiFactions:['obsidian']});
    return {...world,heroes:{...world.heroes,obsidian:{...world.heroes.obsidian,level}}};
  }

  it('uses Royal Decree only with an offensive commitment and useful nearby allies',()=>{
    const world=heroWorld(1);
    const commands=commandsForCommitments(world,'obsidian',[commitment('pressure_position','vking')]);
    expect(commands.find(c=>c.type==='hero_ability')).toMatchObject({type:'hero_ability',ability:'royal_decree'});
  });

  it('uses Hold the Crown for an explicit defend_king commitment',()=>{
    const world=heroWorld(2,[{id:'vThreat',faction:'victoria',kind:'rook',position:{x:14,y:10}}]);
    const commands=commandsForCommitments(world,'obsidian',[commitment('defend_king','oking')]);
    expect(commands.find(c=>c.type==='hero_ability')).toMatchObject({type:'hero_ability',ability:'hold_the_crown'});
  });

  it('uses Sovereign Line only when the existing allied formation qualifies',()=>{
    const world=heroWorld(3);
    const commands=commandsForCommitments(world,'obsidian',[commitment('pressure_position','vking')]);
    expect(commands.find(c=>c.type==='hero_ability')).toMatchObject({type:'hero_ability',ability:'sovereign_line'});
  });

  it('uses Imperial Gambit only when local force is favourable and the enemy sovereign is meaningfully close and observed',()=>{
    const world=heroWorld(5);
    const commands=commandsForCommitments(world,'obsidian',[commitment('attack_king','vking')]);
    expect(commands.find(c=>c.type==='hero_ability')).toMatchObject({type:'hero_ability',ability:'imperial_gambit'});
  });
});