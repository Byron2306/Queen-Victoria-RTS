import { advanceTick } from './clock';
import { activateHeroAbility, advanceHeroAbilityLifecycle, heroMovementAnchored } from './abilities';
import { evaluateBalancedAI } from './ai';
import { compareSimCommands } from './commands';
import { resolveCombatTick } from './combat';
import { applyCrownIncome, applyKillRewards } from './economy';
import { validateMoveGeometry } from './geometry';
import { refreshGuardTargets } from './guard';
import { evaluateNodeControl } from './nodes';
import { deployReinforcements, queueRecruitment } from './production';
import { queuePromotionRequest, resolvePromotions } from './promotion';
import { evaluateSovereignThreats, interpretSovereignDefeats } from './sovereign';
import { advanceHeroRespawn, attemptHeroRespawns, interpretHeroCombat } from './hero';
import type { SimCommand, SimEvent, StepResult, WorldState } from './types';
import { coordKey, isInBounds } from './world';

function resolveAttackOrder(world: WorldState, command: Extract<SimCommand, { type: 'attack' }>): { state: WorldState; event: SimEvent } {
  const unit = world.units[command.unitId];
  if (!unit) return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'missing_unit' } };
  const target = world.units[command.targetId];
  if (!target) return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'missing_target' } };
  if (command.targetId === command.unitId) return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'self_target' } };
  if (target.faction === unit.faction) return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'friendly_target' } };
  const targetCombat = world.combat[command.targetId];
  if (!targetCombat || targetCombat.health <= 0) return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'dead_target' } };
  const unitCombat = world.combat[command.unitId];
  const state = unitCombat ? { ...world, combat: { ...world.combat, [command.unitId]: { ...unitCombat, targetId: command.targetId } } } : world;
  return { state, event: { type: 'attack.order.accepted', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId } };
}

function resolveMove(world: WorldState, command: Extract<SimCommand, { type: 'move' }>): { state: WorldState; event: SimEvent } {
  const unit = world.units[command.unitId];
  if (!unit) return { state: world, event: { type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'missing_unit' } };
  if (heroMovementAnchored(world, command.unitId)) return { state: world, event: { type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'hero_anchored' } };
  if (!isInBounds(command.to)) return { state: world, event: { type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'out_of_bounds' } };
  const geometry = validateMoveGeometry(world, unit, command.to);
  if (!geometry.legal) return { state: world, event: { type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: geometry.reason } };
  const targetKey = coordKey(command.to);
  if (world.occupancy[targetKey]) return { state: world, event: { type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'occupied' } };
  const from = unit.position;
  const nextOccupancy = { ...world.occupancy };
  delete nextOccupancy[coordKey(from)];
  nextOccupancy[targetKey] = unit.id;
  const combatState = world.combat[unit.id];
  const state: WorldState = {
    ...world,
    units: { ...world.units, [unit.id]: { ...unit, position: { ...command.to } } },
    occupancy: nextOccupancy,
    combat: combatState ? { ...world.combat, [unit.id]: { ...combatState, guardAnchor: { ...command.to } } } : world.combat,
  };
  return { state, event: { type: 'move.accepted', tick: world.tick, sequence: command.sequence, unitId: unit.id, from, to: command.to } };
}

function terminalRejection(world: WorldState, command: SimCommand): SimEvent {
  if (command.type === 'hero_ability') return { type: 'hero.ability.rejected', tick: world.tick, faction: command.faction, heroId: command.heroId, ability: command.ability, reason: 'match_ended' };
  if (command.type === 'recruit') return { type: 'production.rejected', tick: world.tick, faction: command.faction, unitKind: command.unitKind, reason: 'match_ended' };
  if (command.type === 'promote') return { type: 'promotion.rejected', tick: world.tick, faction: command.faction, pawnId: command.pawnId, targetKind: command.targetKind, reason: 'match_ended' };
  return { type: 'command.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, commandType: command.type, reason: 'match_ended' };
}

export function stepWorld(world: WorldState, commands: readonly SimCommand[]): StepResult {
  const externalOrdered = [...commands].sort(compareSimCommands);
  if (world.match.status !== 'active') return { state: world, events: externalOrdered.map((command) => terminalRejection(world, command)) };

  // Phase 5 stage 2: consume AI commands scheduled by a prior evaluation.
  let preCombatWorld = world;
  const dueAICommands: SimCommand[] = [];
  for (const faction of ['victoria', 'obsidian'] as const) {
    const ai = preCombatWorld.ai[faction];
    const due = ai.pendingCommands.filter((pending) => pending.executeTick <= preCombatWorld.tick);
    const remaining = ai.pendingCommands.filter((pending) => pending.executeTick > preCombatWorld.tick);
    if (due.length) dueAICommands.push(...due.map((pending) => pending.command));
    if (remaining.length !== ai.pendingCommands.length) {
      preCombatWorld = { ...preCombatWorld, ai: { ...preCombatWorld.ai, [faction]: { ...ai, pendingCommands: remaining } } };
    }
  }
  const ordered = [...externalOrdered, ...dueAICommands].sort(compareSimCommands);

  // Stages 3-6: Guard, combat, sovereign outcome, decisive terminal gate.
  const guarded = refreshGuardTargets(preCombatWorld);
  const combatResult = resolveCombatTick(guarded);
  const outcome = interpretSovereignDefeats(guarded, combatResult.state, combatResult.events);
  let working = outcome.state;
  const events: SimEvent[] = [...combatResult.events, ...outcome.events];
  if (working.match.status !== 'active') return { state: working, events };

  // Stage 7: hero death/XP interpretation from the same simultaneous combat instant.
  const heroCombat = interpretHeroCombat(guarded, working, combatResult.events);
  working = heroCombat.state;
  events.push(...heroCombat.events);
  const defeatedFactions = new Set(heroCombat.events.filter((event): event is Extract<SimEvent, { type: 'hero.defeated' }> => event.type === 'hero.defeated').map((event) => event.faction));

  // Stage 8: ability activations always resolve before ordinary commands.
  const abilityCommands = ordered.filter((command): command is Extract<SimCommand, { type: 'hero_ability' }> => command.type === 'hero_ability');
  const ordinaryCommands = ordered.filter((command) => command.type !== 'hero_ability');
  const activatedFactions = new Set<'victoria' | 'obsidian'>();
  for (const command of abilityCommands) {
    const result = activateHeroAbility(working, command);
    working = result.state;
    events.push(...result.events);
    if (result.events.some((event) => event.type === 'hero.ability.activated')) activatedFactions.add(command.faction);
  }

  // Stage 9: ordinary tactical commands. Recruitment/promotion retain Phase 4 delayed phases.
  const recruitCommands: Extract<SimCommand, { type: 'recruit' }>[] = [];
  const promoteCommands: Extract<SimCommand, { type: 'promote' }>[] = [];
  for (const command of ordinaryCommands) {
    if (command.type === 'attack') {
      const result = resolveAttackOrder(working, command); working = result.state; events.push(result.event); continue;
    }
    if (command.type === 'move') {
      const result = resolveMove(working, command); working = result.state; events.push(result.event); continue;
    }
    if (command.type === 'recruit') recruitCommands.push(command);
    else if (command.type === 'promote') promoteCommands.push(command);
  }

  // Stages 10-16: verified Phase 4 territory/economy/production transaction.
  const nodes = evaluateNodeControl(working); working = nodes.state; events.push(...nodes.events);
  const income = applyCrownIncome(working); working = income.state; events.push(...income.events);
  const rewards = applyKillRewards(working, guarded, combatResult.events); working = rewards.state; events.push(...rewards.events);

  for (const command of recruitCommands) {
    const result = queueRecruitment(working, command); working = result.state; events.push(...result.events);
  }
  for (const command of promoteCommands) {
    const result = queuePromotionRequest(working, command); working = result.state; events.push(...result.events);
  }

  const deployments = deployReinforcements(working); working = deployments.state; events.push(...deployments.events);
  const promotions = resolvePromotions(working); working = promotions.state; events.push(...promotions.events);

  // Stage 17: hero lifecycle. New counters keep their full creation-tick values.
  const abilityLifecycle = advanceHeroAbilityLifecycle(working, activatedFactions); working = abilityLifecycle.state; events.push(...abilityLifecycle.events);
  const respawnLifecycle = advanceHeroRespawn(working, defeatedFactions); working = respawnLifecycle.state; events.push(...respawnLifecycle.events);

  // Stage 18: deterministic respawn attempt after all production/promotion changes.
  const respawns = attemptHeroRespawns(working); working = respawns.state; events.push(...respawns.events);

  // Stage 19: AI may observe the fully resolved tick, but only schedules commands for T+1.
  for (const faction of ['victoria', 'obsidian'] as const) {
    const aiResult = evaluateBalancedAI(working, faction); working = aiResult.state; events.push(...aiResult.events);
  }

  // Stages 20-21: sovereign threat truth then fixed tick advance.
  const sovereign = evaluateSovereignThreats(working); events.push(...sovereign.events);
  return { state: advanceTick(sovereign.state), events };
}
