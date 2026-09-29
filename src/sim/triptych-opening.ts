import type { UnitState } from './types';

export const TRIPTYCH_OPENING_UNITS: readonly UnitState[] = [
  {
    id: 'victoria-king',
    faction: 'victoria',
    kind: 'king',
    position: { x: 1, y: 11 },
  },
  {
    id: 'victoria-queen',
    faction: 'victoria',
    kind: 'queen',
    position: { x: 5, y: 11 },
  },
  {
    id: 'victoria-rook-a',
    faction: 'victoria',
    kind: 'rook',
    position: { x: 3, y: 9 },
  },
  {
    id: 'victoria-knight-a',
    faction: 'victoria',
    kind: 'knight',
    position: { x: 3, y: 13 },
  },
  {
    id: 'victoria-pawn-a',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 5, y: 10 },
  },
  {
    id: 'victoria-pawn-b',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 5, y: 12 },
  },
  {
    id: 'obsidian-king',
    faction: 'obsidian',
    kind: 'king',
    position: { x: 22, y: 12 },
  },
  {
    id: 'obsidian-queen',
    faction: 'obsidian',
    kind: 'queen',
    position: { x: 18, y: 12 },
  },
  {
    id: 'obsidian-rook-a',
    faction: 'obsidian',
    kind: 'rook',
    position: { x: 20, y: 14 },
  },
  {
    id: 'obsidian-knight-a',
    faction: 'obsidian',
    kind: 'knight',
    position: { x: 20, y: 10 },
  },
  {
    id: 'obsidian-pawn-a',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 18, y: 13 },
  },
  {
    id: 'obsidian-pawn-b',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 18, y: 11 },
  },
] as const;

export function createTriptychOpeningUnits(): UnitState[] {
  return TRIPTYCH_OPENING_UNITS.map((unit) => ({
    ...unit,
    position: { ...unit.position },
  }));
}
