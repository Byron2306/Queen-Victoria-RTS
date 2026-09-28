import type { TacticalOrder } from './orders';
import type {
  AICommanderState, Faction, SimCommand, SimEvent, StrategicCommitment, StrategicIntention,
  UnitKind, WorldState,
} from './types';

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
function localMaterial(world:WorldState,faction:Faction):number {
  let value=0;
  for(const id of Object.keys(world.units).sort()){
    const unit=world.units[id]; if(unit?.faction===faction) value+=UNIT_MATERIAL[unit.kind];
  }
  return value;
}

export function scoreStrategicIntentions(world:WorldState,faction:Faction):readonly ScoredStrategicIntention[] {
  const candidates:ScoredStrategicIntention[]=[];
  const enemy=otherFaction(faction);
  const sovereign=world.match.sovereigns[faction];
  if(sovereign.kingId && sovereign.threatened){
    const channels={...zeroChannels(),kingSafety:2000};
    candidates.push({intention:'defend_king',objectiveId:sovereign.kingId,channels,score:weighted(channels)});
  }

  for(const nodeId of Object.keys(world.territory.nodes).sort()){
    const node=world.territory.nodes[nodeId]!;
    if(node.owner===faction&&!node.contested) continue;
    const dist=nearestFriendlyDistance(world,faction,node.center);
    const nodeValue=node.kind==='crown'?120:70;
    const ownerPressure=node.owner===enemy?35:0;
    const contested=node.contested?20:0;
    const channels={...zeroChannels(),nodeControl:nodeValue+ownerPressure+contested-Math.min(40,dist*3),mobilityPressure:Math.max(0,20-dist)};
    candidates.push({intention:'capture_node',objectiveId:nodeId,channels,score:weighted(channels)});
  }

  const friendlyMaterial=localMaterial(world,faction);
  const enemyMaterial=localMaterial(world,enemy);
  if(friendlyMaterial>0){
    const deficit=Math.max(0,enemyMaterial-friendlyMaterial);
    const channels={...zeroChannels(),formationValue:30,materialRisk:20+deficit*6};
    candidates.push({intention:'reinforce_front',objectiveId:'front',channels,score:weighted(channels)});
  }

  const enemies=Object.keys(world.units).sort().map(id=>world.units[id]!).filter(unit=>unit.faction===enemy&&unit.kind!=='king');
  if(enemies.length){
    const heroId=world.heroes[enemy].heroUnitId;
    const target=[...enemies].sort((a,b)=>{
      const ah=a.id===heroId?1:0,bh=b.id===heroId?1:0;
      return bh-ah||UNIT_MATERIAL[b.kind]-UNIT_MATERIAL[a.kind]||a.id.localeCompare(b.id);
    })[0]!;
    const channels={...zeroChannels(),mobilityPressure:55,attackOpportunity:35,heroThreat:target.id===heroId?40:0,materialRisk:-10};
    candidates.push({intention:'pressure_position',objectiveId:target.id,channels,score:weighted(channels)});
  }

  const enemyKingId=world.match.sovereigns[enemy].kingId;
  const enemyKing=enemyKingId?world.units[enemyKingId]:undefined;
  if(enemyKing){
    const dist=nearestFriendlyDistance(world,faction,enemyKing.position);
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
  const enemy=otherFaction(faction);
  if(c.intention==='defend_king') return world.match.sovereigns[faction].threatened && world.match.sovereigns[faction].kingId===c.objectiveId;
  if(c.intention==='capture_node') { const node=world.territory.nodes[c.objectiveId]; return Boolean(node && (node.owner!==faction||node.contested)); }
  if(c.intention==='reinforce_front') return Object.values(world.units).some(unit=>unit.faction===faction&&unit.kind!=='king');
  if(c.intention==='pressure_position') return Boolean(world.units[c.objectiveId]?.faction===enemy);
  return world.match.sovereigns[enemy].kingId===c.objectiveId && Boolean(world.units[c.objectiveId]);
}

export function evaluateBalancedAI(world:WorldState,faction:Faction):{state:WorldState;events:readonly SimEvent[]} {
  const ai=world.ai[faction];
  if(!ai.enabled||world.match.status!=='active'||world.tick%10!==0||world.tick<ai.nextEvaluationTick) return {state:world,events:[]};
  const events:SimEvent[]=[];
  const preserved:StrategicCommitment[]=[];
  for(const commitment of ai.commitments){
    if(commitmentValid(world,faction,commitment)) preserved.push(commitment);
    else events.push({type:'ai.commitment.ended',tick:world.tick,faction,intention:commitment.intention,objectiveId:commitment.objectiveId,reason:commitment.expiresTick<=world.tick?'expired':'invalidated'});
  }

  const scored=scoreStrategicIntentions(world,faction);
  const threatened=world.match.sovereigns[faction].threatened;
  let chosen=[...preserved];
  if(threatened && !chosen.some(c=>c.intention==='defend_king')){
    const emergency=scored.find(c=>c.intention==='defend_king');
    if(emergency){
      if(chosen.length>=3){
        const dropped=chosen.pop()!;
        events.push({type:'ai.commitment.ended',tick:world.tick,faction,intention:dropped.intention,objectiveId:dropped.objectiveId,reason:'interrupted'});
      }
      chosen.unshift({intention:emergency.intention,objectiveId:emergency.objectiveId,startedTick:world.tick,expiresTick:world.tick+30,score:emergency.score});
      events.push({type:'ai.commitment.started',tick:world.tick,faction,intention:emergency.intention,objectiveId:emergency.objectiveId,expiresTick:world.tick+30});
    }
  }
  for(const candidate of scored){
    if(chosen.length>=3) break;
    if(chosen.some(c=>c.intention===candidate.intention&&c.objectiveId===candidate.objectiveId)) continue;
    const commitment:StrategicCommitment={intention:candidate.intention,objectiveId:candidate.objectiveId,startedTick:world.tick,expiresTick:world.tick+30,score:candidate.score};
    chosen.push(commitment);
    events.push({type:'ai.commitment.started',tick:world.tick,faction,intention:candidate.intention,objectiveId:candidate.objectiveId,expiresTick:commitment.expiresTick});
  }
  chosen=chosen.slice(0,3);
  const next:AICommanderState={...ai,nextEvaluationTick:world.tick+10,commitments:chosen};
  events.unshift({type:'ai.evaluated',tick:world.tick,faction,selected:chosen.map(c=>c.intention)});
  const strategicState={...world,ai:{...world.ai,[faction]:next}};
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
  const enemy=otherFaction(faction);
  const enemyHeroId=world.heroes[enemy].heroUnitId;
  const candidates=Object.keys(world.units).sort().map(id=>world.units[id]!).filter(unit=>unit.faction===enemy&&Boolean(world.combat[unit.id]?.health));
  if(attackerId){
    const kingId=world.match.sovereigns[enemy].kingId;
    if(kingId&&canUnitAttackTarget(world,attackerId,kingId)) return kingId;
  }
  const origin=attackerId?world.units[attackerId]?.position:undefined;
  const rank=(unit:typeof candidates[number])=>unit.id===enemyHeroId?1:unit.kind==='king'?5:TACTICAL_KIND_PRIORITY[unit.kind];
  candidates.sort((a,b)=>rank(a)-rank(b)
    ||(world.combat[a.id]?.health??999)-(world.combat[b.id]?.health??999)
    ||(origin?distance(origin,a.position)-distance(origin,b.position):0)
    ||a.id.localeCompare(b.id));
  return candidates[0]?.id??null;
}

function objectivePosition(world:WorldState,faction:Faction,commitment:StrategicCommitment):Coord|null {
  if(commitment.intention==='capture_node') return world.territory.nodes[commitment.objectiveId]?.center??null;
  if(commitment.intention==='defend_king') return world.units[world.match.sovereigns[faction].kingId??'']?.position??null;
  if(commitment.intention==='reinforce_front') return {x:7,y:7};
  return world.units[commitment.objectiveId]?.position??null;
}

function bestProgressMove(world:WorldState,faction:Faction,objective:Coord,used:ReadonlySet<string>):Extract<SimCommand,{type:'move'}>|null {
  type Candidate={unitId:string;to:Coord;after:number;before:number};
  const candidates:Candidate[]=[];
  for(const unitId of Object.keys(world.units).sort()){
    if(used.has(unitId)) continue;
    const unit=world.units[unitId];
    if(!unit||unit.faction!==faction||unit.kind==='king'||!world.combat[unitId]||world.combat[unitId]!.health<=0) continue;
    const before=distance(unit.position,objective);
    for(let y=0;y<16;y+=1) for(let x=0;x<16;x+=1){
      const to={x,y};
      if(world.occupancy[`${x},${y}`]) continue;
      if(!validateMoveGeometry(world,unit,to).legal) continue;
      const after=distance(to,objective);
      if(after>=before) continue;
      candidates.push({unitId,to,after,before});
    }
  }
  candidates.sort((a,b)=>a.after-b.after||(b.before-b.after)-(a.before-a.after)||a.to.y-b.to.y||a.to.x-b.to.x||a.unitId.localeCompare(b.unitId));
  const best=candidates[0];
  return best?{type:'move',sequence:0,issuedTick:world.tick,unitId:best.unitId,to:best.to}:null;
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
    &&(faction==='victoria'?unit.position.y>=14:unit.position.y<=1)
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
function localForce(world:WorldState,faction:Faction,position:Coord,radius:number):number {
  return Object.values(world.units).filter(unit=>unit.faction===faction&&Boolean(world.combat[unit.id]?.health)&&distance(position,unit.position)<=radius)
    .reduce((sum,unit)=>sum+UNIT_MATERIAL[unit.kind],0);
}
function abilityReady(world:WorldState,faction:Faction,ability:HeroAbilityId,minLevel:number):boolean {
  const hero=world.heroes[faction];
  return Boolean(hero.heroUnitId&&hero.status==='alive'&&hero.level>=minLevel&&!hero.activeAbility&&hero.abilities[ability].cooldownTicksRemaining===0);
}

function heroAbilityForCommitments(world:WorldState,faction:Faction,commitments:readonly StrategicCommitment[]):HeroAbilityId|null {
  const hero=world.heroes[faction]; const heroId=hero.heroUnitId; if(!heroId)return null;
  if(commitments.some(c=>c.intention==='defend_king')&&abilityReady(world,faction,'hold_the_crown',2)) return 'hold_the_crown';
  const offensive=commitments.some(c=>c.intention==='attack_king'||c.intention==='pressure_position'||c.intention==='capture_node');
  if(offensive&&abilityReady(world,faction,'imperial_gambit',5)){
    const hu=world.units[heroId]; const enemy=otherFaction(faction); const ek=world.units[world.match.sovereigns[enemy].kingId??''];
    if(hu&&localForce(world,faction,hu.position,5)>localForce(world,enemy,hu.position,5)&&(ek&&distance(hu.position,ek.position)<=8)) return 'imperial_gambit';
  }
  if(offensive&&abilityReady(world,faction,'sovereign_line',3)&&qualifiesForSovereignLine(world,faction)) return 'sovereign_line';
  if(offensive&&abilityReady(world,faction,'royal_decree',1)&&nearbyAllies(world,faction,heroId,hero.level>=4?5:4)>=2) return 'royal_decree';
  return null;
}

export function commandsForCommitments(world:WorldState,faction:Faction,commitments:readonly StrategicCommitment[]):readonly SimCommand[] {
  const commands:SimCommand[]=[];
  const usedMovers=new Set<string>();
  let sequence=world.ai[faction].nextCommandOrdinal;
  const push=(command:SimCommand)=>{ if(commands.length<6){commands.push(command);sequence+=1;} };

  const ability=heroAbilityForCommitments(world,faction,commitments);
  const heroId=world.heroes[faction].heroUnitId;
  if(ability&&heroId) push({type:'hero_ability',sequence,issuedTick:world.tick,faction,heroId,ability});

  for(const commitment of commitments){
    if(commands.length>=6) break;
    if(commitment.intention==='reinforce_front'){
      const kind=legalRecruitKind(world,faction);
      if(kind) push({type:'recruit',sequence,issuedTick:world.tick,faction,unitKind:kind});
      continue;
    }
    if(commitment.intention==='pressure_position'||commitment.intention==='attack_king'||commitment.intention==='defend_king'){
      const attackers=Object.keys(world.units).sort().filter(id=>world.units[id]?.faction===faction&&world.units[id]?.kind!=='king'&&Boolean(world.combat[id]?.health));
      const attacker=attackers[0];
      const target=commitment.intention==='defend_king'
        ? world.match.sovereigns[faction].threateningUnitIds[0]??null
        : (world.units[commitment.objectiveId]?.faction===otherFaction(faction)?commitment.objectiveId:(attacker?selectPriorityTarget(world,faction,attacker):null));
      if(attacker&&target) push({type:'attack',sequence,issuedTick:world.tick,unitId:attacker,targetId:target});
    }
    const objective=objectivePosition(world,faction,commitment);
    if(objective&&commands.length<6){
      const move=bestProgressMove(world,faction,objective,usedMovers);
      if(move){ usedMovers.add(move.unitId); push({...move,sequence}); }
    }
  }

  if(commands.length<6&&commitments.some(c=>c.intention==='pressure_position'||c.intention==='reinforce_front')){
    const promotion=legalPromotion(world,faction);
    if(promotion) push({type:'promote',sequence,issuedTick:world.tick,faction,...promotion});
  }
  return commands.slice(0,6).sort(compareSimCommands);
}

function commandActorId(command:SimCommand):string {
  if(command.type==='hero_ability') return command.heroId;
  if(command.type==='recruit') return command.faction;
  if(command.type==='promote') return command.pawnId;
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
  const enemies =
    Object.keys(world.units)
      .sort()
      .filter(id => {
        const unit =
          world.units[id];

        return Boolean(
          unit &&
          unit.faction ===
            'victoria' &&
          canUnitAttackTarget(
            world,
            attackerId,
            id,
          ),
        );
      });

  const kingId =
    world.match
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
    world.heroes
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
    if (orders.length >= 4) {
      return;
    }

    orders.push({
      ...order,
      orderId:
        shadowOrderId(
          world,
          orders.length,
        ),
      issuedRound:
        world.turn.round,
      commandCost: 1,
    } as TacticalOrder);
  };

  /*
   * Priority 1:
   * sovereign survival.
   */
  if (
    world.match
      .sovereigns
      .obsidian
      .threatened
  ) {
    const threats = [
      ...world.match
        .sovereigns
        .obsidian
        .threateningUnitIds,
    ].sort();

    for (
      const threatId of threats
    ) {
      const defenders =
        Object.keys(world.units)
          .sort()
          .filter(id => {
            const unit =
              world.units[id];

            return Boolean(
              unit &&
              unit.faction ===
                faction &&
              !usedActors.has(id) &&
              canUnitAttackTarget(
                world,
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

      if (orders.length >= 4) {
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
    Object.keys(world.units)
      .sort()
  ) {
    if (orders.length >= 4) {
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
      world.units[
        attackerId
      ];

    if (
      !attacker ||
      attacker.faction !==
        faction ||
      !world.combat[
        attackerId
      ] ||
      world.combat[
        attackerId
      ]!.health <= 0
    ) {
      continue;
    }

    const targetId =
      legalImmediateTarget(
        world,
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

  if (orders.length >= 4) {
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
      world,
      faction,
    );

  for (
    const candidate of intentions
  ) {
    if (orders.length >= 4) {
      break;
    }

    const commitment:
      StrategicCommitment = {
        intention:
          candidate.intention,
        objectiveId:
          candidate.objectiveId,
        startedTick:
          world.tick,
        expiresTick:
          world.tick + 1,
        score:
          candidate.score,
      };

    const objective =
      objectivePosition(
        world,
        faction,
        commitment,
      );

    if (!objective) {
      continue;
    }

    const move =
      bestProgressMove(
        world,
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
