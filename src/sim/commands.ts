import type { SimCommand } from './types';

type OrderedCommand = SimCommand;

function actorKey(command: OrderedCommand): string {
  if (command.type === 'hero_ability') return command.heroId;
  if (command.type === 'recruit') return command.faction;
  if (command.type === 'promote') return command.pawnId;
  return command.unitId;
}

export function compareSimCommands(a: OrderedCommand, b: OrderedCommand): number {
  return a.sequence - b.sequence || actorKey(a).localeCompare(actorKey(b)) || a.type.localeCompare(b.type);
}
