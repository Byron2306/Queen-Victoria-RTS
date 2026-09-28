import type {
  HudModel,
} from './model';

function phaseLabel(
  phase: HudModel['turn']['phase'],
): string {
  return phase
    .replaceAll('_', ' ')
    .toUpperCase();
}

export function createHudTurnText(
  hud: HudModel,
): readonly string[] {
  return [
    `ROUND ${hud.turn.round}`,
    phaseLabel(
      hud.turn.phase,
    ),
    [
      'ROYAL COMMANDS',
      `${hud.turn.royalCommandsRemaining}/${hud.turn.royalCommandsMaximum}`,
    ].join(' '),
  ];
}
