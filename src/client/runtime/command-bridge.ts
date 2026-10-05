import type {
  Coord,
  Faction,
  HeroAbilityId,
  PromotableUnitKind,
  RecruitableUnitKind,
  SimCommand,
  WorldState,
} from '../../sim/types';

import type {
  TacticalOrder,
} from '../../sim/orders';
import type { FortificationKind } from '../../sim/fortifications';

type ScheduledClientCommand =
  Readonly<{
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
  private nextTacticalOrdinal = 0;
  private readonly pendingLegacy: ScheduledClientCommand[] = [];
  private readonly pendingTactical: TacticalOrder[] = [];

  private scheduleLegacy(
    issuedTick: number,
    command: ClientCommandInput,
  ): void {
    this.pendingLegacy.push({
      executeTick: issuedTick + 1,
      command: {
        ...command,
        sequence: this.nextSequence++,
        issuedTick,
      } as SimCommand,
    });
  }

  private stagedCommandCost(faction: Faction): number {
    return this.pendingTactical
      .filter(order => order.faction === faction)
      .reduce((total, order) => total + order.commandCost, 0);
  }

  private canStageTactical(
    world: WorldState,
    faction: Faction,
    commandCost = 1,
  ): boolean {
    return (
      this.stagedCommandCost(faction) + commandCost <=
      world.turn.royalCommandsRemaining[faction]
    );
  }

  private tacticalOrderId(
    world: WorldState,
    faction: Faction,
  ): string {
    return [
      faction,
      `r${world.turn.round}`,
      `o${this.nextTacticalOrdinal++}`,
    ].join('-');
  }

  move(world: WorldState, unitId: string, to: Coord): void {
    const unit = world.units[unitId];
    if (!unit || !this.canStageTactical(world, unit.faction)) return;

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, unit.faction),
      kind: 'move',
      faction: unit.faction,
      unitId,
      destination: { ...to },
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  attack(world: WorldState, unitId: string, targetId: string): void {
    const unit = world.units[unitId];
    if (!unit || !this.canStageTactical(world, unit.faction)) return;

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, unit.faction),
      kind: 'attack',
      faction: unit.faction,
      unitId,
      targetUnitId: targetId,
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  assault(world: WorldState, unitId: string, targetId: string): void {
    const unit = world.units[unitId];
    if (!unit || !this.canStageTactical(world, unit.faction)) return;

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, unit.faction),
      kind: 'assault',
      faction: unit.faction,
      unitId,
      targetUnitId: targetId,
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  reinforce(
    world: WorldState,
    unitId: string,
    supportedUnitId: string,
    rootOrderId: string,
  ): void {
    const unit = world.units[unitId];
    const supported = world.units[supportedUnitId];
    if (
      !unit ||
      !supported ||
      unit.faction !== supported.faction ||
      !this.canStageTactical(world, unit.faction)
    ) {
      return;
    }

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, unit.faction),
      kind: 'reinforce',
      faction: unit.faction,
      unitId,
      supportedUnitId,
      rootOrderId,
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  guard(world: WorldState, unitId: string): void {
    const unit = world.units[unitId];
    if (!unit || !this.canStageTactical(world, unit.faction)) return;

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, unit.faction),
      kind: 'guard',
      faction: unit.faction,
      unitId,
      anchor: { ...unit.position },
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  deployBanner(world: WorldState, faction: Faction, cell: Coord): void {
    if (!this.canStageTactical(world, faction)) return;
    const orderId = this.tacticalOrderId(world, faction);
    this.pendingTactical.push({
      orderId,
      kind: 'deploy_banner',
      faction,
      bannerId: `${orderId}-banner`,
      cell: { ...cell },
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  removeBanner(world: WorldState, faction: Faction, bannerId: string): void {
    if (!this.canStageTactical(world, faction)) return;
    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, faction),
      kind: 'remove_banner',
      faction,
      bannerId,
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  buildFortification(
    world: WorldState,
    faction: Faction,
    fortificationKind: FortificationKind,
    cell: Coord,
  ): void {
    if (!this.canStageTactical(world, faction)) return;
    const orderId = this.tacticalOrderId(world, faction);
    this.pendingTactical.push({
      orderId,
      kind: 'build_fortification',
      faction,
      fortificationId: `${orderId}-fort`,
      fortificationKind,
      cell: { ...cell },
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  repairFortification(
    world: WorldState,
    faction: Faction,
    fortificationId: string,
  ): void {
    if (!this.canStageTactical(world, faction)) return;
    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, faction),
      kind: 'repair_fortification',
      faction,
      fortificationId,
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  annexTile(world: WorldState, faction: Faction, cell: Coord): void {
    if (!this.canStageTactical(world, faction)) return;
    this.pendingTactical.push({
      orderId: this.tacticalOrderId(world, faction),
      kind: 'annex_tile',
      faction,
      cell: { ...cell },
      issuedRound: world.turn.round,
      commandCost: 1,
    });
  }

  recruit(
    issuedTick: number,
    faction: Faction,
    unitKind: RecruitableUnitKind,
  ): void {
    this.scheduleLegacy(issuedTick, {
      type: 'recruit',
      faction,
      unitKind,
    });
  }

  deployReady(
    issuedTick: number,
    faction: Faction,
    readyId: string,
    to: Coord,
  ): void {
    this.scheduleLegacy(issuedTick, {
      type: 'deploy_ready',
      faction,
      readyId,
      to: { ...to },
    });
  }

  heroAbility(
    world: WorldState,
    faction: Faction,
    heroId: string,
    ability: HeroAbilityId,
  ): void;
  heroAbility(
    issuedTick: number,
    faction: Faction,
    heroId: string,
    ability: HeroAbilityId,
  ): void;
  heroAbility(
    worldOrTick: WorldState | number,
    faction: Faction,
    heroId: string,
    ability: HeroAbilityId,
  ): void {
    if (typeof worldOrTick === 'number') {
      this.scheduleLegacy(worldOrTick, {
        type: 'hero_ability',
        faction,
        heroId,
        ability,
      });
      return;
    }

    if (!this.canStageTactical(worldOrTick, faction)) return;

    this.pendingTactical.push({
      orderId: this.tacticalOrderId(worldOrTick, faction),
      kind: 'ability',
      faction,
      unitId: heroId,
      abilityId: ability,
      issuedRound: worldOrTick.turn.round,
      commandCost: 1,
    });
  }

  promote(
    issuedTick: number,
    faction: Faction,
    pawnId: string,
    targetKind: PromotableUnitKind,
  ): void {
    this.scheduleLegacy(issuedTick, {
      type: 'promote',
      faction,
      pawnId,
      targetKind,
    });
  }

  peekTactical(): readonly TacticalOrder[] {
    return [...this.pendingTactical];
  }

  cancelTactical(orderId: string): boolean {
    const index = this.pendingTactical.findIndex(order => order.orderId === orderId);
    if (index < 0) return false;
    this.pendingTactical.splice(index, 1);
    return true;
  }

  drainTactical(): readonly TacticalOrder[] {
    const due = [...this.pendingTactical];
    this.pendingTactical.length = 0;
    return due;
  }

  drainLegacy(tick: number): readonly SimCommand[] {
    const due: SimCommand[] = [];
    const future: ScheduledClientCommand[] = [];

    for (const scheduled of this.pendingLegacy) {
      if (scheduled.executeTick <= tick) due.push(scheduled.command);
      else future.push(scheduled);
    }

    this.pendingLegacy.length = 0;
    this.pendingLegacy.push(...future);
    return due;
  }
}
