export type Coord = Readonly<{ x: number; y: number }>;
export type Faction = 'victoria' | 'obsidian';
export type UnitKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type CombatStance = 'guard';

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

export type SimCommand = MoveCommand | AttackCommand;
export type MoveRejectReason = 'out_of_bounds' | 'illegal_geometry' | 'blocked' | 'missing_unit' | 'occupied';
export type AttackRejectReason = 'missing_unit' | 'missing_target' | 'self_target' | 'friendly_target' | 'dead_target';

export type SimEvent =
  | Readonly<{ type: 'move.accepted'; tick: number; sequence: number; unitId: string; from: Coord; to: Coord }>
  | Readonly<{ type: 'move.rejected'; tick: number; sequence: number; unitId: string; to: Coord; reason: MoveRejectReason }>
  | Readonly<{ type: 'attack.order.accepted'; tick: number; sequence: number; unitId: string; targetId: string }>
  | Readonly<{ type: 'attack.order.rejected'; tick: number; sequence: number; unitId: string; targetId: string; reason: AttackRejectReason }>;

export type WorldState = Readonly<{
  tick: number;
  width: 16;
  height: 16;
  units: Readonly<Record<string, UnitState>>;
  occupancy: Readonly<Record<string, string>>;
  combat: Readonly<Record<string, UnitCombatState>>;
}>;

export type StepResult = Readonly<{ state: WorldState; events: readonly SimEvent[] }>;
export type ReplayResult = Readonly<{ state: WorldState; eventsByTick: readonly (readonly SimEvent[])[] }>;
