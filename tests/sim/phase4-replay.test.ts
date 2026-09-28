import { describe, expect, it } from 'vitest';
import { canonicalSnapshot, createWorld, runReplay } from '../../src/sim';
import type { SimCommand, UnitState, WorldState } from '../../src/sim';
const unit=(id:string,kind:UnitState['kind'],faction:UnitState['faction'],x:number,y:number):UnitState=>({id,kind,faction,position:{x,y}});
function phase4Initial():WorldState {
  let w=createWorld([unit('fighter','pawn','victoria',3,3),unit('victim','pawn','obsidian',3,4),unit('promo','pawn','victoria',5,14)]);
  const nodes={...w.territory.nodes}; for(const id of ['minor-ne','minor-w','minor-e'])nodes[id]={...nodes[id]!,owner:'victoria'};
  nodes['minor-nw']={...nodes['minor-nw']!,capturingFaction:'victoria',captureProgressTicks:29};
  return {...w,tick:29,territory:{nodes},economy:{crownPower:{victoria:29,obsidian:0}},combat:{...w.combat,victim:{...w.combat.victim!,health:8}}};
}
describe('Phase 4 replay',()=>{
 it('is byte-stable through capture, income, kill reward, recruitment, deployment and promotion',()=>{
   const firstFrame:SimCommand[]=[{type:'recruit',sequence:1,issuedTick:29,faction:'victoria',unitKind:'pawn'},{type:'promote',sequence:2,issuedTick:29,faction:'victoria',pawnId:'promo',targetKind:'rook'}];
   const frames=[firstFrame,...Array.from({length:20},()=>[] as SimCommand[])];
   const a=runReplay(phase4Initial(),frames); const b=runReplay(phase4Initial(),frames);
   expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b)); expect(a.eventsByTick.flat().map(e=>e.type)).toContain('node.captured'); expect(a.eventsByTick.flat().map(e=>e.type)).toContain('crown.income'); expect(a.eventsByTick.flat().map(e=>e.type)).toContain('crown.kill_reward'); expect(a.eventsByTick.flat().map(e=>e.type)).toContain('reinforcement.deployed'); expect(a.eventsByTick.flat().map(e=>e.type)).toContain('promotion.completed');
 });
 it('serializes blocked queue and deterministic promotion rejection',()=>{
   let w=createWorld([unit('p','pawn','victoria',5,14)]); const occupancy:Record<string,string>={}; for(let y=0;y<16;y++)for(let x=0;x<16;x++)occupancy[`${x},${y}`]='blocked';
   w={...w,tick:49,occupancy,production:{...w.production,queues:{...w.production.queues,victoria:[{id:'victoria-recruit-1',faction:'victoria',unitKind:'pawn',cost:10,capacityWeight:1,queuedTick:0}]}},promotions:{pending:[{faction:'victoria',pawnId:'p',targetKind:'rook',sequence:1,requestedTick:40}]}};
   const a=runReplay(w,[[]]); const b=runReplay(w,[[]]); expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b)); expect(a.state.production.queues.victoria).toHaveLength(1); expect(a.eventsByTick[0]).toContainEqual(expect.objectContaining({type:'promotion.rejected',reason:'locked'}));
 });
});
