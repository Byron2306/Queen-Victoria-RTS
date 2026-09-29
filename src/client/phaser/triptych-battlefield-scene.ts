import { createRoyalBattlefieldSceneClass } from './royal-battlefield-scene';
import { removeStaleUnitSprites } from './unit-sprite-lifecycle';
import {
  dragPanDelta,
  keyboardPanDelta,
  wheelZoomTarget,
  type CameraDirectionState,
  type CameraPoint,
} from '../camera/camera-input';
import {
  getBattlefieldCameraState,
  panStoredBattlefieldCamera,
  zoomStoredBattlefieldCamera,
} from '../camera/battlefield-camera-store';

type PhaserSceneBase = new (config?: any) => object;

function cameraDirectionForKey(
  key: string,
): keyof CameraDirectionState | null {
  switch (key.toLowerCase()) {
    case 'arrowleft':
    case 'a':
      return 'left';
    case 'arrowright':
    case 'd':
      return 'right';
    case 'arrowup':
    case 'w':
      return 'up';
    case 'arrowdown':
    case 's':
      return 'down';
    default:
      return null;
  }
}

export function createTriptychBattlefieldSceneClass<
  TBase extends PhaserSceneBase,
>(BaseScene: TBase) {
  const RoyalScene = createRoyalBattlefieldSceneClass(BaseScene) as any;

  return class TriptychBattlefieldScene extends RoyalScene {
    private readonly cameraDirections: CameraDirectionState = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    private cameraDragPoint: CameraPoint | null = null;

    private cameraBounds(): {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    } {
      const scene = this as any;
      const width = Number(scene.scale?.width) || 1600;
      const height = Number(scene.scale?.height) || 900;

      return {
        minX: -width * 1.4,
        maxX: width * 1.4,
        minY: -height * 1.2,
        maxY: height * 1.2,
      };
    }

    create(): void {
      super.create();

      const scene = this as any;
      const keyboard = scene.input?.keyboard;
      const input = scene.input;

      keyboard?.on?.(
        'keydown',
        (event: { key?: string }) => {
          const direction = cameraDirectionForKey(event.key ?? '');
          if (direction) this.cameraDirections[direction] = true;
        },
      );

      keyboard?.on?.(
        'keyup',
        (event: { key?: string }) => {
          const direction = cameraDirectionForKey(event.key ?? '');
          if (direction) this.cameraDirections[direction] = false;
        },
      );

      input?.on?.(
        'pointerdown',
        (pointer: { x?: number; y?: number }) => {
          const x = Number(pointer.x);
          const y = Number(pointer.y);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            this.cameraDragPoint = { x, y };
          }
        },
      );

      input?.on?.(
        'pointermove',
        (pointer: { x?: number; y?: number; isDown?: boolean }) => {
          if (!pointer.isDown || !this.cameraDragPoint) return;

          const x = Number(pointer.x);
          const y = Number(pointer.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;

          const next = { x, y };
          const delta = dragPanDelta(this.cameraDragPoint, next);
          this.cameraDragPoint = next;

          panStoredBattlefieldCamera(delta, this.cameraBounds());
          this.layoutBattlefield();
        },
      );

      const endDrag = () => {
        this.cameraDragPoint = null;
      };

      input?.on?.('pointerup', endDrag);
      input?.on?.('pointerupoutside', endDrag);

      input?.on?.(
        'wheel',
        (
          _pointer: unknown,
          _currentlyOver: unknown,
          _deltaX: number,
          deltaY: number,
        ) => {
          const current = getBattlefieldCameraState();
          zoomStoredBattlefieldCamera(
            wheelZoomTarget(current.zoom, deltaY),
          );
          this.layoutBattlefield();
        },
      );
    }

    update(time: number, delta: number): void {
      const keyboardDelta = keyboardPanDelta(
        this.cameraDirections,
        delta,
        520,
      );

      if (keyboardDelta.x !== 0 || keyboardDelta.y !== 0) {
        panStoredBattlefieldCamera(
          keyboardDelta,
          this.cameraBounds(),
        );
      }

      super.update(time, delta);

      const liveUnitIds = new Set<string>(
        Object.keys(this.controller.world.units),
      );

      removeStaleUnitSprites(
        this.unitSprites,
        liveUnitIds,
      );
    }
  } as unknown as {
    new (): InstanceType<TBase> & {
      create(): void;
      update(time: number, delta: number): void;
    };
  };
}
