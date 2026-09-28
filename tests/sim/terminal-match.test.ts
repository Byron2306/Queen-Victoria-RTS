import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type SimCommand, type UnitState, type WorldState } from '../../src/sim';
const unit=(id:string,faction:UnitState['faction'],kind:UnitState['kind'],x:number,y:number):UnitState=>({id,faction,kind,position:{x,y}});
function terminal(world: WorldState): WorldState {
  return { ...world, match: { ...world.match, status: 'victoria_won', victor: 'victoria', endedTick: world.tick } };
}
describe('Phase 3 terminal match', () => {
  it('freezes state and rejects later commands in deterministic order', () => {
    const world=terminal(createWorld([unit('vk','victoria','king',1,1),unit('ok','obsidian','king',14,14)]));
    const commands:SimCommand[]=[
      {type:'attack',sequence:2,issuedTick:0,unitId:'vk',targetId:'ok'},
      {type:'move',sequence:1,issuedTick:0,unitId:'ok',to:{x:13,y:14}},
      {type:'recruit',sequence:3,issuedTick:0,faction:'victoria',unitKind:'pawn'},
      {type:'promote',sequence:4,issuedTick:0,faction:'victoria',pawnId:'p',targetKind:'knight'},
    ];
    const result=stepWorld(world,commands);
    expect(result.state).toBe(world);
    expect(result.state.tick).toBe(0);
    expect(result.events).toEqual([
      {type:'command.rejected',tick:0,sequence:1,unitId:'ok',commandType:'move',reason:'match_ended'},
      {type:'command.rejected',tick:0,sequence:2,unitId:'vk',commandType:'attack',reason:'match_ended'},
      {type:'production.rejected',tick:0,faction:'victoria',unitKind:'pawn',reason:'match_ended'},
      {type:'promotion.rejected',tick:0,faction:'victoria',pawnId:'p',targetKind:'knight',reason:'match_ended'},
    ]);
    expect(stepWorld(result.state,[]).state).toBe(result.state);
  });
});
