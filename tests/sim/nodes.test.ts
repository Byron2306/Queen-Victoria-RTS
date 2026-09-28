import { describe, expect, it } from 'vitest';
import { createWorld, evaluateNodeControl, NODE_CAPTURE_TICKS } from '../../src/sim';
import type { UnitState, WorldState } from '../../src/sim';

const pawn=(id:string,faction:'victoria'|'obsidian',x:number,y:number):UnitState=>({id,faction,kind:'pawn',position:{x,y}});
function withNode(world:WorldState,id:string,patch:Partial<WorldState['territory']['nodes'][string]>):WorldState {
  return {...world,territory:{nodes:{...world.territory.nodes,[id]:{...world.territory.nodes[id]!,...patch}}}};
}
describe('capture nodes',()=>{
  it('uses a 3x3 zone and ignores Kings',()=>{
    const inside=evaluateNodeControl(createWorld([pawn('p','victoria',4,4)]));
    expect(inside.state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(1);
    const outside=evaluateNodeControl(createWorld([pawn('p','victoria',5,3)]));
    expect(outside.state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(0);
    const king=evaluateNodeControl(createWorld([{id:'k',faction:'victoria',kind:'king',position:{x:3,y:3}}]));
    expect(king.state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(0);
  });
  it('captures neutral on tick 30 and pauses contest with transition receipts',()=>{
    let w=createWorld([pawn('v','victoria',3,3)]);
    for(let i=0;i<NODE_CAPTURE_TICKS;i++) w=evaluateNodeControl(w).state;
    expect(w.territory.nodes['minor-nw']!.owner).toBe('victoria');
    const c=evaluateNodeControl(createWorld([pawn('v','victoria',3,3),pawn('o','obsidian',4,3)]));
    expect(c.events.map(e=>e.type)).toContain('node.contested');
    expect(evaluateNodeControl(c.state).events.map(e=>e.type)).not.toContain('node.contested');
  });
  it('decays and fully neutralizes before enemy capture',()=>{
    let w=withNode(createWorld([pawn('o','obsidian',3,3)]),'minor-nw',{owner:'victoria'});
    for(let i=0;i<NODE_CAPTURE_TICKS;i++) w=evaluateNodeControl(w).state;
    expect(w.territory.nodes['minor-nw']!.owner).toBeNull();
    for(let i=0;i<NODE_CAPTURE_TICKS;i++) w=evaluateNodeControl(w).state;
    expect(w.territory.nodes['minor-nw']!.owner).toBe('obsidian');
    w=withNode(createWorld(),'minor-nw',{capturingFaction:'victoria',captureProgressTicks:2});
    expect(evaluateNodeControl(w).state.territory.nodes['minor-nw']!.captureProgressTicks).toBe(1);
  });
  it('unwinds previous faction progress before switching',()=>{
    let w=withNode(createWorld([pawn('o','obsidian',3,3)]),'minor-nw',{capturingFaction:'victoria',captureProgressTicks:2});
    w=evaluateNodeControl(w).state;
    expect(w.territory.nodes['minor-nw']!.captureProgressTicks).toBe(1);
    w=evaluateNodeControl(w).state;
    expect(w.territory.nodes['minor-nw']!.captureProgressTicks).toBe(0);
    expect(w.territory.nodes['minor-nw']!.capturingFaction).toBeNull();
  });

  it('emits one uncontested transition when a contest clears',()=>{
    let w=createWorld([pawn('v','victoria',3,3)]);
    w=withNode(w,'minor-nw',{contested:true});
    const r=evaluateNodeControl(w);
    expect(r.events.filter(e=>e.type==='node.uncontested')).toHaveLength(1);
    expect(evaluateNodeControl(r.state).events.filter(e=>e.type==='node.uncontested')).toHaveLength(0);
  });
});
