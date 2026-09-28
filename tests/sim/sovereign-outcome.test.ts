import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type SimCommand, type UnitState, type WorldState } from '../../src/sim';

const unit=(id:string,faction:UnitState['faction'],kind:UnitState['kind'],x:number,y:number):UnitState=>({id,faction,kind,position:{x,y}});
function health(world: WorldState, id: string, value: number): WorldState {
  return { ...world, combat: { ...world.combat, [id]: { ...world.combat[id]!, health: value } } };
}

describe('Phase 3 sovereign outcomes', () => {
  it('turns one King death into deterministic victory and skips decisive-tick commands', () => {
    let world=createWorld([unit('vk','victoria','king',1,1),unit('ok','obsidian','king',14,14),unit('r','victoria','rook',14,10)]);
    world=health(world,'ok',18);
    world={...world,combat:{...world.combat,r:{...world.combat.r!,targetId:'ok'}}};
    const move:SimCommand={type:'move',sequence:1,issuedTick:0,unitId:'vk',to:{x:2,y:1}};
    const result=stepWorld(world,[move]);
    expect(result.state.match.status).toBe('victoria_won');
    expect(result.state.match.victor).toBe('victoria');
    expect(result.state.match.endedTick).toBe(0);
    expect(result.state.units.vk?.position).toEqual({x:1,y:1});
    expect(result.events.map(e=>e.type).slice(-3)).toEqual(['unit.killed','sovereign.defeated','match.victory']);
  });

  it('draws when both Kings die in the same combat resolution', () => {
    let world=createWorld([unit('vk','victoria','king',5,5),unit('ok','obsidian','king',6,5)]);
    world=health(health(world,'vk',10),'ok',10);
    world={...world,combat:{...world.combat,vk:{...world.combat.vk!,targetId:'ok'},ok:{...world.combat.ok!,targetId:'vk'}}};
    const result=stepWorld(world,[]);
    expect(result.state.match.status).toBe('draw');
    expect(result.events.filter(e=>e.type==='sovereign.defeated')).toHaveLength(2);
    expect(result.events.at(-1)?.type).toBe('match.draw');
  });

  it('keeps simultaneous King draw ordering independent of insertion order', () => {
    const build=(reverse:boolean) => {
      const units=[unit('vk','victoria','king',5,5),unit('ok','obsidian','king',6,5)];
      let world=createWorld(reverse ? [...units].reverse() : units);
      world=health(health(world,'vk',10),'ok',10);
      return {...world,combat:{...world.combat,vk:{...world.combat.vk!,targetId:'ok'},ok:{...world.combat.ok!,targetId:'vk'}}};
    };
    const a=stepWorld(build(false),[]);
    const b=stepWorld(build(true),[]);
    expect(a.state.match).toEqual(b.state.match);
    expect(a.events).toEqual(b.events);
  });
});
