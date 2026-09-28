export type Coord = Readonly<{ x: number; y: number }>;
export type Faction = 'victoria' | 'obsidian';
export type UnitKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type CombatStance = 'guard';
export type RecruitableUnitKind = 'pawn' | 'knight' | 'bishop' | 'rook';
export type PromotableUnitKind = 'knight' | 'bishop' | 'rook';
export type MatchStatus = 'active' | 'victoria_won' | 'obsidian_won' | 'draw';
export type HeroStatus = 'unbound' | 'alive' | 'respawning' | 'ready_to_respawn';
export type HeroAbilityId = 'royal_decree' | 'hold_the_crown' | 'sovereign_line' | 'imperial_gambit';
export type HeroLevel = 1 | 2 | 3 | 4 | 5;
export type HeroAbilityState = Readonly<{ cooldownTicksRemaining: number; activeTicksRemaining: number }>;
export type HeroState = Readonly<{
  heroUnitId: string | null;
  status: HeroStatus;
  level: HeroLevel;
  xp: number;
  respawnTicksRemaining: number;
  activeAbility: HeroAbilityId | null;
  abilities: Readonly<Record<HeroAbilityId, HeroAbilityState>>;
}>;
export type StrategicIntention = 'defend_king' | 'capture_node' | 'reinforce_front' | 'pressure_position' | 'attack_king';
export type StrategicCommitment = Readonly<{
  intention: StrategicIntention;
  objectiveId: string;
  startedTick: number;
  expiresTick: number;
  score: number;
}>;

export type CaptureNodeState = Readonly<{
  id: string;
  kind: 'minor' | 'crown';
  center: Coord;
  owner: Faction | null;
  capturingFaction: Faction | null;
  captureProgressTicks: number;
  contested: boolean;
}>;
export type TerritoryState = Readonly<{ nodes: Readonly<Record<string, CaptureNodeState>> }>;
export type EconomyState = Readonly<{ crownPower: Readonly<Record<Faction, number>> }>;
export type ProductionQueueEntry = Readonly<{
  id: string;
  faction: Faction;
  unitKind: RecruitableUnitKind;
  cost: number;
  capacityWeight: number;
  queuedTick: number;
}>;
export type ProductionState = Readonly<{
  queues: Readonly<Record<Faction, readonly ProductionQueueEntry[]>>;
  nextEntryOrdinal: Readonly<Record<Faction, number>>;
  reinforcementAnchors: Readonly<Record<Faction, Coord>>;
}>;
export type PendingPromotion = Readonly<{
  faction: Faction;
  pawnId: string;
  targetKind: PromotableUnitKind;
  sequence: number;
  requestedTick: number;
}>;
export type PromotionState = Readonly<{ pending: readonly PendingPromotion[] }>;

export type SovereignState = Readonly<{
  kingId: string | null;
  threatened: boolean;
  threateningUnitIds: readonly string[];
}>;

export type MatchState = Readonly<{
  status: MatchStatus;
  victor: Faction | null;
  endedTick: number | null;
  sovereigns: Readonly<Record<Faction, SovereignState>>;
}>;

export type UnitState = Readonly<{
  id: string;
  faction: Faction;
  kind: UnitKind;
  position: Coord;
}>;

export type CombatProfile = Readonly<{
  maxHealth: number;
  damage: number;
  cooldownTicks: number;
  range: number;
  acquisitionRange: number;
  leashRange: number;
}>;

export type UnitCombatState = Readonly<{
  health: number;
  cooldownTicks: number;
  targetId: string | null;
  stance: CombatStance;
  guardAnchor: Coord;
}>;

export type MoveCommand = Readonly<{
  type: 'move';
  sequence: number;
  issuedTick: number;
  unitId: string;
  to: Coord;
}>;

export type AttackCommand = Readonly<{
  type: 'attack';
  sequence: number;
  issuedTick: number;
  unitId: string;
  targetId: string;
}>;


export type RecruitCommand = Readonly<{
  type: 'recruit';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  unitKind: RecruitableUnitKind;
}>;


export type HeroAbilityCommand = Readonly<{
  type: 'hero_ability';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  heroId: string;
  ability: HeroAbilityId;
}>;

export type PromoteCommand = Readonly<{
  type: 'promote';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  pawnId: string;
  targetKind: PromotableUnitKind;
}>;

export type SimCommand = MoveCommand | AttackCommand | RecruitCommand | PromoteCommand | HeroAbilityCommand;
export type ScheduledAICommand = Readonly<{ executeTick: number; command: SimCommand }>;
export type AICommanderState = Readonly<{
  enabled: boolean;
  profile: 'balanced';
  nextEvaluationTick: number;
  commitments: readonly StrategicCommitment[];
  pendingCommands: readonly ScheduledAICommand[];
  nextCommandOrdinal: number;
}>;
export type WorldOptions = Readonly<{
  heroIds?: Partial<Record<Faction, string>>;
  aiFactions?: readonly Faction[];
}>;
export type MoveRejectReason = 'out_of_bounds' | 'illegal_geometry' | 'blocked' | 'missing_unit' | 'occupied' | 'hero_anchored';
export type AttackRejectReason = 'missing_unit' | 'missing_target' | 'self_target' | 'friendly_target' | 'dead_target';

export type SimEvent =
  | Readonly<{ type: 'move.accepted'; tick: number; sequence: number; unitId: string; from: Coord; to: Coord }>
  | Readonly<{ type: 'move.rejected'; tick: number; sequence: number; unitId: string; to: Coord; reason: MoveRejectReason }>
  | Readonly<{ type: 'attack.order.accepted'; tick: number; sequence: number; unitId: string; targetId: string }>
  | Readonly<{ type: 'attack.order.rejected'; tick: number; sequence: number; unitId: string; targetId: string; reason: AttackRejectReason }>
  | Readonly<{ type: 'attack.fired'; tick: number; unitId: string; targetId: string; damage: number; positionalTags: readonly string[] }>
  | Readonly<{ type: 'unit.damaged'; tick: number; unitId: string; damage: number; healthBefore: number; healthAfter: number }>
  | Readonly<{ type: 'unit.killed'; tick: number; unitId: string; byUnitIds: readonly string[]; positionalBonusApplied: boolean }>
  | Readonly<{ type: 'sovereign.threatened'; tick: number; faction: Faction; kingId: string; threateningUnitIds: readonly string[] }>
  | Readonly<{ type: 'sovereign.relief'; tick: number; faction: Faction; kingId: string }>
  | Readonly<{ type: 'sovereign.defeated'; tick: number; faction: Faction; kingId: string; byUnitIds: readonly string[] }>
  | Readonly<{ type: 'match.victory'; tick: number; victor: Faction; defeatedFaction: Faction }>
  | Readonly<{ type: 'match.draw'; tick: number; defeatedKingIds: readonly string[] }>
  | Readonly<{ type: 'node.contested'; tick: number; nodeId: string }>
  | Readonly<{ type: 'node.uncontested'; tick: number; nodeId: string }>
  | Readonly<{ type: 'node.neutralized'; tick: number; nodeId: string; previousOwner: Faction; byFaction: Faction }>
  | Readonly<{ type: 'node.captured'; tick: number; nodeId: string; owner: Faction }>
  | Readonly<{ type: 'crown.income'; tick: number; faction: Faction; amount: number; resultingCrownPower: number; sourceNodeIds: readonly string[] }>
  | Readonly<{ type: 'crown.kill_reward'; tick: number; faction: Faction; defeatedUnitId: string; amount: number; positionalBonusApplied: boolean; resultingCrownPower: number }>
  | Readonly<{ type: 'crown.spent'; tick: number; faction: Faction; amount: number; resultingCrownPower: number; reason: 'recruitment' | 'promotion' }>
  | Readonly<{ type: 'production.queued'; tick: number; faction: Faction; queueEntryId: string; unitKind: RecruitableUnitKind; cost: number }>
  | Readonly<{ type: 'production.rejected'; tick: number; faction: Faction; unitKind: RecruitableUnitKind; reason: 'match_ended' | 'locked' | 'insufficient_crown' | 'capacity_exceeded' | 'piece_cap_reached' }>
  | Readonly<{ type: 'reinforcement.deployed'; tick: number; faction: Faction; queueEntryId: string; unitId: string; unitKind: RecruitableUnitKind; position: Coord }>
  | Readonly<{ type: 'promotion.requested'; tick: number; faction: Faction; pawnId: string; targetKind: PromotableUnitKind }>
  | Readonly<{ type: 'promotion.rejected'; tick: number; faction: Faction; pawnId: string; targetKind: PromotableUnitKind; reason: 'match_ended' | 'missing_pawn' | 'wrong_faction' | 'not_pawn' | 'not_in_zone' | 'already_pending' | 'locked' | 'insufficient_crown' | 'capacity_exceeded' | 'piece_cap_reached' }>
  | Readonly<{ type: 'promotion.completed'; tick: number; faction: Faction; pawnId: string; promotedUnitId: string; targetKind: PromotableUnitKind; position: Coord }>
  | Readonly<{ type: 'hero.ability.activated'; tick: number; faction: Faction; heroId: string; ability: HeroAbilityId; activeTicks: number; cooldownTicks: number }>
  | Readonly<{ type: 'hero.ability.rejected'; tick: number; faction: Faction; heroId: string; ability: HeroAbilityId; reason: 'match_ended' | 'hero_unbound' | 'hero_not_alive' | 'wrong_hero' | 'locked_level' | 'cooldown_active' | 'ability_active' | 'formation_missing' }>
  | Readonly<{ type: 'hero.ability.expired'; tick: number; faction: Faction; heroId: string; ability: HeroAbilityId }>
  | Readonly<{ type: 'hero.xp_gained'; tick: number; faction: Faction; heroId: string; amount: number; defeatedUnitId: string; resultingXp: number }>
  | Readonly<{ type: 'hero.leveled'; tick: number; faction: Faction; heroId: string; fromLevel: HeroLevel; toLevel: HeroLevel; resultingXp: number }>
  | Readonly<{ type: 'hero.defeated'; tick: number; faction: Faction; heroId: string; respawnTicks: number }>
  | Readonly<{ type: 'hero.respawn.ready'; tick: number; faction: Faction; heroId: string }>
  | Readonly<{ type: 'hero.respawned'; tick: number; faction: Faction; heroId: string; position: Coord }>
  | Readonly<{ type: 'ai.evaluated'; tick: number; faction: Faction; selected: readonly StrategicIntention[] }>
  | Readonly<{ type: 'ai.commitment.started'; tick: number; faction: Faction; intention: StrategicIntention; objectiveId: string; expiresTick: number }>
  | Readonly<{ type: 'ai.commitment.ended'; tick: number; faction: Faction; intention: StrategicIntention; objectiveId: string; reason: 'expired' | 'invalidated' | 'interrupted' }>
  | Readonly<{ type: 'ai.command.scheduled'; tick: number; faction: Faction; executeTick: number; actorId: string; commandType: SimCommand['type'] }>
  | Readonly<{ type: 'command.rejected'; tick: number; sequence: number; unitId: string; commandType: MoveCommand['type'] | AttackCommand['type']; reason: 'match_ended' }>;

export type WorldState = Readonly<{
  tick: number;
  width: 16;
  height: 16;
  units: Readonly<Record<string, UnitState>>;
  occupancy: Readonly<Record<string, string>>;
  combat: Readonly<Record<string, UnitCombatState>>;
  match: MatchState;
  territory: TerritoryState;
  economy: EconomyState;
  production: ProductionState;
  promotions: PromotionState;
  heroes: Readonly<Record<Faction, HeroState>>;
  ai: Readonly<Record<Faction, AICommanderState>>;
  turn: import('./turns').TurnState;
}>;

export type StepResult = Readonly<{ state: WorldState; events: readonly SimEvent[] }>;
export type CombatTickResult = Readonly<{ state: WorldState; events: readonly SimEvent[] }>;
export type ReplayResult = Readonly<{ state: WorldState; eventsByTick: readonly (readonly SimEvent[])[] }>;
