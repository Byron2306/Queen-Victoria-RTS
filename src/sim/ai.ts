import type { TacticalOrder } from './orders';
import type {
  AICommanderState, Faction, SimCommand, SimEvent, StrategicCommitment, StrategicIntention,
  UnitKind, WorldState,
} from './types';
import { refreshFactionIntelligence } from './intelligence';
import { createFactionKnowledgeView, createFactionPlanningWorld } from './intelligence-view';
import { targetIsObserved, validateMoveKnowledge } from './knowledge-legality';
import { topologyForWorld } from './territory';
import { legalDeploymentCells } from './deployment';

function initialAI(enabled: boolean): AICommanderState {
  return {
    enabled,
    profile: 'balanced',
    nextEvaluationTick: 0,
    commitments: [],
    pendingCommands: [],
    nextCommandOrdinal: 1,
  };
}

export function createInitialAIState(aiFactions: readonly Faction[] = []): Readonly<Record<Faction, AICommanderState>> {
  const enabled = new Set(aiFactions);
  return { victoria: initialAI(enabled.has('victoria')), obsidian: initialAI(enabled.has('obsidian')) };
}

export function aiCommandPayload(command: SimCommand): SimCommand { return command; }

export type UtilityChannels = Readonly<{
  kingSafety: number;
  nodeControl: number;
  formationValue: number;
  mobilityPressure: number;
  materialRisk: number;
  attackOpportunity: number;
  heroThreat: number;
}>;

export type ScoredStrategicIntention = Readonly<{
  intention: StrategicIntention;
  objectiveId: string;
  score: number;
  channels: UtilityChannels;
}>;

export const BALANCED_AI_WEIGHTS: Readonly<UtilityChannels> = {
  kingSafety: 5,
  nodeControl: 4,
  formationValue: 2,
  mobilityPressure: 2,
  materialRisk: 3,
  attackOpportunity: 4,
  heroThreat: 2,
};

const UNIT_MATERIAL: Readonly<Record<UnitKind, number>> = {
  pawn: 1, knight: 2, bishop: 2, rook: 3, queen: 4, king: 8,
};

function otherFaction(faction:Faction):Faction { return faction==='victoria'?'obsidian':'victoria'; }
function distance(a:{x:number;y:number},b:{x:number;y:number}):number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
function zeroChannels():UtilityChannels { return {kingSafety:0,nodeControl:0,formationValue:0,mobilityPressure:0,materialRisk:0,attackOpportunity:0,heroThreat:0}; }
function weighted(channels:UtilityChannels):number {
  return (Object.keys(BALANCED_AI_WEIGHTS) as Array<keyof UtilityChannels>)
    .reduce((sum,key)=>sum+channels[key]*BALANCED_AI_WEIGHTS[key],0);
}
function nearestFriendlyDistance(world:WorldState,faction:Faction,position:{x:number;y:number}):number {
  let best=99;
  for(const id of Object.keys(world.units).sort()){
    const unit=world.units[id];
    const combat=world.combat[id];
    if(!unit||unit.faction!==faction||!combat||combat.health<=0) continue;
    best=Math.min(best,distance(unit.position,position));
  }
  return best;
}
function friendlyMaterial(world:WorldState,faction:Faction):number {
  let value=0;
  for(const id of Object.keys(world.units).sort()){
    const unit=world.units[id]; if(unit?.faction===faction) value+=UNIT_MATERIAL[unit.kind];
  }
  return value;
}
function observedEnemyMaterial(world:WorldState,faction:Faction):number {
  return createFactionKnowledgeView(world,faction).observedEnemyUnits
    .reduce((sum,unit)=>sum+UNIT_MATERIAL[unit.kind],0);
}

export function scoreStrategicIntentions(world:WorldState,faction:Faction):readonly ScoredStrategicIntention[] {
  const informed=refreshFactionIntelligence(world,faction);
  const view=createFactionKnowledgeView(informed,faction);
  const candidates:ScoredStrategicIntention[]=[];
  const enemy=otherFaction(faction);
  const sovereign=informed.match.sovereigns[faction];
  if(sovereign.kingId && sovereign.threatened){
    const channels={...zeroChannels(),kingSafety:2000};
    candidates.push({intention:'defend_king',objectiveId:sovereign.kingId,channels,score:weighted(channels)});
  }

  for(const nodeId of Object.keys(informed.territory.nodes).sort()){
    const node=informed.territory.nodes[nodeId]!;
    if(node.owner===faction&&!node.contested) continue;
    const dist=nearestFriendlyDistance(informed,faction,node.center);
    const nodeValue=node.kind==='crown'?120:70;
    const ownerPressure=node.owner===enemy?35:0;
    const contested=node.contested?20:0;
    const channels={...zeroChannels(),nodeControl:nodeValue+ownerPressure+contested-Math.min(40,dist*3),mobilityPressure:Math.max(0,20-dist)};
    candidates.push({intention:'capture_node',objectiveId:nodeId,channels,score:weighted(channels)});
  }

  const ownMaterial=friendlyMaterial(informed,faction);
  const enemyMaterial=observedEnemyMaterial(informed,faction);
  if(ownMaterial>0){
    const deficit=Math.max(0,enemyMaterial-ownMaterial);
    const channels={...zeroChannels(),formationValue:30,materialRisk:20+deficit*6};
    candidates.push({intention:'reinforce_front',objectiveId:'front',channels,score:weighted(channels)});
  }

  const enemies=view.observedEnemyUnits.filter(unit=>unit.kind!=='king');
  if(enemies.length){
    const heroId=informed.heroes[enemy].heroUnitId;
    const target=[...enemies].sort((a,b)=>{
      const ah=a.id===heroId?1:0,bh=b.id===heroId?1:0;
      return bh-ah||UNIT_MATERIAL[b.kind]-UNIT_MATERIAL[a.kind]||a.id.localeCompare(b.id);
    })[0]!;
    const channels={...zeroChannels(),mobilityPressure:55,attackOpportunity:35,heroThreat:target.id===heroId?40:0,materialRisk:-10};
    candidates.push({intention:'pressure_position',objectiveId:target.id,channels,score:weighted(channels)});
  }

  for(const contact of view.rememberedContacts){
    if(candidates.some(candidate=>candidate.intention==='pressure_position'&&candidate.objectiveId===contact.unitId)) continue;
    const channels={...zeroChannels(),mobilityPressure:28,attackOpportunity:0,materialRisk:8};
    candidates.push({intention:'pressure_position',objectiveId:contact.unitId,channels,score:weighted(channels)});
  }

  const enemyKingId=informed.match.sovereigns[enemy].kingId;
  const enemyKing=enemyKingId?view.observedEnemyUnits.find(unit=>unit.id===enemyKingId):undefined;
  if(enemyKing){
    const dist=nearestFriendlyDistance(informed,faction,enemyKing.position);
    if(dist<=6){
      const channels={...zeroChannels(),attackOpportunity:150+(6-dist)*25,mobilityPressure:20,materialRisk:-Math.max(0,dist-2)*5};
      candidates.push({intention:'attack_king',objectiveId:enemyKing.id,channels,score:weighted(channels)});
    }
  }

  const intentionOrder:Readonly<Record<StrategicIntention,number>>={defend_king:0,attack_king:1,capture_node:2,pressure_position:3,reinforce_front:4};
  return candidates.sort((a,b)=>b.score-a.score||intentionOrder[a.intention]-intentionOrder[b.intention]||a.objectiveId.localeCompare(b.objectiveId));
}

function commitmentValid(world:WorldState,faction:Faction,c:StrategicCommitment):boolean {
  if(c.expiresTick<=world.tick) return false;
  const informed=refreshFactionIntelligence(world,faction);
  const view=createFactionKnowledgeView(informed,faction);
  const enemy=otherFaction(faction);
  if(c.intention==='defend_king') return informed.match.sovereigns[faction].threatened && informed.match.sovereigns[faction].kingId===c.objectiveId;
  if(c.intention==='capture_node') { const node=informed.territory.nodes[c.objectiveId]; return Boolean(node && (node.owner!==faction||node.contested)); }
  if(c.intention==='reinforce_front') return view.friendlyUnits.some(unit=>unit.kind!=='king');
  if(c.intention==='pressure_position') return view.observedEnemyUnits.some(unit=>unit.id===c.objectiveId)||view.rememberedContacts.some(contact=>contact.unitId===c.objectiveId);
  return informed.match.sovereigns[enemy].kingId===c.objectiveId && view.observedEnemyUnits.some(unit=>unit.id===c.objectiveId);
}

export function evaluateBalancedAI(world:WorldState,faction:Faction):{state:WorldState;events:readonly SimEvent[]} {
  const informed=refreshFactionIntelligence(world,faction);
  const ai=informed.ai[faction];
  if(!ai.enabled||informed.match.status!=='active'||informed.tick%10!==0||informed.tick<ai.nextEvaluationTick) return {state:informed,events:[]};
  const events:SimEvent[]=[];
  const preserved:StrategicCommitment[]=[];
  for(const commitment of ai.commitments){
    if(commitmentValid(informed,faction,commitment)) preserved.push(commitment);
    else events.push({type:'ai.commitment.ended',tick:informed.tick,faction,intention:commitment.intention,objectiveId:commitment.objectiveId,reason:commitment.expiresTick<=informed.tick?'expired':'invalidated'});
  }

  const scored=scoreStrategicIntentions(informed,faction);
  const threatened=informed.match.sovereigns[faction].threatened;
  let chosen=[...preserved];
  if(threatened && !chosen.some(c=>c.intention==='defend_king')){
    const emergency=scored.find(c=>c.intention==='defend_king');
    if(emergency){
      if(chosen.length>=3){
        const dropped=chosen.pop()!;
        events.push({type:'ai.commitment.ended',tick:informed.tick,faction,intention:dropped.intention,objectiveId:dropped.objectiveId,reason:'interrupted'});
      }
      chosen.unshift({intention:emergency.intention,objectiveId:emergency.objectiveId,startedTick:informed.tick,expiresTick:informed.tick+30,score:emergency.score});
      events.push({type:'ai.commitment.started',tick:informed.tick,faction,intention:emergency.intention,objectiveId:emergency.objectiveId,expiresTick:informed.tick+30});
    }
  }
  for(const candidate of scored){
    if(chosen.length>=3) break;
    if(chosen.some(c=>c.intention===candidate.intention&&c.objectiveId===candidate.objectiveId)) continue;
    const commitment:StrategicCommitment={intention:candidate.intention,objectiveId:candidate.objectiveId,startedTick:informed.tick,expiresTick:informed.tick+30,score:candidate.score};
    chosen.push(commitment);
    events.push({type:'ai.commitment.started',tick:informed.tick,faction,intention:candidate.intention,objectiveId:candidate.objectiveId,expiresTick:commitment.expiresTick});
  }
  chosen=chosen.slice(0,3);
  const next:AICommanderState={...ai,nextEvaluationTick:informed.tick+10,commitments:chosen};
  events.unshift({type:'ai.evaluated',tick:informed.tick,faction,selected:chosen.map(c=>c.intention)});
  const strategicState={...informed,ai:{...informed.ai,[faction]:next}};
  const generated=commandsForCommitments(strategicState,faction,chosen);
  const scheduled=scheduleAICommands(strategicState,faction,generated);
  return {state:scheduled.state,events:[...events,...scheduled.events]};
}

import { compareSimCommands } from './commands';
import { canUnitAttackTarget } from './combat';
import { CAPACITY_WEIGHT, PIECE_CAP, capacityUsage, commandCapacity, isRecruitUnlocked, pieceCountWithQueue } from './economy';
import { validateMoveGeometry } from './geometry';
import { qualifiesForSovereignLine } from './abilities';
import { RECRUITMENT_COST } from './production';
import { PROMOTION_COST } from './promotion';
import type { Coord, HeroAbilityId, PromotableUnitKind, RecruitableUnitKind } from './types';

const TACTICAL_KIND_PRIORITY:Readonly<Record<UnitKind,number>>={king:0,queen:2,rook:2,bishop:3,knight:3,pawn:4};

export function selectPriorityTarget(world:WorldState,faction:Faction,attackerId?:string):string|null {
  const informed=refreshFactionIntelligence(world,faction);
  const view=createFactionKnowledgeView(informed,faction);
  const planning=createFactionPlanningWorld(informed,faction);
  const enemy=otherFaction(faction);
  const enemyHeroId=informed.heroes[enemy].heroUnitId;
  const candidates=[...view.observedEnemyUnits].filter(unit=>Boolean(informed.combat[unit.id]?.health));
  if(attackerId){
    const kingId=informed.match.sovereigns[enemy].kingId;
    if(kingId&&candidates.some(unit=>unit.id===kingId)&&canUnitAttackTarget(planning,attackerId,kingId)) return kingId;
  }
  const origin=attackerId?informed.units[attackerId]?.position:undefined;
  const rank=(unit:typeof candidates[number])=>unit.id===enemyHeroId?1:unit.kind==='king'?5:TACTICAL_KIND_PRIORITY[unit.kind];
  candidates.sort((a,b)=>rank(a)-rank(b)
    ||(informed.combat[a.id]?.health??999)-(informed.combat[b.id]?.health??999)
    ||(origin?distance(origin,a.position)-distance(origin,b.position):0)
    ||a.id.localeCompare(b.id));
  return candidates[0]?.id??null;
}

export function aiFrontObjective(world:WorldState,faction:Faction):Coord {
  if(topologyForWorld(world).id==='triptych-v2'){
    const nodeId=faction==='victoria'?'minor-w':'minor-e';
    const node=world.territory.nodes[nodeId];
    if(node) return {...node.center};
  }
  return {x:7,y:7};
}

export function pawnIsPromotionEligible(world:WorldState,faction:Faction,position:Coord):boolean {
  if(topologyForWorld(world).id==='triptych-v2'){
    return faction==='victoria'
      ? position.x>=world.width-2
      : position.x<=1;
  }
  return faction==='victoria'?position.y>=14:position.y<=1;
}

export function selectAIReadyDeploymentCell(
  world: WorldState,
  faction: Faction,
  readyId: string,
): Coord | null {
  const objective = aiFrontObjective(world, faction);
  const legal = [...legalDeploymentCells(world, faction, readyId)];
  legal.sort((a, b) =>
    distance(a, objective) - distance(b, objective)
    || a.y - b.y
    || a.x - b.x
  );
  return legal[0] ? { ...legal[0] } : null;
}

function objectivePosition(world:WorldState,faction:Faction,commitment:StrategicCommitment):Coord|null {
  const informed=refreshFactionIntelligence(world,faction);
  const view=createFactionKnowledgeView(informed,faction);
  if(commitment.intention==='capture_node') return informed.territory.nodes[commitment.objectiveId]?.center??null;
  if(commitment.intention==='defend_king') return informed.units[informed.match.sovereigns[faction].kingId??'']?.position??null;
  if(commitment.intention==='reinforce_front') return aiFrontObjective(informed,faction);
  const observed=view.observedEnemyUnits.find(unit=>unit.id===commitment.objectiveId);
  if(observed) return observed.position;
  if(commitment.intention==='pressure_position') return view.rememberedContacts.find(contact=>contact.unitId===commitment.objectiveId)?.position??null;
  return null;
}

function bestProgressMove(world:WorldState,faction:Faction,objective:Coord,used:ReadonlySet<string>):Extract<SimCommand,{type:'move'}>|null {
  const informed=refreshFactionIntelligence(world,faction);
  const planning=createFactionPlanningWorld(informed,faction);
  type Candidate={unitId:string;to:Coord;after:number;before:number};
  const candidates:Candidate[]=[];
  const playableCells=topologyForWorld(planning).allPlayableCells();
  for(const unitId of Object.keys(planning.units).sort()){
    if(used.has(unitId)) continue;
    const unit=planning.units[unitId];
    if(!unit||unit.faction!==faction||unit.kind==='king'||!planning.combat[unitId]||planning.combat[unitId]!.health<=0) continue;
    const before=distance(unit.position,objective);
    for(const to of playableCells){
      if(planning.occupancy[`${to.x},${to.y}`]) continue;
      if(!validateMoveKnowledge(informed,faction,unit.position,to,unit.kind).legal) continue;
      if(!validateMoveGeometry(planning,unit,to).legal) continue;
      const after=distance(to,objective);
      if(after>=before) continue;
      candidates.push({unitId,to,after,before});
    }
  }
  candidates.sort((a,b)=>a.after-b.after||(b.before-b.after)-(a.before-a.after)||a.to.y-b.to.y||a.to.x-b.to.x||a.unitId.localeCompare(b.unitId));
  const best=candidates[0];
  return best?{type:'move',sequence:0,issuedTick:informed.tick,unitId:best.unitId,to:best.to}:null;
}

function legalRecruitKind(world:WorldState,faction:Faction):RecruitableUnitKind|null {
  const kinds:RecruitableUnitKind[]=['rook','bishop','knight','pawn'];
  const legal=kinds.filter(kind=>isRecruitUnlocked(world,faction,kind)
    &&world.economy.crownPower[faction]>=RECRUITMENT_COST[kind]
    &&capacityUsage(world,faction)+CAPACITY_WEIGHT[kind]<=commandCapacity(world,faction)
    &&pieceCountWithQueue(world,faction,kind)<PIECE_CAP[kind]);
  legal.sort((a,b)=>{
    const ac=pieceCountWithQueue(world,faction,a)/PIECE_CAP[a];
    const bc=pieceCountWithQueue(world,faction,b)/PIECE_CAP[b];
    return ac-bc||kinds.indexOf(a)-kinds.indexOf(b);
  });
  return legal[0]??null;
}

function legalPromotion(world:WorldState,faction:Faction):{pawnId:string;targetKind:PromotableUnitKind}|null {
  const pawns=Object.keys(world.units).sort().map(id=>world.units[id]!).filter(unit=>unit.faction===faction&&unit.kind==='pawn'
    &&pawnIsPromotionEligible(world,faction,unit.position)
    &&!world.promotions.pending.some(p=>p.pawnId===unit.id));
  for(const pawn of pawns){
    const kinds:PromotableUnitKind[]=['rook','bishop','knight'];
    for(const kind of kinds){
      if(!isRecruitUnlocked(world,faction,kind)) continue;
      if(world.economy.crownPower[faction]<PROMOTION_COST[kind]) continue;
      if(capacityUsage(world,faction)+CAPACITY_WEIGHT[kind]-CAPACITY_WEIGHT.pawn>commandCapacity(world,faction)) continue;
      if(pieceCountWithQueue(world,faction,kind)>=PIECE_CAP[kind]) continue;
      return {pawnId:pawn.id,targetKind:kind};
    }
  }
  return null;
}

function nearbyAllies(world:WorldState,faction:Faction,heroId:string,radius:number):number {
  const hero=world.units[heroId]; if(!hero)return 0;
  return Object.values(world.units).filter(unit=>unit.id!==heroId&&unit.faction===faction&&Boolean(world.combat[unit.id]?.health)&&distance(hero.position,unit.position)<=radius).length;
}
function localForce(world:WorldState,faction:Faction,viewer:Faction,position:Coord,radius:number):number {
  if(faction===viewer){
    return Object.values(world.units).filter(unit=>unit.faction===faction&&Boolean(world.combat[unit.id]?.health)&&distance(position,unit.position)<=radius)
      .reduce((sum,unit)=>sum+UNIT_MATERIAL[unit.kind],0);
  }
  return createFactionKnowledgeView(world,viewer).observedEnemyUnits
    .filter(unit=>distance(position,unit.position)<=radius)
    .reduce((sum,unit)=>sum+UNIT_MATERIAL[unit.kind],0);
}
function abilityReady(world:WorldState,faction:Faction,ability:HeroAbilityId,minLevel:number):boolean {
  const hero=world.heroes[faction];
  return Boolean(hero.heroUnitId&&hero.status==='alive'&&hero.level>=minLevel&&!hero.activeAbility&&hero.abilities[ability].cooldownTicksRemaining===0);
}

function heroAbilityForCommitments(world:WorldState,faction:Faction,commitments:readonly StrategicCommitment[]):HeroAbilityId|null {
  const informed=refreshFactionIntelligence(world,faction);
  const view=createFactionKnowledgeView(informed,faction);
  const hero=informed.heroes[faction]; const heroId=hero.heroUnitId; if(!heroId)return null;
  if(commitments.some(c=>c.intention==='defend_king')&&abilityReady(informed,faction,'hold_the_crown',2)) return 'hold_the_crown';
  const offensive=commitments.some(c=>c.intention==='attack_king'||c.intention==='pressure_position'||c.intention==='capture_node');
  if(offensive&&abilityReady(informed,faction,'imperial_gambit',5)){
    const hu=informed.units[heroId]; const enemy=otherFaction(faction); const enemyKingId=informed.match.sovereigns[enemy].kingId;
    const ek=enemyKingId?view.observedEnemyUnits.find(unit=>unit.id===enemyKingId):undefined;
    if(hu&&localForce(informed,faction,faction,hu.position,5)>localForce(informed,enemy,faction,hu.position,5)&&(ek&&distance(hu.position,ek.position)<=8)) return 'imperial_gambit';
  }
  if(offensive&&abilityReady(informed,faction,'sovereign_line',3)&&qualifiesForSovereignLine(informed,faction)) return 'sovereign_line';
  if(offensive&&abilityReady(informed,faction,'royal_decree',1)&&nearbyAllies(informed,faction,heroId,hero.level>=4?5:4)>=2) return 'royal_decree';
  return null;
}

export function commandsForCommitments(world:WorldState,faction:Faction,commitments:readonly StrategicCommitment[]):readonly SimCommand[] {
  const informed=refreshFactionIntelligence(world,faction);
  const commands:SimCommand[]=[];
  const usedMovers=new Set<string>();
  let sequence=informed.ai[faction].nextCommandOrdinal;
  const push=(command:SimCommand)=>{ if(commands.length<6){commands.push(command);sequence+=1;} };

  for (const entry of [...informed.production.ready[faction]].sort((a,b)=>a.id.localeCompare(b.id))) {
    if (commands.length >= 6) break;
    const to = selectAIReadyDeploymentCell(informed, faction, entry.id);
    if (!to) continue;
    push({
      type: 'deploy_ready',
      sequence,
      issuedTick: informed.tick,
      faction,
      readyId: entry.id,
      to,
    });
  }

  const ability=heroAbilityForCommitments(informed,faction,commitments);
  const heroId=informed.heroes[faction].heroUnitId;
  if(ability&&heroId) push({type:'hero_ability',sequence,issuedTick:informed.tick,faction,heroId,ability});

  for(const commitment of commitments){
    if(commands.length>=6) break;
    if(commitment.intention==='reinforce_front'){
      const kind=legalRecruitKind(informed,faction);
      if(kind) push({type:'recruit',sequence,issuedTick:informed.tick,faction,unitKind:kind});
      continue;
    }
    if(commitment.intention==='pressure_position'||commitment.intention==='attack_king'||commitment.intention==='defend_king'){
      const attackers=Object.keys(informed.units).sort().filter(id=>informed.units[id]?.faction===faction&&informed.units[id]?.kind!=='king'&&Boolean(informed.combat[id]?.health));
      const attacker=attackers[0];
      const directTarget=commitment.intention==='defend_king'
        ? informed.match.sovereigns[faction].threateningUnitIds.find(id=>targetIsObserved(informed,faction,id))??null
        : (targetIsObserved(informed,faction,commitment.objectiveId)?commitment.objectiveId:null);
      const target=directTarget??(attacker?selectPriorityTarget(informed,faction,attacker):null);
      if(attacker&&target) push({type:'attack',sequence,issuedTick:informed.tick,unitId:attacker,targetId:target});
    }
    const objective=objectivePosition(informed,faction,commitment);
    if(objective&&commands.length<6){
      const move=bestProgressMove(informed,faction,objective,usedMovers);
      if(move){ usedMovers.add(move.unitId); push({...move,sequence}); }
    }
  }

  if(commands.length<6&&commitments.some(c=>c.intention==='pressure_position'||c.intention==='reinforce_front')){
    const promotion=legalPromotion(informed,faction);
    if(promotion) push({type:'promote',sequence,issuedTick:informed.tick,faction,...promotion});
  }
  return commands.slice(0,6).sort(compareSimCommands);
}

function commandActorId(command:SimCommand):string {
  if(command.type==='hero_ability') return command.heroId;
  if(command.type==='recruit') return command.faction;
  if(command.type==='promote') return command.pawnId;
  if(command.type==='deploy_ready') return command.readyId;
  return command.unitId;
}

export function scheduleAICommands(world:WorldState,faction:Faction,commands:readonly SimCommand[]):{state:WorldState;events:readonly SimEvent[]} {
  const limited=[...commands].sort(compareSimCommands).slice(0,6);
  if(!limited.length)return {state:world,events:[]};
  const executeTick=world.tick+1;
  const pending=[...world.ai[faction].pendingCommands,...limited.map(command=>({executeTick,command}))]
    .sort((a,b)=>a.executeTick-b.executeTick||compareSimCommands(a.command,b.command));
  const maxSequence=Math.max(world.ai[faction].nextCommandOrdinal-1,...limited.map(c=>c.sequence));
  const ai={...world.ai[faction],pendingCommands:pending,nextCommandOrdinal:maxSequence+1};
  return {
    state:{...world,ai:{...world.ai,[faction]:ai}},
    events:limited.map(command=>({type:'ai.command.scheduled',tick:world.tick,faction,executeTick,actorId:commandActorId(command),commandType:command.type})),
  };
}

function shadowOrderId(
  world: WorldState,
  ordinal: number,
): string {
  return `obsidian-r${world.turn.round}-o${ordinal}`;
}

function legalImmediateTarget(
  world: WorldState,
  attackerId: string,
): string | null {
  const informed=refreshFactionIntelligence(world,'obsidian');
  const planning=createFactionPlanningWorld(informed,'obsidian');
  const observed=new Set(createFactionKnowledgeView(informed,'obsidian').observedEnemyUnits.map(unit=>unit.id));
  const enemies =
    [...observed]
      .sort()
      .filter(id => canUnitAttackTarget(planning, attackerId, id));

  const kingId =
    informed.match
      .sovereigns
      .victoria
      .kingId;

  if (
    kingId &&
    enemies.includes(kingId)
  ) {
    return kingId;
  }

  const heroId =
    informed.heroes
      .victoria
      .heroUnitId;

  if (
    heroId &&
    enemies.includes(heroId)
  ) {
    return heroId;
  }

  return enemies[0] ?? null;
}

export function planShadowTurn(
  world: WorldState,
): readonly TacticalOrder[] {
  if (
    world.match.status !==
      'active' ||
    world.turn.phase !==
      'shadow_command'
  ) {
    return [];
  }

  const faction:
    Faction = 'obsidian';
  const informed=refreshFactionIntelligence(world,faction);
  const planning=createFactionPlanningWorld(informed,faction);
  const availableRoyalCommands = Math.max(
    0,
    Math.min(
      4,
      informed.turn.royalCommandsRemaining[faction],
    ),
  );

  if (availableRoyalCommands === 0) {
    return [];
  }

  const orders:
    TacticalOrder[] = [];

  const usedActors =
    new Set<string>();

  type DraftTacticalOrder =
    TacticalOrder extends infer Order
      ? Order extends TacticalOrder
        ? Omit<
            Order,
            | 'orderId'
            | 'issuedRound'
            | 'commandCost'
          >
        : never
      : never;

  const push = (
    order:
      DraftTacticalOrder,
  ): void => {
    if (orders.length >= availableRoyalCommands) {
      return;
    }

    orders.push({
      ...order,
      orderId:
        shadowOrderId(
          informed,
          orders.length,
        ),
      issuedRound:
        informed.turn.round,
      commandCost: 1,
    } as TacticalOrder);
  };

  /*
   * Priority 1:
   * sovereign survival.
   */
  if (
    informed.match
      .sovereigns
      .obsidian
      .threatened
  ) {
    const threats = [
      ...informed.match
        .sovereigns
        .obsidian
        .threateningUnitIds,
    ].filter(id=>targetIsObserved(informed,faction,id)).sort();

    for (
      const threatId of threats
    ) {
      const defenders =
        Object.keys(planning.units)
          .sort()
          .filter(id => {
            const unit =
              planning.units[id];

            return Boolean(
              unit &&
              unit.faction ===
                faction &&
              !usedActors.has(id) &&
              canUnitAttackTarget(
                planning,
                id,
                threatId,
              ),
            );
          });

      const defender =
        defenders[0];

      if (!defender) {
        continue;
      }

      push({
        kind: 'attack',
        faction,
        unitId: defender,
        targetUnitId:
          threatId,
      });

      usedActors.add(
        defender,
      );

      if (orders.length >= availableRoyalCommands) {
        return orders;
      }
    }
  }

  /*
   * Priority 2:
   * immediate legal attacks.
   */
  for (
    const attackerId of
    Object.keys(planning.units)
      .sort()
  ) {
    if (orders.length >= availableRoyalCommands) {
      break;
    }

    if (
      usedActors.has(
        attackerId,
      )
    ) {
      continue;
    }

    const attacker =
      planning.units[
        attackerId
      ];

    if (
      !attacker ||
      attacker.faction !==
        faction ||
      !planning.combat[
        attackerId
      ] ||
      planning.combat[
        attackerId
      ]!.health <= 0
    ) {
      continue;
    }

    const targetId =
      legalImmediateTarget(
        informed,
        attackerId,
      );

    if (!targetId) {
      continue;
    }

    push({
      kind: 'attack',
      faction,
      unitId:
        attackerId,
      targetUnitId:
        targetId,
    });

    usedActors.add(
      attackerId,
    );
  }

  if (orders.length >= availableRoyalCommands) {
    return orders;
  }

  /*
   * Priorities 3-6:
   * use the existing deterministic
   * strategic scoring to choose
   * objective-progress movement.
   */
  const intentions =
    scoreStrategicIntentions(
      informed,
      faction,
    );

  for (
    const candidate of intentions
  ) {
    if (orders.length >= availableRoyalCommands) {
      break;
    }

    const commitment:
      StrategicCommitment = {
        intention:
          candidate.intention,
        objectiveId:
          candidate.objectiveId,
        startedTick:
          informed.tick,
        expiresTick:
          informed.tick + 1,
        score:
          candidate.score,
      };

    const objective =
      objectivePosition(
        informed,
        faction,
        commitment,
      );

    if (!objective) {
      continue;
    }

    const move =
      bestProgressMove(
        informed,
        faction,
        objective,
        usedActors,
      );

    if (!move) {
      continue;
    }

    push({
      kind: 'move',
      faction,
      unitId:
        move.unitId,
      destination:
        move.to,
    });

    usedActors.add(
      move.unitId,
    );
  }

  return orders;
}
