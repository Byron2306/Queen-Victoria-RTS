import { describe, expect, it } from 'vitest';
import { advanceHeroRespawn, attemptHeroRespawns, createWorld, interpretHeroCombat } from '../../src/sim';
import type { SimEvent, WorldState } from '../../src/sim';

function defeated(): WorldState {
  const before=createWorld([
    {id:'vhero',faction:'victoria',kind:'queen',position:{x:4,y:4}},
    {id:'orook',faction:'obsidian',kind:'rook',position:{x:5,y:4}},
  ],{heroIds:{victoria:'vhero'}});
  const after={...before,units:{orook:before.units.orook!},combat:{orook:before.combat.orook!},occupancy:{'5,4':'orook'}};
  const events:SimEvent[]=[{type:'unit.killed',tick:0,unitId:'vhero',byUnitIds:['orook'],positionalBonusApplied:false}];
  return interpretHeroCombat(before,after,events).state;
}

describe('hero respawn',()=>{
  it('preserves the full 120 creation-tick timer, then decrements once per later tick',()=>{
    const world=defeated();
    expect(advanceHeroRespawn(world,new Set(['victoria'])).state.heroes.victoria.respawnTicksRemaining).toBe(120);
    expect(advanceHeroRespawn(world).state.heroes.victoria.respawnTicksRemaining).toBe(119);
  });

  it('respawns same hero id at full queen health using deterministic reinforcement spawn',()=>{
    let world=defeated();
    world={...world,heroes:{...world.heroes,victoria:{...world.heroes.victoria,respawnTicksRemaining:0}}};
    const result=attemptHeroRespawns(world);
    const hero=result.state.heroes.victoria;
    expect(hero.status).toBe('alive');
    expect(result.state.units.vhero).toMatchObject({id:'vhero',faction:'victoria',kind:'queen'});
    expect(result.state.combat.vhero).toMatchObject({health:180,targetId:null,stance:'guard'});
    expect(result.state.combat.vhero!.guardAnchor).toEqual(result.state.units.vhero!.position);
    expect(result.events[0]?.type).toBe('hero.respawned');
  });

  it('emits ready once while blocked and retries until space opens',()=>{
    let world=defeated();
    const occupied:Record<string,string>={};
    for(let y=0;y<16;y+=1) for(let x=0;x<16;x+=1) occupied[`${x},${y}`]=`block-${x}-${y}`;
    world={...world,occupancy:occupied,heroes:{...world.heroes,victoria:{...world.heroes.victoria,respawnTicksRemaining:0}}};
    const blocked=attemptHeroRespawns(world);
    expect(blocked.state.heroes.victoria.status).toBe('ready_to_respawn');
    expect(blocked.events.map(e=>e.type)).toEqual(['hero.respawn.ready']);
    const again=attemptHeroRespawns(blocked.state);
    expect(again.events).toHaveLength(0);
    const opened={...again.state,occupancy:{...again.state.occupancy}};
    delete (opened.occupancy as Record<string,string>)['1,1'];
    const returned=attemptHeroRespawns(opened);
    expect(returned.events[0]?.type).toBe('hero.respawned');
    expect(returned.state.units.vhero!.position).toEqual({x:1,y:1});
  });
});
