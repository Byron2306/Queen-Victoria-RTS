import type { FortificationState } from './fortifications';
import type { UnitState, WorldState } from './types';

export const TRIPTYCH_OPENING_UNITS: readonly UnitState[] = [
  {
    id: 'victoria-king',
    faction: 'victoria',
    kind: 'king',
    position: { x: 2, y: 16 },
  },
  {
    id: 'victoria-queen',
    faction: 'victoria',
    kind: 'queen',
    position: { x: 6, y: 16 },
  },
  {
    id: 'victoria-rook-a',
    faction: 'victoria',
    kind: 'rook',
    position: { x: 4, y: 13 },
  },
  {
    id: 'victoria-knight-a',
    faction: 'victoria',
    kind: 'knight',
    position: { x: 4, y: 19 },
  },
  {
    id: 'victoria-pawn-a',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 6, y: 15 },
  },
  {
    id: 'victoria-pawn-b',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 6, y: 17 },
  },
  {
    id: 'obsidian-king',
    faction: 'obsidian',
    kind: 'king',
    position: { x: 29, y: 15 },
  },
  {
    id: 'obsidian-queen',
    faction: 'obsidian',
    kind: 'queen',
    position: { x: 25, y: 15 },
  },
  {
    id: 'obsidian-rook-a',
    faction: 'obsidian',
    kind: 'rook',
    position: { x: 27, y: 18 },
  },
  {
    id: 'obsidian-knight-a',
    faction: 'obsidian',
    kind: 'knight',
    position: { x: 27, y: 12 },
  },
  {
    id: 'obsidian-pawn-a',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 25, y: 16 },
  },
  {
    id: 'obsidian-pawn-b',
    faction: 'obsidian',
    kind: 'pawn',
    position: { x: 25, y: 14 },
  },
] as const;

export const TRIPTYCH_OPENING_FORTIFICATIONS: readonly FortificationState[] = [
  {
    id: 'victoria-bastion-north',
    faction: 'victoria',
    kind: 'bastion',
    cell: { x: 7, y: 13 },
    durability: 3,
  },
  {
    id: 'victoria-redoubt',
    faction: 'victoria',
    kind: 'redoubt',
    cell: { x: 7, y: 16 },
    durability: 3,
  },
  {
    id: 'victoria-bastion-south',
    faction: 'victoria',
    kind: 'bastion',
    cell: { x: 7, y: 19 },
    durability: 3,
  },
  {
    id: 'obsidian-bastion-south',
    faction: 'obsidian',
    kind: 'bastion',
    cell: { x: 24, y: 18 },
    durability: 3,
  },
  {
    id: 'obsidian-redoubt',
    faction: 'obsidian',
    kind: 'redoubt',
    cell: { x: 24, y: 15 },
    durability: 3,
  },
  {
    id: 'obsidian-bastion-north',
    faction: 'obsidian',
    kind: 'bastion',
    cell: { x: 24, y: 12 },
    durability: 3,
  },
] as const;

export function createTriptychOpeningUnits(): UnitState[] {
  return TRIPTYCH_OPENING_UNITS.map((unit) => ({
    ...unit,
    position: { ...unit.position },
  }));
}

export function applyTriptychOpeningFortifications(
  world: WorldState,
): WorldState {
  const fortifications = Object.fromEntries(
    TRIPTYCH_OPENING_FORTIFICATIONS.map((fortification) => [
      fortification.id,
      {
        ...fortification,
        cell: { ...fortification.cell },
      },
    ]),
  );

  return {
    ...world,
    territory: {
      ...world.territory,
      fortifications,
    } as WorldState['territory'],
  };
}
