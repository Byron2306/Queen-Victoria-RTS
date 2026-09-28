import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../../src/sim';
import type { SimCommand, UnitState, WorldState } from '../../src/sim';
const unit=(id:string,kind:UnitState['kind'],faction:UnitState['faction'],x:number,y:number):UnitState=>({id,kind,faction,position:{x,y}});
function own(world:WorldState,ids:string[],faction:'victoria'|'obsidian'='victoria'):WorldState{const nodes={...world.territory.nodes};for(const id of ids)nodes[id]={...nodes[id]!,owner:faction};return {...world,territory:{nodes}};}
describe('Phase 4 tick ordering',()=>{
  it('lets movement enter a node before node evaluation without retroactive combat',()=>{
    const w=createWorld([unit('p','pawn','victoria',3,1)]);
    const r=stepWorld(w,[{type:'move',sequence:1,issuedTick:0,unitId:'p',to:{x:3,y:2}}]);
    expect(r.state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(1);
    expect(r.events.some(e=>e.type==='attack.fired')).toBe(false);
  });
  it('applies scheduled income before recruitment in the same tick',()=>{
    let w=own(createWorld(),['minor-nw']); w={...w,tick:29,economy:{crownPower:{victoria:9,obsidian:0}}};
    const r=stepWorld(w,[{type:'recruit',sequence:1,issuedTick:29,faction:'victoria',unitKind:'pawn'}]);
    expect(r.events.map(e=>e.type)).toContain('crown.income');
    expect(r.events.map(e=>e.type)).toContain('production.queued');
    expect(r.state.economy.crownPower.victoria).toBe(0);
  });
  it('deploys after combat so a new unit cannot attack until a later tick',()=>{
    let w=createWorld([unit('e','pawn','obsidian',1,2)]); w={...w,tick:49,production:{...w.production,queues:{...w.production.queues,victoria:[{id:'victoria-recruit-1',faction:'victoria',unitKind:'pawn',cost:10,capacityWeight:1,queuedTick:0}]}}};
    const r=stepWorld(w,[]); expect(r.events.some(e=>e.type==='reinforcement.deployed')).toBe(true); expect(r.events.some(e=>e.type==='attack.fired')).toBe(false);
  });
  it('promotion can create tick-end sovereign threat without earlier combat',()=>{
    let w=own(createWorld([unit('p','pawn','victoria',5,14),unit('ok','king','obsidian',5,10)]),['minor-nw','minor-ne','minor-w','minor-e']);
    w={...w,tick:49,economy:{crownPower:{victoria:50,obsidian:0}},promotions:{pending:[{faction:'victoria',pawnId:'p',targetKind:'rook',sequence:1,requestedTick:48}]}};
    const r=stepWorld(w,[]); expect(r.events.some(e=>e.type==='attack.fired')).toBe(false); expect(r.events).toContainEqual(expect.objectContaining({type:'sovereign.threatened',faction:'obsidian'}));
  });
  it('stops Phase 4 mutation after decisive King combat',()=>{
    let w=createWorld([unit('vk','king','victoria',7,7),unit('ok','king','obsidian',7,8),unit('p','pawn','victoria',3,3)]);
    w={...w,tick:29,combat:{...w.combat,vk:{...w.combat.vk!,health:10},ok:{...w.combat.ok!,health:10}},economy:{crownPower:{victoria:4,obsidian:4}}};
    const r=stepWorld(w,[]); expect(r.state.match.status).toBe('draw'); expect(r.state.economy.crownPower).toEqual({victoria:4,obsidian:4}); expect(r.state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(0);
  });

  it('applies same-tick kill reward before recruitment',()=>{
    let w=createWorld([unit('a','pawn','victoria',4,4),unit('v','pawn','obsidian',4,5)]);
    w={...w,economy:{crownPower:{victoria:5,obsidian:0}},combat:{...w.combat,v:{...w.combat.v!,health:8}}};
    const r=stepWorld(w,[{type:'recruit',sequence:1,issuedTick:0,faction:'victoria',unitKind:'pawn'}]);
    expect(r.events).toContainEqual(expect.objectContaining({type:'crown.kill_reward',faction:'victoria',amount:5}));
    expect(r.events).toContainEqual(expect.objectContaining({type:'production.queued',faction:'victoria',unitKind:'pawn'}));
    expect(r.state.economy.crownPower.victoria).toBe(0);
  });
});
