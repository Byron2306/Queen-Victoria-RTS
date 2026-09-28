import { describe, expect, it } from 'vitest';
import { applyCrownIncome, applyKillRewards, capacityUsage, commandCapacity, createWorld, isRecruitUnlocked, ownedNodeCount, pieceCountWithQueue, resolveCombatTick } from '../../src/sim';
import type { SimEvent, UnitState, WorldState } from '../../src/sim';
const unit=(id:string,kind:UnitState['kind'],faction:UnitState['faction'],x=0,y=0):UnitState=>({id,kind,faction,position:{x,y}});
function own(world:WorldState, ids:string[], faction:UnitState['faction']):WorldState { const nodes={...world.territory.nodes}; for(const id of ids) nodes[id]={...nodes[id]!,owner:faction}; return {...world,territory:{nodes}}; }
describe('Crown economy',()=>{
  it('pays node income only on the 30-tick boundary',()=>{
    let w=own(createWorld(),['minor-nw','crown'],'victoria');
    expect(applyCrownIncome({...w,tick:28}).events).toEqual([]);
    const paid=applyCrownIncome({...w,tick:29});
    expect(paid.state.economy.crownPower.victoria).toBe(3);
    expect(paid.events).toContainEqual(expect.objectContaining({type:'crown.income',faction:'victoria',amount:3,sourceNodeIds:['crown','minor-nw']}));
  });
  it('derives unlocks, capacity and queued reservations',()=>{
    let w=own(createWorld([unit('p','pawn','victoria')]),['minor-nw','minor-ne','minor-w','minor-e'],'victoria');
    w={...w,production:{...w.production,queues:{...w.production.queues,victoria:[{id:'q',faction:'victoria',unitKind:'rook',cost:38,capacityWeight:3,queuedTick:0}]}}};
    expect(ownedNodeCount(w,'victoria')).toBe(4);
    expect(isRecruitUnlocked(w,'victoria','rook')).toBe(true);
    expect(commandCapacity(w,'victoria')).toBe(14);
    expect(capacityUsage(w,'victoria')).toBe(4);
    expect(pieceCountWithQueue(w,'victoria','rook')).toBe(1);
  });
  it('pays one positional focus-fire kill reward',()=>{
    const pre=createWorld([unit('a','pawn','victoria'),unit('b','pawn','victoria',1,0),unit('o','rook','obsidian',2,0)]);
    const events:SimEvent[]=[{type:'unit.killed',tick:0,unitId:'o',byUnitIds:['a','b'],positionalBonusApplied:true}];
    const result=applyKillRewards(pre,pre,events);
    expect(result.state.economy.crownPower.victoria).toBe(17);
    expect(result.events).toHaveLength(1);
  });
  it('pins every kill reward, unlock threshold, and the capacity ceiling',()=>{
    const rewards={pawn:5,knight:10,bishop:10,rook:14,queen:25,king:0} as const;
    for(const [kind,amount] of Object.entries(rewards) as [UnitState['kind'],number][]) {
      const pre=createWorld([unit('a','pawn','victoria'),unit('d',kind,'obsidian',2,0)]);
      const events:SimEvent[]=[{type:'unit.killed',tick:0,unitId:'d',byUnitIds:['a'],positionalBonusApplied:false}];
      const result=applyKillRewards(pre,pre,events);
      expect(result.state.economy.crownPower.victoria).toBe(amount);
      expect(result.events).toHaveLength(amount===0?0:1);
    }
    let w=createWorld();
    expect(isRecruitUnlocked(w,'victoria','pawn')).toBe(true); expect(isRecruitUnlocked(w,'victoria','knight')).toBe(false);
    for(const [count,kind] of [[2,'knight'],[3,'bishop'],[4,'rook']] as const){w=own(createWorld(),Object.keys(createWorld().territory.nodes).filter(id=>id!=='crown').slice(0,count),'victoria');expect(isRecruitUnlocked(w,'victoria',kind)).toBe(true);}
    w=own(createWorld(),Object.keys(createWorld().territory.nodes),'victoria'); expect(commandCapacity(w,'victoria')).toBe(16);
  });
  it('does not pay a freshly captured node outside an income boundary',()=>{
    const base=createWorld(); const nodes={...base.territory.nodes,'minor-nw':{...base.territory.nodes['minor-nw']!,owner:'victoria' as const}};
    expect(applyCrownIncome({...base,tick:0,territory:{nodes}}).events).toEqual([]);
  });

  it('pays exactly one positional reward from live focus-fire combat provenance',()=>{
    let pre=createWorld([unit('r','rook','victoria',0,0),unit('p','pawn','victoria',1,2),unit('o','pawn','obsidian',0,2)]);
    pre={...pre,combat:{...pre.combat,r:{...pre.combat.r!,targetId:'o'},p:{...pre.combat.p!,targetId:'o'},o:{...pre.combat.o!,health:30}}};
    const combat=resolveCombatTick(pre);
    const killed=combat.events.find(e=>e.type==='unit.killed');
    expect(killed).toMatchObject({type:'unit.killed',unitId:'o',positionalBonusApplied:true});
    const reward=applyKillRewards(combat.state,pre,combat.events);
    expect(reward.events).toHaveLength(1); expect(reward.events[0]).toMatchObject({type:'crown.kill_reward',amount:6,positionalBonusApplied:true}); expect(reward.state.economy.crownPower.victoria).toBe(6);
  });
});
