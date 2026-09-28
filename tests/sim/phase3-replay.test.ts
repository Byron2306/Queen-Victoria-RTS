import { describe, expect, it } from 'vitest';
import { canonicalSnapshot, createWorld, runReplay, type SimCommand, type UnitState, type WorldState } from '../../src/sim';
const unit=(id:string,faction:UnitState['faction'],kind:UnitState['kind'],x:number,y:number):UnitState=>({id,faction,kind,position:{x,y}});
function patch(world: WorldState, id: string, values: Partial<WorldState['combat'][string]>): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, ...values } } };
}

describe('Phase 3 replay', () => {
  it('includes match truth and is byte-equivalent through victory and terminal rejection', () => {
    let initial=createWorld([unit('vk','victoria','king',1,1),unit('ok','obsidian','king',14,14),unit('r','victoria','rook',14,10)]);
    initial=patch(initial,'ok',{health:18});
    initial=patch(initial,'r',{targetId:'ok'});
    const frames:readonly (readonly SimCommand[])[]=[[],[{type:'move',sequence:1,issuedTick:0,unitId:'vk',to:{x:2,y:1}}]];
    const a=runReplay(initial,frames);
    const b=runReplay(initial,frames);
    expect(a.eventsByTick).toEqual(b.eventsByTick);
    expect(canonicalSnapshot(a)).toBe(canonicalSnapshot(b));
    const parsed=JSON.parse(canonicalSnapshot(a));
    expect(parsed.state.match.status).toBe('victoria_won');
    expect(parsed.state.match.endedTick).toBe(0);
    expect(a.eventsByTick[1]?.[0]).toMatchObject({type:'command.rejected',reason:'match_ended'});
  });

  it('replays simultaneous King death as the same draw', () => {
    let initial=createWorld([unit('vk','victoria','king',5,5),unit('ok','obsidian','king',6,5)]);
    initial=patch(patch(initial,'vk',{health:10,targetId:'ok'}),'ok',{health:10,targetId:'vk'});
    expect(canonicalSnapshot(runReplay(initial,[[]]))).toBe(canonicalSnapshot(runReplay(initial,[[]])));
    expect(runReplay(initial,[[]]).state.match.status).toBe('draw');
  });
});
