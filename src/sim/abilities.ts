import type { CombatProfile, Faction, HeroAbilityCommand, HeroAbilityId, HeroLevel, SimEvent, WorldState } from './types';
import { UNIT_COMBAT_PROFILES } from './combat';
import { HERO_ABILITY_IDS } from './hero';

function chebyshevDistance(a:{x:number;y:number},b:{x:number;y:number}):number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }

export type HeroAbilityConfig = Readonly<{
  unlockLevel: HeroLevel;
  durationTicks: number;
  cooldownTicks: number;
}>;

export const HERO_ABILITY_CONFIG: Readonly<Record<HeroAbilityId, HeroAbilityConfig>> = {
  royal_decree: { unlockLevel: 1, durationTicks: 40, cooldownTicks: 120 },
  hold_the_crown: { unlockLevel: 2, durationTicks: 30, cooldownTicks: 140 },
  sovereign_line: { unlockLevel: 3, durationTicks: 50, cooldownTicks: 160 },
  imperial_gambit: { unlockLevel: 5, durationTicks: 35, cooldownTicks: 300 },
};

function aligned(a: {x:number;y:number}, b: {x:number;y:number}): boolean {
  const dx = Math.abs(a.x-b.x);
  const dy = Math.abs(a.y-b.y);
  return a.x===b.x || a.y===b.y || dx===dy;
}

export function qualifiesForSovereignLine(world: WorldState, faction: Faction): boolean {
  const hero = world.heroes[faction];
  if (!hero.heroUnitId || hero.status !== 'alive') return false;
  const heroUnit = world.units[hero.heroUnitId];
  if (!heroUnit) return false;
  let count=0;
  for (const id of Object.keys(world.units).sort()) {
    if (id===hero.heroUnitId) continue;
    const unit=world.units[id];
    const combat=world.combat[id];
    if (!unit || unit.faction!==faction || !combat || combat.health<=0) continue;
    if (chebyshevDistance(heroUnit.position,unit.position)>5) continue;
    if (!aligned(heroUnit.position,unit.position)) continue;
    count+=1;
    if (count>=2) return true;
  }
  return false;
}

type AbilityRejectReason = Extract<SimEvent,{type:'hero.ability.rejected'}>['reason'];

export function activateHeroAbility(world: WorldState, command: HeroAbilityCommand): {state:WorldState;events:readonly SimEvent[]} {
  const reject=(reason:AbilityRejectReason): {state:WorldState;events:readonly SimEvent[]} => ({
    state:world,
    events:[{type:'hero.ability.rejected',tick:world.tick,faction:command.faction,heroId:command.heroId,ability:command.ability,reason}],
  });
  if (world.match.status!=='active') return reject('match_ended');
  const hero=world.heroes[command.faction];
  if (!hero.heroUnitId) return reject('hero_unbound');
  if (hero.heroUnitId!==command.heroId) return reject('wrong_hero');
  if (hero.status!=='alive' || !world.units[hero.heroUnitId] || !world.combat[hero.heroUnitId]) return reject('hero_not_alive');
  const config=HERO_ABILITY_CONFIG[command.ability];
  if (hero.level<config.unlockLevel) return reject('locked_level');
  if (hero.abilities[command.ability].cooldownTicksRemaining>0) return reject('cooldown_active');
  if (hero.activeAbility) return reject('ability_active');
  if (command.ability==='sovereign_line' && !qualifiesForSovereignLine(world,command.faction)) return reject('formation_missing');
  const nextAbility={cooldownTicksRemaining:config.cooldownTicks,activeTicksRemaining:config.durationTicks};
  const nextHero={...hero,activeAbility:command.ability,abilities:{...hero.abilities,[command.ability]:nextAbility}};
  return {
    state:{...world,heroes:{...world.heroes,[command.faction]:nextHero}},
    events:[{type:'hero.ability.activated',tick:world.tick,faction:command.faction,heroId:command.heroId,ability:command.ability,activeTicks:config.durationTicks,cooldownTicks:config.cooldownTicks}],
  };
}

export function advanceHeroAbilityLifecycle(
  world: WorldState,
  skipDecrementFactions: ReadonlySet<Faction> = new Set(),
): {state:WorldState;events:readonly SimEvent[]} {
  let heroes=world.heroes;
  const events:SimEvent[]=[];
  for (const faction of ['victoria','obsidian'] as const) {
    const hero=heroes[faction];
    if (hero.status==='unbound' || skipDecrementFactions.has(faction)) continue;
    const abilities={...hero.abilities};
    let activeAbility=hero.activeAbility;
    let changed=false;
    for (const ability of HERO_ABILITY_IDS) {
      const prior=abilities[ability];
      let cooldown=prior.cooldownTicksRemaining;
      let active=prior.activeTicksRemaining;
      if (cooldown>0) { cooldown-=1; changed=true; }
      if (active>0) { active-=1; changed=true; }
      abilities[ability]={cooldownTicksRemaining:cooldown,activeTicksRemaining:active};
      if (activeAbility===ability && prior.activeTicksRemaining>0 && active===0) {
        activeAbility=null;
        if (hero.heroUnitId) events.push({type:'hero.ability.expired',tick:world.tick,faction,heroId:hero.heroUnitId,ability});
      }
    }
    if (changed || activeAbility!==hero.activeAbility) heroes={...heroes,[faction]:{...hero,activeAbility,abilities}};
  }
  return {state:heroes===world.heroes?world:{...world,heroes},events};
}

export function isUnitAlignedWithHero(world:WorldState,faction:Faction,unitId:string,maxDistance=5):boolean {
  const hero=world.heroes[faction];
  if (!hero.heroUnitId || hero.status!=='alive') return false;
  const heroUnit=world.units[hero.heroUnitId];
  const unit=world.units[unitId];
  if (!heroUnit || !unit || unit.faction!==faction) return false;
  return chebyshevDistance(heroUnit.position,unit.position)<=maxDistance && aligned(heroUnit.position,unit.position);
}


function activeHeroUnit(world:WorldState,faction:Faction): {heroId:string; position:{x:number;y:number}; level:HeroLevel; ability:HeroAbilityId} | null {
  const hero=world.heroes[faction];
  if (!hero.heroUnitId || hero.status!=='alive' || !hero.activeAbility) return null;
  const unit=world.units[hero.heroUnitId];
  if (!unit) return null;
  return {heroId:hero.heroUnitId,position:unit.position,level:hero.level,ability:hero.activeAbility};
}

function inAura(world:WorldState,faction:Faction,unitId:string,radius:number):boolean {
  const active=activeHeroUnit(world,faction);
  const unit=world.units[unitId];
  return Boolean(active && unit && unit.faction===faction && chebyshevDistance(active.position,unit.position)<=radius);
}

export function outgoingHeroDamageBps(world:WorldState,attackerId:string):number {
  const unit=world.units[attackerId];
  if (!unit) return 10000;
  const active=activeHeroUnit(world,unit.faction);
  if (!active) return 10000;
  if (active.ability==='royal_decree') {
    const radius=active.level>=4?5:4;
    return inAura(world,unit.faction,attackerId,radius) ? (active.level>=4?12000:11500) : 10000;
  }
  if (active.ability==='sovereign_line') {
    return attackerId!==active.heroId && isUnitAlignedWithHero(world,unit.faction,attackerId,5) ? (active.level>=4?11500:11000) : 10000;
  }
  if (active.ability==='imperial_gambit') {
    return inAura(world,unit.faction,attackerId,5) ? 13000 : 10000;
  }
  return 10000;
}

export function incomingHeroDamageBps(world:WorldState,defenderId:string):number {
  const unit=world.units[defenderId];
  if (!unit) return 10000;
  const active=activeHeroUnit(world,unit.faction);
  if (!active) return 10000;
  if (active.ability==='hold_the_crown') {
    if (defenderId===active.heroId) return 5000;
    if (inAura(world,unit.faction,defenderId,4)) return active.level>=4?7500:8000;
  }
  if (active.ability==='imperial_gambit' && defenderId===active.heroId) return 13000;
  return 10000;
}

export function effectiveAttackRange(world:WorldState,attackerId:string):number {
  const unit=world.units[attackerId];
  if (!unit) return 0;
  const base=UNIT_COMBAT_PROFILES[unit.kind].range;
  const active=activeHeroUnit(world,unit.faction);
  if (active?.ability==='sovereign_line' && attackerId!==active.heroId && isUnitAlignedWithHero(world,unit.faction,attackerId,5)) return base+1;
  return base;
}

export function effectiveGuardRanges(world:WorldState,unitId:string):Pick<CombatProfile,'acquisitionRange'|'leashRange'> {
  const unit=world.units[unitId];
  if (!unit) return {acquisitionRange:0,leashRange:0};
  const profile=UNIT_COMBAT_PROFILES[unit.kind];
  let acquisitionRange=profile.acquisitionRange;
  let leashRange=profile.leashRange;
  const active=activeHeroUnit(world,unit.faction);
  if (!active) return {acquisitionRange,leashRange};
  if (active.ability==='royal_decree') {
    const radius=active.level>=4?5:4;
    if (inAura(world,unit.faction,unitId,radius)) { acquisitionRange+=1; leashRange+=1; }
  }
  if (active.ability==='hold_the_crown' && inAura(world,unit.faction,unitId,4)) leashRange+=2;
  return {acquisitionRange,leashRange};
}

export function effectiveCooldownReload(world:WorldState,attackerId:string):number {
  const unit=world.units[attackerId];
  if (!unit) return 1;
  const base=UNIT_COMBAT_PROFILES[unit.kind].cooldownTicks;
  const active=activeHeroUnit(world,unit.faction);
  if (active?.ability==='imperial_gambit' && inAura(world,unit.faction,attackerId,5)) return Math.max(1,Math.floor(base*0.75));
  return base;
}

export function heroMovementAnchored(world:WorldState,unitId:string):boolean {
  const unit=world.units[unitId];
  if (!unit) return false;
  const hero=world.heroes[unit.faction];
  return hero.status==='alive' && hero.heroUnitId===unitId && hero.activeAbility==='hold_the_crown';
}
