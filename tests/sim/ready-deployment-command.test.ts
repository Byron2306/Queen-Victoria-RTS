import { describe, expect, it } from 'vitest';
import * as sim from '../../src/sim';
import { stepWorld } from '../../src/sim/step';
import type { Faction, ReadyDeployment, WorldState } from '../../src/sim/types';
import { createWorld, placeUnit } from '../../src/sim/world';

const ready=(faction:Faction,id=`${faction}-recruit-1`,unitKind:ReadyDeployment['unitKind']='pawn'):ReadyDeployment=>({
  id,faction,unitKind,cost:unitKind==='rook'?38:10,capacityWeight:unitKind==='rook'?3:1,queuedTick:0,readyRound:1,
});
function withReady(world:WorldState,faction:Faction,entries:readonly ReadyDeployment[]):WorldState{
  return {...world,production:{...world.production,ready:{...world.production.ready,[faction]:entries}}};
}
function deploy(world:WorldState,faction:Faction,readyId:string,to:{x:number;y:number}){
  const fn=(sim as typeof sim & {deployReadyUnit?:Function}).deployReadyUnit;
  expect(fn).toBeTypeOf('function');
  return fn!(world,faction,readyId,to) as {state:WorldState;events:readonly unknown[]};
}
function cmd(faction:Faction,readyId:string,to:{x:number;y:number}){
  return {type:'deploy_ready' as const,sequence:1,issuedTick:0,faction,readyId,to};
}

describe('explicit READY deployment command',()=>{
  it('deploys one READY entry with deterministic unit identity and canonical unit state',()=>{
    let world=createWorld([],{topologyId:'triptych-v2'});
    world=withReady(world,'victoria',[ready('victoria','victoria-recruit-1','rook'),ready('victoria','victoria-recruit-2')]);
    const result=deploy(world,'victoria','victoria-recruit-1',{x:3,y:16});
    expect(result.state.production.ready.victoria.map(e=>e.id)).toEqual(['victoria-recruit-2']);
    expect(result.state.units['unit:victoria-recruit-1']).toEqual({id:'unit:victoria-recruit-1',faction:'victoria',kind:'rook',position:{x:3,y:16}});
    expect(result.state.occupancy['3,16']).toBe('unit:victoria-recruit-1');
    expect(result.state.combat['unit:victoria-recruit-1']).toBeDefined();
    expect(result.state.military['unit:victoria-recruit-1']).toEqual({kills:0,rank:'recruit'});
    expect(result.events).toContainEqual(expect.objectContaining({type:'reinforcement.deployed',queueEntryId:'victoria-recruit-1',unitId:'unit:victoria-recruit-1'}));
  });

  it('costs zero Royal Commands through stepWorld',()=>{
    let world=createWorld([],{topologyId:'triptych-v2'});
    world=withReady(world,'victoria',[ready('victoria')]);
    const before=world.turn.royalCommandsRemaining.victoria;
    const next=stepWorld(world,[cmd('victoria','victoria-recruit-1',{x:3,y:16}) as never]).state;
    expect(next.turn.royalCommandsRemaining.victoria).toBe(before);
    expect(next.units['unit:victoria-recruit-1']).toBeDefined();
  });

  it('rejects outside-zone and occupied cells without consuming READY',()=>{
    let world=createWorld([],{topologyId:'triptych-v2'});
    world=withReady(world,'victoria',[ready('victoria')]);
    const outside=deploy(world,'victoria','victoria-recruit-1',{x:6,y:16});
    expect(outside.state.production.ready.victoria).toHaveLength(1);
    expect(outside.events).toContainEqual(expect.objectContaining({type:'reinforcement.deployment_rejected',reason:'outside_deployment_zone'}));

    world=placeUnit(world,{id:'blocker',faction:'victoria',kind:'pawn',position:{x:3,y:16}});
    const occupied=deploy(world,'victoria','victoria-recruit-1',{x:3,y:16});
    expect(occupied.state.production.ready.victoria).toHaveLength(1);
    expect(occupied.events).toContainEqual(expect.objectContaining({type:'reinforcement.deployment_rejected',reason:'occupied_cell'}));
  });

  it('rejects wrong faction and missing READY id without changing Crown',()=>{
    let world=createWorld([],{topologyId:'triptych-v2'});
    world=withReady(world,'victoria',[ready('victoria')]);
    world={...world,economy:{crownPower:{victoria:77,obsidian:33}}};
    const wrong=deploy(world,'obsidian','victoria-recruit-1',{x:28,y:15});
    const missing=deploy(world,'victoria','missing',{x:3,y:16});
    for(const result of [wrong,missing]){
      expect(result.state.production.ready.victoria).toHaveLength(1);
      expect(result.state.economy.crownPower).toEqual(world.economy.crownPower);
    }
    expect(wrong.events).toContainEqual(expect.objectContaining({reason:'wrong_faction'}));
    expect(missing.events).toContainEqual(expect.objectContaining({reason:'missing_ready_entry'}));
  });

  it('enforces faction command phase and permits Obsidian in shadow_command',()=>{
    let victoria=createWorld([],{topologyId:'triptych-v2'});
    victoria=withReady(victoria,'victoria',[ready('victoria')]);
    const bad=stepWorld({...victoria,turn:{...victoria.turn,phase:'shadow_command'}},[cmd('victoria','victoria-recruit-1',{x:3,y:16}) as never]);
    expect(bad.state.production.ready.victoria).toHaveLength(1);
    expect(bad.events).toContainEqual(expect.objectContaining({type:'reinforcement.deployment_rejected',reason:'wrong_phase'}));

    let obsidian=createWorld([],{topologyId:'triptych-v2'});
    obsidian=withReady(obsidian,'obsidian',[ready('obsidian')]);
    obsidian={...obsidian,turn:{...obsidian.turn,phase:'shadow_command'}};
    const good=stepWorld(obsidian,[cmd('obsidian','obsidian-recruit-1',{x:28,y:15}) as never]);
    expect(good.state.production.ready.obsidian).toHaveLength(0);
    expect(good.state.units['unit:obsidian-recruit-1']).toBeDefined();
  });
});
