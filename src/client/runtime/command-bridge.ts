import type {
  Coord,
  Faction,
  HeroAbilityId,
  PromotableUnitKind,
  RecruitableUnitKind,
  SimCommand,
} from '../../sim/types';

type ScheduledClientCommand = Readonly<{
  executeTick: number;
  command: SimCommand;
}>;

type ClientCommandInput =
  SimCommand extends infer Command
    ? Command extends SimCommand
      ? Omit<Command, 'sequence' | 'issuedTick'>
      : never
    : never;

export class ClientCommandBridge {
  private nextSequence = 0;
  private readonly pending: ScheduledClientCommand[] = [];

  private schedule(
    issuedTick: number,
    command: ClientCommandInput,
  ): void {
    this.pending.push({
      executeTick: issuedTick + 1,
      command: {
        ...command,
        sequence: this.nextSequence++,
        issuedTick,
      } as SimCommand,
    });
  }

  move(
    issuedTick: number,
    unitId: string,
    to: Coord,
  ): void {
    this.schedule(issuedTick, {
      type: 'move',
      unitId,
      to,
    });
  }

  attack(
    issuedTick: number,
    unitId: string,
    targetId: string,
  ): void {
    this.schedule(issuedTick, {
      type: 'attack',
      unitId,
      targetId,
    });
  }

  recruit(
    issuedTick: number,
    faction: Faction,
    unitKind: RecruitableUnitKind,
  ): void {
    this.schedule(issuedTick, {
      type: 'recruit',
      faction,
      unitKind,
    });
  }

  heroAbility(
    issuedTick: number,
    faction: Faction,
    heroId: string,
    ability: HeroAbilityId,
  ): void {
    this.schedule(issuedTick, {
      type: 'hero_ability',
      faction,
      heroId,
      ability,
    });
  }

  promote(
    issuedTick: number,
    faction: Faction,
    pawnId: string,
    targetKind: PromotableUnitKind,
  ): void {
    this.schedule(issuedTick, {
      type: 'promote',
      faction,
      pawnId,
      targetKind,
    });
  }

  drain(tick: number): readonly SimCommand[] {
    const due: SimCommand[] = [];
    const future: ScheduledClientCommand[] = [];

    for (const scheduled of this.pending) {
      if (scheduled.executeTick <= tick) {
        due.push(scheduled.command);
      } else {
        future.push(scheduled);
      }
    }

    this.pending.length = 0;
    this.pending.push(...future);

    return due;
  }
}
