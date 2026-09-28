import type { Faction, HeroAbilityId, HeroAbilityState, HeroState, UnitState } from './types';

export const HERO_ABILITY_IDS: readonly HeroAbilityId[] = [
  'royal_decree', 'hold_the_crown', 'sovereign_line', 'imperial_gambit',
];

function emptyAbilities(): Readonly<Record<HeroAbilityId, HeroAbilityState>> {
  return Object.fromEntries(HERO_ABILITY_IDS.map((id) => [id, { cooldownTicksRemaining: 0, activeTicksRemaining: 0 }])) as Record<HeroAbilityId, HeroAbilityState>;
}

export function unboundHeroState(): HeroState {
  return { heroUnitId: null, status: 'unbound', level: 1, xp: 0, respawnTicksRemaining: 0, activeAbility: null, abilities: emptyAbilities() };
}

export function createInitialHeroState(
  units: Readonly<Record<string, UnitState>>,
  heroIds: Partial<Record<Faction, string>> = {},
): Readonly<Record<Faction, HeroState>> {
  const bind = (faction: Faction): HeroState => {
    const id = heroIds[faction];
    if (!id) return unboundHeroState();
    const unit = units[id];
    if (!unit || unit.faction !== faction || unit.kind !== 'queen') return unboundHeroState();
    return { ...unboundHeroState(), heroUnitId: id, status: 'alive' };
  };
  return { victoria: bind('victoria'), obsidian: bind('obsidian') };
}

import type { SimEvent, WorldState, HeroLevel } from './types';
import { findReinforcementSpawn } from './spawn';

function heroDistance(a:{x:number;y:number},b:{x:number;y:number}):number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }

export const HERO_RESPAWN_TICKS = 120;
export const HERO_XP_RADIUS = 5;
export const HERO_XP_VALUE: Readonly<Record<UnitState['kind'], number>> = {
  pawn: 10, knight: 18, bishop: 18, rook: 28, queen: 40, king: 0,
};

export function heroLevelForXp(xp: number): HeroLevel {
  if (xp >= 280) return 5;
  if (xp >= 180) return 4;
  if (xp >= 100) return 3;
  if (xp >= 40) return 2;
  return 1;
}

export function interpretHeroCombat(
  beforeCombat: WorldState,
  afterCombat: WorldState,
  combatEvents: readonly SimEvent[],
): { state: WorldState; events: readonly SimEvent[] } {
  let state = afterCombat;
  const events: SimEvent[] = [];
  const killedEvents = combatEvents.filter((event): event is Extract<SimEvent, { type: 'unit.killed' }> => event.type === 'unit.killed');

  for (const faction of ['victoria', 'obsidian'] as const) {
    const beforeHero = beforeCombat.heroes[faction];
    const heroId = beforeHero.heroUnitId;
    if (!heroId || beforeHero.status !== 'alive') continue;
    const heroBeforeUnit = beforeCombat.units[heroId];
    if (!heroBeforeUnit) continue;

    let hero = state.heroes[faction];
    const heroKilled = killedEvents.some((event) => event.unitId === heroId);
    if (heroKilled) {
      hero = {
        ...hero,
        status: 'respawning',
        respawnTicksRemaining: HERO_RESPAWN_TICKS,
        activeAbility: null,
        abilities: Object.fromEntries(HERO_ABILITY_IDS.map((id) => [
          id,
          { ...hero.abilities[id], activeTicksRemaining: 0 },
        ])) as HeroState['abilities'],
      };
      state = { ...state, heroes: { ...state.heroes, [faction]: hero } };
      events.push({ type: 'hero.defeated', tick: beforeCombat.tick, faction, heroId, respawnTicks: HERO_RESPAWN_TICKS });
    }

    for (const killed of killedEvents) {
      if (killed.unitId === heroId) continue;
      const defeated = beforeCombat.units[killed.unitId];
      if (!defeated || defeated.faction === faction) continue;
      const amount = HERO_XP_VALUE[defeated.kind];
      if (amount <= 0 || heroDistance(heroBeforeUnit.position, defeated.position) > HERO_XP_RADIUS) continue;
      const priorXp = hero.xp;
      const priorLevel = hero.level;
      const resultingXp = priorXp + amount;
      const resultingLevel = heroLevelForXp(resultingXp);
      hero = { ...hero, xp: resultingXp, level: resultingLevel };
      state = { ...state, heroes: { ...state.heroes, [faction]: hero } };
      events.push({ type: 'hero.xp_gained', tick: beforeCombat.tick, faction, heroId, amount, defeatedUnitId: killed.unitId, resultingXp });
      for (let level = priorLevel + 1; level <= resultingLevel; level += 1) {
        events.push({ type: 'hero.leveled', tick: beforeCombat.tick, faction, heroId, fromLevel: (level - 1) as HeroLevel, toLevel: level as HeroLevel, resultingXp });
      }
    }
  }

  return { state, events };
}


export function advanceHeroRespawn(
  world:WorldState,
  skipDecrementFactions:ReadonlySet<Faction>=new Set(),
):{state:WorldState;events:readonly SimEvent[]}{
  let heroes=world.heroes;
  for(const faction of ['victoria','obsidian'] as const){
    const hero=heroes[faction];
    if(hero.status!=='respawning'||skipDecrementFactions.has(faction)||hero.respawnTicksRemaining<=0) continue;
    heroes={...heroes,[faction]:{...hero,respawnTicksRemaining:hero.respawnTicksRemaining-1}};
  }
  return {state:heroes===world.heroes?world:{...world,heroes},events:[]};
}

export function attemptHeroRespawns(world:WorldState):{state:WorldState;events:readonly SimEvent[]}{
  let state=world;
  const events:SimEvent[]=[];
  for(const faction of ['victoria','obsidian'] as const){
    const hero=state.heroes[faction];
    const heroId=hero.heroUnitId;
    if(!heroId || !((hero.status==='respawning'&&hero.respawnTicksRemaining===0)||hero.status==='ready_to_respawn')) continue;
    const position=findReinforcementSpawn(state,faction);
    if(!position){
      if(hero.status!=='ready_to_respawn'){
        state={...state,heroes:{...state.heroes,[faction]:{...hero,status:'ready_to_respawn'}}};
        events.push({type:'hero.respawn.ready',tick:world.tick,faction,heroId});
      }
      continue;
    }
    const unit:UnitState={id:heroId,faction,kind:'queen',position};
    const key=`${position.x},${position.y}`;
    state={
      ...state,
      units:{...state.units,[heroId]:unit},
      occupancy:{...state.occupancy,[key]:heroId},
      combat:{...state.combat,[heroId]:{health:180,cooldownTicks:0,targetId:null,stance:'guard',guardAnchor:{...position}}},
      heroes:{...state.heroes,[faction]:{...hero,status:'alive',respawnTicksRemaining:0,activeAbility:null}},
    };
    events.push({type:'hero.respawned',tick:world.tick,faction,heroId,position});
  }
  return {state,events};
}
