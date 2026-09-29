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
import {
  tilePolygon,
} from '../board/projection';
import {
  createResponsiveBattlefieldLayout,
} from '../render/responsive-battlefield';
import {
  createBattlefieldSceneRuntime,
} from './scene-rendering';
import {
  createIntelligenceTileVisuals,
} from '../render/intelligence-visuals';
import {
  createGhostContactVisuals,
} from '../render/ghost-contacts';

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
    private intelligenceMarkers: any[] = [];
    private intelligenceVisualFingerprint = '';
    private ghostMarkers: any[] = [];
    private ghostVisualFingerprint = '';

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

    private currentPresentationRuntime(): {
      layout: ReturnType<typeof createResponsiveBattlefieldLayout>;
      runtime: ReturnType<typeof createBattlefieldSceneRuntime>;
    } {
      const scene = this as any;
      const width = Number(scene.scale?.width) || 1600;
      const height = Number(scene.scale?.height) || 900;
      const layout = createResponsiveBattlefieldLayout(width, height);
      const runtime = createBattlefieldSceneRuntime(
        this.controller.world,
        this.selectedUnitId,
        layout.projection,
      );

      return { layout, runtime };
    }

    private refreshIntelligenceFrontier(force = false): void {
      const scene = this as any;
      const { layout, runtime } = this.currentPresentationRuntime();
      const visuals = createIntelligenceTileVisuals(
        runtime.intelligenceOverlay,
      ).filter(visual => visual.alpha > 0);
      const camera = getBattlefieldCameraState();
      const fingerprint = [
        camera.panX.toFixed(2),
        camera.panY.toFixed(2),
        camera.zoom.toFixed(3),
        ...visuals.map(visual => `${visual.id}:${visual.treatment}`),
      ].join('|');

      if (!force && fingerprint === this.intelligenceVisualFingerprint) {
        return;
      }

      this.intelligenceVisualFingerprint = fingerprint;

      for (const marker of this.intelligenceMarkers) {
        marker?.destroy?.();
      }
      this.intelligenceMarkers = [];

      if (!scene.add?.polygon) {
        return;
      }

      for (const visual of visuals) {
        const points = tilePolygon(visual.cell, layout.projection);
        const center = points.reduce(
          (sum, point) => ({
            x: sum.x + point.x / points.length,
            y: sum.y + point.y / points.length,
          }),
          { x: 0, y: 0 },
        );
        const localPoints = points.flatMap(point => [
          point.x - center.x,
          point.y - center.y,
        ]);
        const marker = scene.add.polygon(
          center.x,
          center.y,
          localPoints,
          visual.fill,
          visual.alpha,
        );

        marker
          ?.setStrokeStyle?.(
            1,
            visual.stroke,
            visual.strokeAlpha,
          )
          ?.setDepth?.(visual.depth);

        this.intelligenceMarkers.push(marker);
      }
    }

    private refreshGhostContacts(force = false): void {
      const scene = this as any;
      const { layout, runtime } = this.currentPresentationRuntime();
      const ghosts = createGhostContactVisuals(
        runtime.presented,
        layout.projection,
      );
      const camera = getBattlefieldCameraState();
      const fingerprint = [
        camera.panX.toFixed(2),
        camera.panY.toFixed(2),
        camera.zoom.toFixed(3),
        ...ghosts.map(ghost =>
          `${ghost.unitId}:${ghost.cell.x},${ghost.cell.y}:r${ghost.lastSeenRound}`,
        ),
      ].join('|');

      if (!force && fingerprint === this.ghostVisualFingerprint) {
        return;
      }

      this.ghostVisualFingerprint = fingerprint;

      for (const marker of this.ghostMarkers) {
        marker?.destroy?.();
      }
      this.ghostMarkers = [];

      if (!scene.add?.ellipse) {
        return;
      }

      for (const ghost of ghosts) {
        const marker = scene.add.ellipse(
          ghost.anchor.x,
          ghost.anchor.y,
          30,
          30,
          0xc3b8d8,
          ghost.opacity,
        );

        marker
          ?.setStrokeStyle?.(2, 0xd8ccef, 0.7)
          ?.setDepth?.(ghost.depth);

        this.ghostMarkers.push(marker);

        if (scene.add?.text) {
          const label = scene.add.text(
            ghost.anchor.x,
            ghost.anchor.y - 24,
            `LAST SEEN R${ghost.lastSeenRound}`,
            {
              fontFamily: 'serif',
              fontSize: '10px',
              color: '#d8ccef',
            },
          );
          label?.setOrigin?.(0.5, 1);
          label?.setAlpha?.(0.72);
          label?.setDepth?.(ghost.depth + 1);
          this.ghostMarkers.push(label);
        }
      }
    }

    private refreshBattlefieldIntelligence(force = false): void {
      this.refreshIntelligenceFrontier(force);
      this.refreshGhostContacts(force);
    }

    create(): void {
      super.create();
      this.refreshBattlefieldIntelligence(true);

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
          this.refreshBattlefieldIntelligence();
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
          this.refreshBattlefieldIntelligence();
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
      this.refreshBattlefieldIntelligence();

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
