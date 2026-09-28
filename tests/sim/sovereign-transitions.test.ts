import { describe, expect, it } from 'vitest';
import { createWorld, evaluateSovereignThreats, stepWorld, type UnitState, type WorldState } from '../../src/sim';

const unit=(id:string,faction:UnitState['faction'],kind:UnitState['kind'],x:number,y:number):UnitState=>({id,faction,kind,position:{x,y}});
function withVictoriaSovereign(world: WorldState, threatened: boolean, ids: readonly string[]): WorldState {
  return { ...world, match: { ...world.match, sovereigns: { ...world.match.sovereigns, victoria: { ...world.match.sovereigns.victoria, threatened, threateningUnitIds: ids } } } };
}

describe('Phase 3 sovereign transitions', () => {
  it('emits one threat transition and updates sorted provenance', () => {
    const world=createWorld([unit('vk','victoria','king',5,5),unit('z','obsidian','rook',5,9),unit('a','obsidian','bishop',8,8)]);
    const result=evaluateSovereignThreats(world);
    expect(result.state.match.sovereigns.victoria.threateningUnitIds).toEqual(['a','z']);
    expect(result.events).toEqual([{type:'sovereign.threatened',tick:0,faction:'victoria',kingId:'vk',threateningUnitIds:['a','z']}]);
    expect(evaluateSovereignThreats(result.state).events).toEqual([]);
  });

  it('emits relief only on true to false', () => {
    const base=createWorld([unit('vk','victoria','king',1,1),unit('far','obsidian','rook',10,10)]);
    const world=withVictoriaSovereign(base,true,['gone']);
    expect(evaluateSovereignThreats(world).events).toEqual([{type:'sovereign.relief',tick:0,faction:'victoria',kingId:'vk'}]);
  });

  it('updates provenance without duplicate event while threat remains active', () => {
    const base=createWorld([unit('vk','victoria','king',5,5),unit('b','obsidian','rook',5,9)]);
    const world=withVictoriaSovereign(base,true,['a']);
    const result=evaluateSovereignThreats(world);
    expect(result.state.match.sovereigns.victoria.threateningUnitIds).toEqual(['b']);
    expect(result.events).toEqual([]);
  });
});

describe('Phase 3 sovereign command timing', () => {
  it('creates threat after movement without retroactive same-tick damage', () => {
    const world=createWorld([unit('vk','victoria','king',5,5),unit('r','obsidian','rook',5,12)]);
    const beforeHealth=world.combat.vk!.health;
    const result=stepWorld(world,[{type:'move',sequence:1,issuedTick:0,unitId:'r',to:{x:5,y:10}}]);
    expect(result.state.combat.vk!.health).toBe(beforeHealth);
    expect(result.state.match.sovereigns.victoria.threatened).toBe(true);
    expect(result.events.at(-1)).toMatchObject({type:'sovereign.threatened',faction:'victoria'});
  });

  it('emits relief when movement removes the last threat', () => {
    let world=createWorld([unit('vk','victoria','king',5,5),unit('r','obsidian','rook',5,10)]);
    world=evaluateSovereignThreats(world).state;
    world={...world,combat:{...world.combat,r:{...world.combat.r!,cooldownTicks:2}}};
    const result=stepWorld(world,[{type:'move',sequence:1,issuedTick:0,unitId:'r',to:{x:5,y:12}}]);
    expect(result.state.match.sovereigns.victoria.threatened).toBe(false);
    expect(result.events.at(-1)).toMatchObject({type:'sovereign.relief',faction:'victoria'});
  });

  it('removes a killed threatening unit before tick-end provenance', () => {
    let world=createWorld([
      unit('vk','victoria','king',5,5),
      unit('enemy','obsidian','pawn',5,6),
      unit('ally','victoria','pawn',6,6),
    ]);
    world=evaluateSovereignThreats(world).state;
    world={...world,combat:{...world.combat,enemy:{...world.combat.enemy!,health:8,cooldownTicks:2},ally:{...world.combat.ally!,targetId:'enemy'}}};
    const result=stepWorld(world,[]);
    expect(result.state.units.enemy).toBeUndefined();
    expect(result.state.match.sovereigns.victoria.threateningUnitIds).toEqual([]);
    expect(result.events.at(-1)).toMatchObject({type:'sovereign.relief',faction:'victoria'});
  });
});
