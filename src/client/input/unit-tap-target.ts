export interface UnitTapCandidate {
  id: string;
  faction: 'victoria' | 'obsidian';
  x: number;
  y: number;
}

export function findVictoriaUnitAtPoint(
  point: Readonly<{ x: number; y: number }>,
  candidates: readonly UnitTapCandidate[],
  radius: number,
): string | null {
  let bestId: string | null = null;
  let bestDistanceSq = radius * radius;

  for (const candidate of candidates) {
    if (candidate.faction !== 'victoria') {
      continue;
    }

    const dx = candidate.x - point.x;
    const dy = candidate.y - point.y;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq <= bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestId = candidate.id;
    }
  }

  return bestId;
}
