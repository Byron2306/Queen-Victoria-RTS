import { describe, expect, it } from 'vitest';
import {
  createBattlefieldSceneClass,
} from '../../src/client/phaser/phaser-scene';
import type {
  BoardProjection,
} from '../../src/client/board/projection';

class FakeSceneBase {
  public scale = {
    width: 1600,
    height: 900,
  };

  constructor(_config?: unknown) {}
}

describe('Phaser pointer resolution seam', () => {
  it('routes handleBoardPointer through the overridable board-cell resolver', () => {
    const BattlefieldScene =
      createBattlefieldSceneClass(FakeSceneBase);

    class ProbeScene extends BattlefieldScene {
      public resolveCalls = 0;

      protected resolvePointerCell(
        _point: Readonly<{ x: number; y: number }>,
        _projection: BoardProjection,
      ): Readonly<{ x: number; y: number }> | null {
        this.resolveCalls += 1;

        const unit = Object.values(
          this.controller.world.units,
        ).find(candidate => candidate.faction === 'victoria');

        if (!unit) {
          throw new Error('Expected a Victoria unit in the opening world');
        }

        return unit.position;
      }

      selectUnit(unitId: string | null): void {
        this.selectedUnitId = unitId;
      }
    }

    const scene = new ProbeScene();

    scene.handleBoardPointer({ x: 20, y: 20 });

    expect(scene.resolveCalls).toBe(1);
    expect(scene.selectedUnitId).not.toBeNull();
  });
});
