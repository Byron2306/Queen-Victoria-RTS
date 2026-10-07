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
import {
  nodeArtPresentation,
} from '../render/node-art-layout';
import {
  bannerArtPresentation,
} from '../render/banner-art-layout';
import {
  createTriptychStrategicOverlay,
} from '../render/triptych-presentation';
import {
  UNIT_SPRITE_ORIGIN,
} from '../render/unit-grounding';
import {
  unitVisualHeightForRank,
} from '../render/unit-visual-footprint';
import {
  assetUrl,
} from '../assets/base-url';

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
    private bannerSprites: any[] = [];
    private bannerVisualFingerprint = '';
    private triptychPresentationReady = false;

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

    /**
     * Final Triptych presentation authority. The generic scene still contains
     * legacy sizing assumptions, so every visible Triptych frame is normalized
     * against the selected battlefield dimensions. Position comes from the
     * render model's exact tile centre; this method changes only sprite origin,
     * size, and facing, preserving movement interpolation.
     */
    private enforceTriptychUnitPresentation(): void {
      const { layout, runtime } = this.currentPresentationRuntime();
      const boardHeight = this.controller.world.height;
      const cellHeight = layout.boardRender.height / boardHeight;

      for (const unit of runtime.frame.units) {
        const sprite = (this.unitSprites as Map<string, any>).get(unit.id);
        const worldUnit = this.controller.world.units[unit.id];
        if (!sprite || !worldUnit) continue;

        const visualHeight = unitVisualHeightForRank({
          boardY: worldUnit.position.y,
          cellHeight,
          boardHeight,
        });
        const rawWidth = Number(sprite.width) || visualHeight;
        const rawHeight = Number(sprite.height) || visualHeight;
        const aspect = rawHeight > 0 ? rawWidth / rawHeight : 1;

        sprite
          .setOrigin?.(UNIT_SPRITE_ORIGIN.x, UNIT_SPRITE_ORIGIN.y)
          ?.setDisplaySize?.(visualHeight * aspect, visualHeight);

        const scaleX = Math.abs(Number(sprite.scaleX) || 1);
        const scaleY = Math.abs(Number(sprite.scaleY) || 1);
        sprite.setScale?.(scaleX * unit.scaleX, scaleY);
      }
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

    private refreshBannerSprites(force = false): void {
      const scene = this as any;
      const width = Number(scene.scale?.width) || 1600;
      const height = Number(scene.scale?.height) || 900;
      const layout = createResponsiveBattlefieldLayout(width, height);
      const overlay = createTriptychStrategicOverlay(
        scene.controller.world,
        layout.projection,
      );
      const camera = getBattlefieldCameraState();
      const fingerprint = [
        width,
        height,
        camera.panX.toFixed(2),
        camera.panY.toFixed(2),
        camera.zoom.toFixed(3),
        ...overlay.banners.map((banner: any) =>
          `${banner.id}:${banner.faction}:${banner.anchor.x.toFixed(2)}:${banner.anchor.y.toFixed(2)}:${banner.roundsHeld}:${banner.contestedBy ?? 'clear'}`,
        ),
      ].join('|');

      if (!force && fingerprint === this.bannerVisualFingerprint) return;
      this.bannerVisualFingerprint = fingerprint;

      for (const sprite of this.bannerSprites) sprite?.destroy?.();
      this.bannerSprites = [];

      const legacyLabels = (scene.royalStrategicMarkers ?? [])
        .filter((marker: any) => typeof marker?.text === 'string' && marker.text.startsWith('⚑ '));
      for (const label of legacyLabels) label?.setVisible?.(false);

      if (!scene.add?.image) return;
      const tileWidth = layout.boardRender.width / scene.controller.world.width;

      for (const banner of overlay.banners) {
        const art = bannerArtPresentation(banner.faction, tileWidth);
        const sprite = scene.add.image(
          banner.anchor.x,
          banner.anchor.y,
          art.textureKey,
        );
        sprite
          ?.setOrigin?.(art.origin.x, art.origin.y)
          ?.setDisplaySize?.(art.displayWidth, art.displayHeight)
          ?.setDepth?.(1748);
        this.bannerSprites.push(sprite);

        if (scene.add?.text) {
          const status = banner.contestedBy
            ? 'CONTESTED'
            : `${banner.roundsHeld}/2`;
          const label = scene.add.text(
            banner.anchor.x,
            banner.anchor.y - art.displayHeight - 5,
            status,
            {
              fontFamily: 'Georgia, serif',
              fontSize: '10px',
              fontStyle: 'bold',
              color: banner.faction === 'victoria' ? '#ffd46a' : '#c99cff',
              stroke: '#160907',
              strokeThickness: 3,
            },
          );
          label?.setOrigin?.(0.5, 1)?.setDepth?.(1750);
          this.bannerSprites.push(label);
        }
      }
    }

    /**
     * Camera-bound overlays must be regenerated from the same current
     * projection as the board and units. Keeping this as one refresh boundary
     * prevents selection, movement, strategic/watchtower, nodes, banners, and
     * intelligence layers from retaining pre-pan screen coordinates.
     */
    refreshCameraBoundPresentation(force = false): void {
      const scene = this as any;
      scene.redrawRoyalMoveMarkers?.();
      scene.redrawStrategicOverlay?.(force);
      this.redrawRoyalNodes(force);
      this.refreshBannerSprites(force);
      this.refreshBattlefieldIntelligence(force);
    }

    private redrawRoyalNodes(force = false): void {
      const scene = this as any;
      const width = Number(scene.scale?.width) || 1600;
      const height = Number(scene.scale?.height) || 900;
      const layout = createResponsiveBattlefieldLayout(width, height);
      const runtime = createBattlefieldSceneRuntime(
        scene.controller.world,
        scene.selectedUnitId,
        layout.projection,
      );
      const camera = getBattlefieldCameraState();
      const signature = [
        width,
        height,
        camera.panX.toFixed(2),
        camera.panY.toFixed(2),
        camera.zoom.toFixed(3),
        ...runtime.frame.nodes.map((node: any) =>
          `${node.id}:${node.owner ?? 'neutral'}:${node.contested ? 1 : 0}`,
        ),
      ].join('|');

      if (!force && signature === scene.royalNodeSignature) return;
      scene.royalNodeSignature = signature;

      for (const sprite of scene.royalNodeSprites ?? []) {
        sprite?.destroy?.();
      }
      scene.royalNodeSprites = [];

      const tileWidth = layout.boardRender.width / scene.controller.world.width;

      for (const node of runtime.frame.nodes) {
        const art = nodeArtPresentation(
          node.kind,
          node.owner,
          node.contested,
          tileWidth,
        );
        const groundY = node.y + art.displayWidth * 0.18;

        if (node.contested && node.kind === 'crown') {
          const contestedFloor = scene.add.image(
            node.x,
            groundY,
            'royal-tile-contested',
          );
          contestedFloor
            ?.setOrigin?.(0.5, 0.5)
            ?.setDisplaySize?.(art.displayWidth * 1.15, art.displayWidth * 0.38)
            ?.setAlpha?.(0.84)
            ?.setDepth?.(42);
          scene.royalNodeSprites.push(contestedFloor);
        }

        const sprite = scene.add.image(node.x, groundY, art.textureKey);
        sprite?.setCrop?.(
          art.crop.x,
          art.crop.y,
          art.crop.width,
          art.crop.height,
        );
        sprite
          ?.setOrigin?.(art.origin.x, art.origin.y)
          ?.setDisplaySize?.(art.displayWidth, art.displayHeight)
          ?.setDepth?.(45);
        scene.royalNodeSprites.push(sprite);
      }
    }

    preload(): void {
      super.preload();
      const scene = this as any;
      scene.load?.image?.(
        'royal-banner-victoria',
        assetUrl('assets/banners/banner-victoria.png'),
      );
      scene.load?.image?.(
        'royal-banner-shadow',
        assetUrl('assets/banners/banner-shadow.png'),
      );
    }

    layoutBattlefield(): void {
      super.layoutBattlefield();

      if (this.triptychPresentationReady) {
        this.enforceTriptychUnitPresentation();
        this.refreshCameraBoundPresentation(true);
      }
    }

    create(): void {
      super.create();

      this.triptychPresentationReady = true;

      this.enforceTriptychUnitPresentation();
      this.refreshCameraBoundPresentation(true);

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
        this.layoutBattlefield();
      }

      super.update(time, delta);
      this.enforceTriptychUnitPresentation();
      this.refreshBattlefieldIntelligence();
      this.refreshBannerSprites();

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
