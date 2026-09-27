import { projectThreatCells } from './threats';
import type { UnitState, WorldState } from './types';
import { coordKey } from './world';

export type PositionalTag = 'pawn_chain' | 'knight_fork' | 'bishop_line' | 'rook_open_file';
export type PositionalAttackEvaluation = Readonly<{
  multiplierBps: number;
  tags: readonly PositionalTag[];
}>;

const BASE_MULTIPLIER_BPS = 10000;
const POSITIONAL_MULTIPLIER_BPS = 12500;

function livingEnemy(world: WorldState, attacker: UnitState, candidate: UnitState): boolean {
  const combat = world.combat[candidate.id];
  return candidate.faction !== attacker.faction && Boolean(combat && combat.health > 0);
}

function targetIsThreatened(world: WorldState, attacker: UnitState, target: UnitState): boolean {
  const targetKey = coordKey(target.position);
  return projectThreatCells(world, attacker).some((cell) => coordKey(cell) === targetKey);
}

function hasPawnChainSupport(world: WorldState, attacker: UnitState): boolean {
  const forward = attacker.faction === 'victoria' ? 1 : -1;
  const behindY = attacker.position.y - forward;
  for (const x of [attacker.position.x - 1, attacker.position.x + 1]) {
    const supporterId = world.occupancy[`${x},${behindY}`];
    if (!supporterId) continue;
    const supporter = world.units[supporterId];
    const combat = world.combat[supporterId];
    if (supporter && supporter.kind === 'pawn' && supporter.faction === attacker.faction && combat && combat.health > 0) return true;
  }
  return false;
}

function hasKnightFork(world: WorldState, attacker: UnitState, target: UnitState): boolean {
  const threatened = new Set(projectThreatCells(world, attacker).map(coordKey));
  if (!threatened.has(coordKey(target.position))) return false;
  let enemies = 0;
  for (const candidate of Object.values(world.units)) {
    if (livingEnemy(world, attacker, candidate) && threatened.has(coordKey(candidate.position))) enemies += 1;
  }
  return enemies >= 2;
}

export function evaluatePositionalAttack(world: WorldState, attackerId: string, targetId: string): PositionalAttackEvaluation {
  const attacker = world.units[attackerId];
  const target = world.units[targetId];
  const attackerCombat = world.combat[attackerId];
  const targetCombat = world.combat[targetId];
  if (!attacker || !target || !attackerCombat || !targetCombat || attackerCombat.health <= 0 || targetCombat.health <= 0 || target.faction === attacker.faction) {
    return { multiplierBps: BASE_MULTIPLIER_BPS, tags: [] };
  }

  const dx = Math.abs(target.position.x - attacker.position.x);
  const dy = Math.abs(target.position.y - attacker.position.y);
  const distance = Math.max(dx, dy);
  const tags: PositionalTag[] = [];

  if (attacker.kind === 'pawn' && hasPawnChainSupport(world, attacker)) {
    tags.push('pawn_chain');
  } else if (attacker.kind === 'knight' && hasKnightFork(world, attacker, target)) {
    tags.push('knight_fork');
  } else if (attacker.kind === 'bishop' && distance >= 2 && dx === dy && targetIsThreatened(world, attacker, target)) {
    tags.push('bishop_line');
  } else if (attacker.kind === 'rook' && distance >= 2 && (dx === 0 || dy === 0) && targetIsThreatened(world, attacker, target)) {
    tags.push('rook_open_file');
  }

  return {
    multiplierBps: tags.length > 0 ? POSITIONAL_MULTIPLIER_BPS : BASE_MULTIPLIER_BPS,
    tags,
  };
}
