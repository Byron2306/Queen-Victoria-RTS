import { describe, expect, it } from 'vitest';
import { createWorld, PROMOTION_COST, queuePromotionRequest, resolvePromotions } from '../../src/sim';
import type { PromoteCommand, UnitState, WorldState } from '../../src/sim';
const pawn=(id:string,y=1):UnitState=>({id,faction:'victoria',kind:'pawn',position:{x:5,y}});
const promote=(pawnId='p',targetKind:'knight'|'bishop'|'rook'='knight'):PromoteCommand=>({type:'promote',sequence:1,issuedTick:0,faction:'victoria',pawnId,targetKind});
function own(world:WorldState,n=4):WorldState{const nodes={...world.territory.nodes};for(const id of Object.keys(nodes).sort().slice(0,n))nodes[id]={...nodes[id]!,owner:'victoria'};return {...world,territory:{nodes}};}
describe('Pawn promotion',()=>{
 it('queues eligible far-rank Pawn without immediate spend and rejects invalid requests',()=>{let w=own(createWorld([pawn('p')]),4);w={...w,economy:{crownPower:{victoria:50,obsidian:0}}};const q=queuePromotionRequest(w,promote());expect(q.events[0]).toMatchObject({type:'promotion.requested',pawnId:'p'});expect(q.state.economy.crownPower.victoria).toBe(50);expect(queuePromotionRequest(q.state,promote()).events[0]).toMatchObject({reason:'already_pending'});expect(queuePromotionRequest(createWorld([pawn('x',5)]),promote('x')).events[0]).toMatchObject({reason:'not_in_zone'});});
 it('resolves explicitly and preserves tactical/combat state while changing kind',()=>{let w=own(createWorld([pawn('p')]),4);w={...w,tick:48,economy:{crownPower:{victoria:50,obsidian:0}},combat:{...w.combat,p:{...w.combat.p!,health:17,cooldownTicks:4,targetId:null,guardAnchor:{x:5,y:1}}}};w=queuePromotionRequest(w,promote('p','rook')).state;const before=w.combat.p!;const r=resolvePromotions(w);expect(r.state.units.p!.kind).toBe('rook');expect(r.state.combat.p).toEqual(before);expect(r.state.economy.crownPower.victoria).toBe(22);expect(r.events.map(e=>e.type)).toEqual(['crown.spent','promotion.completed']);});
 it('rechecks unlock and Crown at resolution, spends nothing on rejection, and removes pending',()=>{let w=createWorld([pawn('p')]);w=queuePromotionRequest(w,promote()).state;const r=resolvePromotions({...w,tick:49});expect(r.events[0]).toMatchObject({type:'promotion.rejected',reason:'locked'});expect(r.state.promotions.pending).toEqual([]);expect(r.state.economy.crownPower.victoria).toBe(0);});

 it('pins promotion prices and rechecks Crown, target cap, and capacity at resolution',()=>{
   expect(PROMOTION_COST).toEqual({knight:14,bishop:14,rook:28});
   let poor=own(createWorld([pawn('p')]),4); poor=queuePromotionRequest(poor,promote()).state;
   expect(resolvePromotions({...poor,tick:49}).events[0]).toMatchObject({type:'promotion.rejected',reason:'insufficient_crown'});

   let capped=own(createWorld([pawn('p'),{id:'r1',faction:'victoria',kind:'rook',position:{x:0,y:0}},{id:'r2',faction:'victoria',kind:'rook',position:{x:1,y:0}}]),4);
   capped={...capped,economy:{crownPower:{victoria:100,obsidian:0}}}; capped=queuePromotionRequest(capped,promote('p','rook')).state;
   expect(resolvePromotions({...capped,tick:49}).events[0]).toMatchObject({type:'promotion.rejected',reason:'piece_cap_reached'});

   let over=own(createWorld([pawn('p'),...Array.from({length:4},(_,i)=>({id:`r${i}`,faction:'victoria' as const,kind:'rook' as const,position:{x:i,y:0}}))]),4);
   over={...over,economy:{crownPower:{victoria:100,obsidian:0}}}; over=queuePromotionRequest(over,promote('p','knight')).state;
   expect(resolvePromotions({...over,tick:49}).events[0]).toMatchObject({type:'promotion.rejected',reason:'capacity_exceeded'});
 });
});
