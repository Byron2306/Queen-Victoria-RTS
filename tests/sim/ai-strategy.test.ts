import { describe, expect, it } from 'vitest';
import { createWorld, evaluateBalancedAI, scoreStrategicIntentions } from '../../src/sim';
import type { WorldState } from '../../src/sim';

function enabled(units: Parameters<typeof createWorld>[0]=[]): WorldState {
  return createWorld(units,{aiFactions:['obsidian']});
}
function atTick(world:WorldState,tick:number):WorldState { return {...world,tick}; }

describe('balanced AI strategy',()=>{
  it('is disabled by default and evaluates only on its 10 tick cadence',()=>{
    const off=createWorld();
    expect(evaluateBalancedAI(off,'obsidian').events).toHaveLength(0);
    let world=enabled();
    const first=evaluateBalancedAI(world,'obsidian');
    expect(first.events.some(e=>e.type==='ai.evaluated')).toBe(true);
    world=atTick(first.state,1);
    expect(evaluateBalancedAI(world,'obsidian').events).toHaveLength(0);
    world=atTick(first.state,10);
    expect(evaluateBalancedAI(world,'obsidian').events.some(e=>e.type==='ai.evaluated')).toBe(true);
  });

  it('selects at most three intentions and keeps valid commitments for 30 ticks',()=>{
    let world=enabled([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:10,y:10}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
      {id:'vpawn',faction:'victoria',kind:'pawn',position:{x:8,y:8}},
    ]);
    const first=evaluateBalancedAI(world,'obsidian');
    expect(first.state.ai.obsidian.commitments.length).toBeLessThanOrEqual(3);
    expect(first.state.ai.obsidian.commitments.every(c=>c.expiresTick===30)).toBe(true);
    const ids=first.state.ai.obsidian.commitments.map(c=>`${c.intention}:${c.objectiveId}`);
    const second=evaluateBalancedAI(atTick(first.state,10),'obsidian');
    expect(second.state.ai.obsidian.commitments.map(c=>`${c.intention}:${c.objectiveId}`)).toEqual(ids);
  });

  it('forces defend_king first at the next cadence but never reacts out of cadence',()=>{
    let world=enabled([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:1,y:1}},
      {id:'vrook',faction:'victoria',kind:'rook',position:{x:14,y:10}},
    ]);
    world={...world,match:{...world.match,sovereigns:{...world.match.sovereigns,obsidian:{...world.match.sovereigns.obsidian,threatened:true,threateningUnitIds:['vrook']}}}};
    expect(evaluateBalancedAI(atTick(world,1),'obsidian').events).toHaveLength(0);
    const cadence=evaluateBalancedAI(atTick(world,10),'obsidian');
    expect(cadence.state.ai.obsidian.commitments[0]?.intention).toBe('defend_king');
  });

  it('scores all public strategic channels and is insertion-order deterministic',()=>{
    const units=[
      {id:'oking',faction:'obsidian' as const,kind:'king' as const,position:{x:14,y:14}},
      {id:'opawn',faction:'obsidian' as const,kind:'pawn' as const,position:{x:10,y:10}},
      {id:'vking',faction:'victoria' as const,kind:'king' as const,position:{x:1,y:1}},
      {id:'vhero',faction:'victoria' as const,kind:'queen' as const,position:{x:8,y:8}},
    ];
    const a=enabled(units);
    const b=enabled([...units].reverse());
    expect(scoreStrategicIntentions(a,'obsidian')).toEqual(scoreStrategicIntentions(b,'obsidian'));
    expect(evaluateBalancedAI(a,'obsidian').state.ai.obsidian.commitments)
      .toEqual(evaluateBalancedAI(b,'obsidian').state.ai.obsidian.commitments);
  });
});

describe('balanced AI acceptance channels',()=>{
  it('exposes capture, reinforce, pressure, and legal King-attack opportunities from public board truth',()=>{
    const world=enabled([
      {id:'oking',faction:'obsidian',kind:'king',position:{x:14,y:14}},
      {id:'orook',faction:'obsidian',kind:'rook',position:{x:7,y:7}},
      {id:'opawn',faction:'obsidian',kind:'pawn',position:{x:8,y:7}},
      {id:'vking',faction:'victoria',kind:'king',position:{x:7,y:4}},
      {id:'vpawn',faction:'victoria',kind:'pawn',position:{x:8,y:8}},
    ]);
    const intentions=scoreStrategicIntentions(world,'obsidian').map(candidate=>candidate.intention);
    expect(intentions).toContain('capture_node');
    expect(intentions).toContain('reinforce_front');
    expect(intentions).toContain('pressure_position');
    expect(intentions).toContain('attack_king');
  });
});
