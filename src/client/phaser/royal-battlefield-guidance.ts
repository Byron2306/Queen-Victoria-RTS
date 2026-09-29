import type { ProductionReceipt } from '../../sim/production';

export type RoyalBattlefieldGuidanceInput = Readonly<{
  selectedUnitId: string | null;
  stagedOrders: number;
  royalCommandsRemaining: number;
  phase: string;
  attackableTargets?: number;
  productionFeedback?: ProductionReceipt | null;
}>;

export type RoyalBattlefieldGuidance = Readonly<{
  headline: string;
  instruction: string;
  detail: string;
}>;

function productionGuidance(
  feedback: ProductionReceipt,
): RoyalBattlefieldGuidance {
  const unit = feedback.unitKind.toUpperCase();

  if (feedback.accepted) {
    return {
      headline: 'YOUR TURN',
      instruction: `${unit} QUEUED`,
      detail: `${feedback.cost} Crown committed · ${feedback.remainingCurrency} Crown remaining · deployment resolves at reinforcement.`,
    };
  }

  const instructions: Record<string, string> = {
    insufficient_crown: 'NEED MORE CROWN',
    locked: 'UNIT LOCKED',
    capacity_exceeded: 'COMMAND CAPACITY FULL',
    piece_cap_reached: 'PIECE CAP REACHED',
    invalid_deployment_territory: 'DEPLOYMENT TERRITORY INVALID',
    blocked_spawn: 'DEPLOYMENT BLOCKED',
    deployment_relocked: 'DEPLOYMENT RELOCKED',
    match_ended: 'MATCH COMPLETE',
  };

  return {
    headline: 'DEPLOYMENT REFUSED',
    instruction: instructions[feedback.reason ?? ''] ?? 'DEPLOYMENT REFUSED',
    detail: `${unit} costs ${feedback.cost} Crown · ${feedback.remainingCurrency} Crown available.`,
  };
}

export function createRoyalBattlefieldGuidance(
  input: RoyalBattlefieldGuidanceInput,
): RoyalBattlefieldGuidance {
  if (input.phase !== 'victoria_command') {
    return {
      headline: input.phase
        .replaceAll('_', ' ')
        .toUpperCase(),
      instruction: 'RESOLVING THE ROUND',
      detail: 'Orders are being resolved through the Royal Tactical system.',
    };
  }

  if (input.productionFeedback) {
    return productionGuidance(input.productionFeedback);
  }

  if (input.royalCommandsRemaining <= 0) {
    return {
      headline: 'YOUR TURN',
      instruction: 'ROYAL COMMANDS SPENT · COMMIT ORDERS',
      detail: 'Commit the staged orders to resolve the round.',
    };
  }

  if (input.stagedOrders > 0) {
    return {
      headline: 'YOUR TURN',
      instruction: 'ORDER QUEUED · COMMIT WHEN READY',
      detail: `${input.royalCommandsRemaining} Royal Command${input.royalCommandsRemaining === 1 ? '' : 's'} remaining. Select another unit or commit the round.`,
    };
  }

  if (input.selectedUnitId) {
    if ((input.attackableTargets ?? 0) > 0) {
      return {
        headline: 'YOUR TURN',
        instruction: 'MOVE OR ATTACK',
        detail: 'Crimson tiles are legal moves. Tap a highlighted Shadow unit to queue an attack.',
      };
    }

    return {
      headline: 'YOUR TURN',
      instruction: 'TAP A CRIMSON TILE',
      detail: 'Premium crimson markers are legal destinations. Tap one to queue the move.',
    };
  }

  return {
    headline: 'YOUR TURN',
    instruction: 'TAP A UNIT',
    detail: 'Choose a Victoria unit to reveal legal moves and attack targets.',
  };
}
