import type {
  HudModel,
} from './model';

function upper(
  value: string,
): string {
  return value
    .replaceAll('_', ' ')
    .toUpperCase();
}

export function createHudTurnText(
  hud: HudModel,
): readonly [string, string, string] {
  return [
    `ROUND ${hud.turn.round}`,
    upper(hud.turn.phase),
    `ROYAL COMMANDS ${hud.turn.royalCommandsRemaining}/${hud.turn.royalCommandsMaximum}`,
  ];
}

export function createHudTextModel(
  hud: HudModel,
) {
  const phase = upper(
    hud.turn.phase,
  );

  const turnBanner =
    hud.turn.phase === 'victoria_command'
      ? 'YOUR TURN'
      : hud.turn.phase === 'victoria_resolve'
        ? 'RESOLVING ORDERS'
        : hud.turn.phase === 'shadow_command' ||
            hud.turn.phase === 'shadow_resolve'
          ? 'SHADOW TURN'
          : 'REINFORCEMENT';

  const pendingOrders =
    hud.turn.pendingOrders.length === 0
      ? 'PENDING: NONE'
      : `PENDING: ${hud.turn.pendingOrders
          .map(
            (order, index) =>
              `${index + 1} ${upper(order.kind)}`,
          )
          .join('  ·  ')}`;

  const heroHealth =
    hud.hero.health !== null &&
    hud.hero.maxHealth !== null
      ? `${hud.hero.health}/${hud.hero.maxHealth}`
      : '--/--';

  const enemyHealth =
    hud.enemySovereign.health !== null &&
    hud.enemySovereign.maxHealth !== null
      ? `${hud.enemySovereign.health}/${hud.enemySovereign.maxHealth}`
      : '--/--';

  return {
    top: {
      crown:
        `CROWN ${hud.crownPower}`,

      nodes:
        `NODES ${hud.nodes.owned}/${hud.nodes.total}`,

      commandCapacity:
        `CAPACITY ${hud.command.used}/${hud.command.capacity}`,

      royalCommands:
        `ROYAL COMMANDS ${hud.turn.royalCommandsRemaining}/${hud.turn.royalCommandsMaximum}`,

      round:
        `ROUND ${hud.turn.round}`,

      phase,

      turnBanner,
      pendingOrders,
    },

    victoria: {
      name: 'VICTORIA',
      health: heroHealth,
    },

    enemy: {
      name: 'SHADOW KING',
      health: enemyHealth,
    },
  } as const;
}
