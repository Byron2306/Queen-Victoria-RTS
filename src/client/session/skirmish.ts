import {
  createWorld,
  type UnitState,
  type WorldState,
} from '../../sim';

export const PHASE6_OPENING_UNITS: readonly UnitState[] = [
  // Victoria sovereign line
  {
    id: 'victoria-king',
    faction: 'victoria',
    kind: 'king',
    position: { x: 7, y: 15 },
  },
  {
    id: 'victoria-queen',
    faction: 'victoria',
    kind: 'queen',
    position: { x: 3, y: 13 },
  },

  {
    id: 'victoria-rook-a',
    faction: 'victoria',
    kind: 'rook',
    position: { x: 5, y: 14 },
  },
  {
    id: 'victoria-rook-b',
    faction: 'victoria',
    kind: 'rook',
    position: { x: 9, y: 14 },
  },

  {
    id: 'victoria-bishop-a',
    faction: 'victoria',
    kind: 'bishop',
    position: { x: 6, y: 13 },
  },
  {
    id: 'victoria-bishop-b',
    faction: 'victoria',
    kind: 'bishop',
    position: { x: 8, y: 13 },
  },

  {
    id: 'victoria-knight-a',
    faction: 'victoria',
    kind: 'knight',
    position: { x: 4, y: 14 },
  },
  {
    id: 'victoria-knight-b',
    faction: 'victoria',
    kind: 'knight',
    position: { x: 10, y: 14 },
  },

  {
    id: 'victoria-pawn-a',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 5, y: 12 },
  },
  {
    id: 'victoria-pawn-b',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 7, y: 12 },
  },
  {
    id: 'victoria-pawn-c',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 9, y: 12 },
  },

  // Obsidian mirror formation
  {
    id: 'obsidian-king',
    faction: 'obsidian',
    kind: 'king',
    position: { x: 7, y: 0 },
  },
  {
    id: 'obsidian-queen',
    faction: 'obsidian',
    kind: 'queen',
    position: { x: 12, y: 2 },
  },

  {
    id: 'obsidian-rook-a',
    faction: 'obsidian',
    kind: 'rook',
    position: { x: 10, y: 1 },
  },
  {
    id: 'obsidian-rook-b',
    faction: 'obsidian',
    kind: 'rook',
    position: { x: 6, y: 1 },
  },

  {
    id: 'obsidian-bishop-a',
    faction: 'obsidian',
    kind: 'bishop',
    position: { x: 9, y: 2 },
  },
  {
    id: 'obsidian-bishop-b',
    faction: 'obsidian',
    kind: 'bishop',
    position: { x: 7, y: 2 },
  },

  {
    id: 'obsidian-knight-a',
    faction: 'obsidian',
    kind: 'knight',
    position: { x: 11, y: 1 },
  },
  {
    id: 'obsidian-knight-b',
    faction: 'obsidian',
    kind: 'knight',
    position: { x: 5, y: 1 },
  },

  {
    id: 'obsidian-pawn-a',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 10, y: 3 },
  },
  {
    id: 'obsidian-pawn-b',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 8, y: 3 },
  },
  {
    id: 'obsidian-pawn-c',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 6, y: 3 },
  },
] as const;

export function createPhase6SkirmishWorld(): WorldState {
  return createWorld(PHASE6_OPENING_UNITS, {
    heroIds: {
      victoria: 'victoria-queen',
    },
    aiFactions: ['obsidian'],
  });
}
