export interface DestroyableSprite {
  destroy?: () => void;
}

export function removeStaleUnitSprites<T extends DestroyableSprite>(
  sprites: Map<string, T>,
  liveUnitIds: ReadonlySet<string>,
): string[] {
  const removed: string[] = [];

  for (const [unitId, sprite] of sprites) {
    if (liveUnitIds.has(unitId)) {
      continue;
    }

    sprite.destroy?.();
    sprites.delete(unitId);
    removed.push(unitId);
  }

  return removed.sort();
}
