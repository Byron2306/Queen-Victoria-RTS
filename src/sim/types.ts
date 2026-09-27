export type Coord = Readonly<{ x: number; y: number }>;
export type Faction = 'victoria' | 'obsidian';
export type UnitKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export type UnitState = Readonly<{
  id: string;
  faction: Faction;
  kind: UnitKind;
  position: Coord;
}>;

export type MoveCommand = Readonly<{
  type: 'move';
  sequence: number;
  issuedTick: number;
  unitId: string;
  to: Coord;
}>;

export type SimCommand = MoveCommand;
export type MoveRejectReason = 'out_of_bounds' | 'illegal_step' | 'missing_unit' | 'occupied';

export type SimEvent =
  | Readonly<{ type: 'move.accepted'; tick: number; sequence: number; unitId: string; from: Coord; to: Coord }>
  | Readonly<{ type: 'move.rejected'; tick: number; sequence: number; unitId: string; to: Coord; reason: MoveRejectReason }>;

export type WorldState = Readonly<{
  tick: number;
  width: 16;
  height: 16;
  units: Readonly<Record<string, UnitState>>;
  occupancy: Readonly<Record<string, string>>;
}>;

export type StepResult = Readonly<{ state: WorldState; events: readonly SimEvent[] }>;
export type ReplayResult = Readonly<{ state: WorldState; eventsByTick: readonly (readonly SimEvent[])[] }>;
