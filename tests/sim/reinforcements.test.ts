import { describe, expect, it } from 'vitest';
import { createWorld, deployReinforcements, findReinforcementSpawn } from '../../src/sim';
import type { ProductionQueueEntry, WorldState } from '../../src/sim';
const entry=(id='victoria-recruit-1',kind:'pawn'|'knight'|'bishop'|'rook'='pawn'):ProductionQueueEntry=>({id,faction:'victoria',unitKind:kind,cost:10,capacityWeight:kind==='pawn'?1:kind==='rook'?3:2,queuedTick:0});
function queued(world:WorldState, entries:ProductionQueueEntry[]):WorldState{return {...world,production:{...world.production,queues:{...world.production.queues,victoria:entries}}};}
describe('reinforcement resolution',()=>{
 it('deploys the legal queue head when explicitly resolved and uses the cross-board anchor first',()=>{let w=queued(createWorld(),[entry()]);const r=deployReinforcements({...w,tick:48});expect(r.events[0]).toMatchObject({type:'reinforcement.deployed',unitId:'unit:victoria-recruit-1',position:{x:7,y:14}});expect(r.state.combat['unit:victoria-recruit-1']).toBeDefined();});
 it('searches nearest legal cross-board cell deterministically and skips node centers',()=>{let w=createWorld([{id:'block',faction:'victoria',kind:'king',position:{x:7,y:14}}]);expect(findReinforcementSpawn(w,'victoria')).toEqual({x:6,y:13});const occupancy={...w.occupancy};for(let y=0;y<16;y++)for(let x=0;x<16;x++)occupancy[`${x},${y}`]='x';expect(findReinforcementSpawn({...w,occupancy},'victoria')).toBeNull();});
 it('keeps blocked head and prevents leapfrog',()=>{let w=queued(createWorld(),[entry(),{...entry('victoria-recruit-2'),id:'victoria-recruit-2'}]);const occupancy:Record<string,string>={};for(let y=0;y<16;y++)for(let x=0;x<16;x++)occupancy[`${x},${y}`]='x';const r=deployReinforcements({...w,tick:49,occupancy});expect(r.events).toEqual([]);expect(r.state.production.queues.victoria.map(e=>e.id)).toEqual(['victoria-recruit-1','victoria-recruit-2']);});
 it('keeps a relocked head queued without refund',()=>{let w=queued(createWorld(),[entry('victoria-recruit-1','knight')]);w={...w,tick:49,economy:{crownPower:{victoria:9,obsidian:0}}};const r=deployReinforcements(w);expect(r.events).toEqual([]);expect(r.state.production.queues.victoria).toHaveLength(1);expect(r.state.economy.crownPower.victoria).toBe(9);});

 it('blocks an over-capacity head after territory loss without deleting or refunding',()=>{
   const units=Array.from({length:6},(_,i)=>({id:`p${i}`,faction:'victoria' as const,kind:'pawn' as const,position:{x:i,y:0}}));
   let w=queued(createWorld(units),[entry()]);
   w={...w,tick:49,economy:{crownPower:{victoria:7,obsidian:0}}};
   const r=deployReinforcements(w);
   expect(r.events).toEqual([]); expect(r.state.production.queues.victoria).toHaveLength(1); expect(r.state.units).toEqual(w.units); expect(r.state.economy.crownPower.victoria).toBe(7);
 });
});
