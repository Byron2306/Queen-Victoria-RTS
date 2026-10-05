import { describe, expect, it } from 'vitest';

import * as sim from '../../src/sim';
import {
  commandsForCommitments,
  legalDeploymentCells,
} from '../../src/sim';
import type {
  Faction,
  ReadyDeployment,
  WorldState,
} from '../../src/sim';
import { createWorld, placeUnit } from '../../src/sim/world';

const ready=(faction:Faction,id=`${faction}-recruit-1`):ReadyDeployment=>({
  id,
  faction,
  unitKind:'pawn',
  cost:10,
  capacityWeight:1,
  queuedTick:0,
  readyRound:1,
});

function withReady(
  world:WorldState,
  faction:Faction,
  entries:readonly ReadyDeployment[],
):WorldState{
  return {
    ...world,
    production:{
      ...world.production,
      ready:{
        ...world.production.ready,
        [faction]:entries,
      },
    },
  };
}

function selectCell(
  world:WorldState,
  faction:Faction,
  readyId:string,
){
  const fn=(sim as typeof sim & {
    selectAIReadyDeploymentCell?:(
      candidate:WorldState,
      side:Faction,
      id:string,
    )=>{x:number;y:number}|null;
  }).selectAIReadyDeploymentCell;
  expect(fn).toBeTypeOf('function');
  return fn!(world,faction,readyId);
}

describe('AI READY deployment parity',()=>{
  it('selects only from canonical legal deployment cells',()=>{
    let world=createWorld([],{topologyId:'triptych-v2',aiFactions:['obsidian']});
    world=withReady(world,'obsidian',[ready('obsidian')]);
    world=placeUnit(world,{
      id:'blocker',
      faction:'obsidian',
      kind:'pawn',
      position:{x:26,y:16},
    });

    const legal=legalDeploymentCells(world,'obsidian','obsidian-recruit-1');
    const selected=selectCell(world,'obsidian','obsidian-recruit-1');

    expect(selected).not.toBeNull();
    expect(legal).toContainEqual(selected);
    expect(selected).not.toEqual({x:26,y:16});
  });

  it('is deterministic and uses stable coordinate tie-breaking',()=>{
    let world=createWorld([],{topologyId:'triptych-v2',aiFactions:['obsidian']});
    world=withReady(world,'obsidian',[ready('obsidian')]);
    world=placeUnit(world,{
      id:'blocker',
      faction:'obsidian',
      kind:'pawn',
      position:{x:26,y:16},
    });

    const a=selectCell(world,'obsidian','obsidian-recruit-1');
    const b=selectCell(world,'obsidian','obsidian-recruit-1');

    expect(a).toEqual(b);
    expect(a).toEqual({x:26,y:13});
  });

  it('emits deploy_ready through the normal AI command generator',()=>{
    let world=createWorld([],{topologyId:'triptych-v2',aiFactions:['obsidian']});
    world=withReady(world,'obsidian',[ready('obsidian')]);
    world={
      ...world,
      turn:{
        ...world.turn,
        phase:'shadow_command',
      },
    };

    const commands=commandsForCommitments(world,'obsidian',[]);
    expect(commands).toContainEqual(expect.objectContaining({
      type:'deploy_ready',
      faction:'obsidian',
      readyId:'obsidian-recruit-1',
    }));
  });

  it('emits no fallback deployment when every canonical cell is blocked',()=>{
    let world=createWorld([],{topologyId:'triptych-v2',aiFactions:['obsidian']});
    world=withReady(world,'obsidian',[ready('obsidian')]);

    for(const cell of legalDeploymentCells(world,'obsidian','obsidian-recruit-1')){
      world=placeUnit(world,{
        id:`block-${cell.x}-${cell.y}`,
        faction:'obsidian',
        kind:'pawn',
        position:cell,
      });
    }

    expect(selectCell(world,'obsidian','obsidian-recruit-1')).toBeNull();
    expect(commandsForCommitments(world,'obsidian',[])
      .some(command=>command.type==='deploy_ready')).toBe(false);
    expect(world.production.ready.obsidian).toHaveLength(1);
  });
});
