import {
  createBattlefieldSceneClass,
} from './phaser-scene';
import {
  createRoyalBattlefieldGuidance,
} from './royal-battlefield-guidance';
import {
  findVictoriaUnitAtPoint,
} from '../input/unit-tap-target';
import {
  assetUrl,
} from '../assets/base-url';
import {
  canUnitAttackTarget,
} from '../../sim/combat';
import {
  isRecruitUnlocked,
} from '../../sim/economy';
import {
  queueRecruitment,
} from '../../sim/production';
import {
  queuePromotionRequest,
} from '../../sim/promotion';
import {
  createBattlefieldSceneRuntime,
} from './scene-rendering';
import {
  createResponsiveBattlefieldLayout,
} from '../render/responsive-battlefield';
import type {
  HeroAbilityId,
  PromotableUnitKind,
  RecruitableUnitKind,
} from '../../sim/types';

type PhaserSceneBase = new (
  config?: any,
) => object;

type Destroyable = Readonly<{
  destroy?: () => void;
}>;

const ABILITIES: readonly HeroAbilityId[] = [
  'royal_decree',
  'hold_the_crown',
  'sovereign_line',
  'imperial_gambit',
];

const DEPLOY_KINDS: readonly RecruitableUnitKind[] = [
  'pawn',
  'knight',
  'bishop',
  'rook',
];

export function createRoyalBattlefieldSceneClass<
  TBase extends PhaserSceneBase,
>(
  BaseScene: TBase,
) {
  const BattlefieldBase =
    createBattlefieldSceneClass(
      BaseScene,
    ) as any;

  return class RoyalBattlefieldScene extends BattlefieldBase {
    private royalGuideHeadline: any = null;
    private royalGuideInstruction: any = null;
    private royalGuideDetail: any = null;
    private royalMoveMarkers: Destroyable[] = [];
    private royalNodeSprites: Destroyable[] = [];
    private royalNodeSignature = '';

    preload(): void {
      super.preload();

      const self = this as any;
      const images: ReadonlyArray<readonly [string, string]> = [
        ['royal-tile-neutral', 'assets/highlights/tile-neutral.png'],
        ['royal-tile-victoria', 'assets/highlights/tile-victoria.png'],
        ['royal-tile-shadow', 'assets/highlights/tile-shadow.png'],
        ['royal-tile-contested', 'assets/highlights/tile-contested.png'],
        ['royal-node-major-neutral', 'assets/nodes/node-major-neutral.png'],
        ['royal-node-major-victoria', 'assets/nodes/node-major-victoria.png'],
        ['royal-node-major-shadow', 'assets/nodes/node-major-shadow.png'],
        ['royal-node-minor-neutral', 'assets/nodes/node-minor-neutral.png'],
        ['royal-node-minor-victoria', 'assets/nodes/node-minor-victoria.png'],
        ['royal-node-minor-shadow', 'assets/nodes/node-minor-shadow.png'],
        ['royal-node-minor-contested', 'assets/nodes/node-minor-contested.png'],
      ];

      for (const [key, path] of images) {
        self.load.image(key, assetUrl(path));
      }
    }

    create(): void {
      super.create();

      const self = this as any;
      const width =
        Number(self.scale?.width) || 1600;
      const height =
        Number(self.scale?.height) || 1200;

      this.royalGuideHeadline =
        self.add.text(
          width / 2,
          height * 0.735,
          '',
          {
            fontFamily:
              "Georgia, 'Palatino Linotype', Palatino, serif",
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffe7a0',
            stroke: '#2b0d09',
            strokeThickness: 5,
            align: 'center',
          },
        )
          .setOrigin?.(0.5)
          ?.setDepth?.(5200);

      this.royalGuideInstruction =
        self.add.text(
          width / 2,
          height * 0.765,
          '',
          {
            fontFamily:
              "Georgia, 'Palatino Linotype', Palatino, serif",
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#fff8dc',
            stroke: '#2b0d09',
            strokeThickness: 4,
            align: 'center',
            backgroundColor:
              'rgba(39, 15, 12, 0.76)',
            padding: {
              x: 16,
              y: 6,
            },
          },
        )
          .setOrigin?.(0.5)
          ?.setDepth?.(5200);

      this.royalGuideDetail =
        self.add.text(
          width / 2,
          height * 0.795,
          '',
          {
            fontFamily:
              "Georgia, 'Palatino Linotype', Palatino, serif",
            fontSize: '12px',
            color: '#f0d9a0',
            stroke: '#1a0907',
            strokeThickness: 3,
            align: 'center',
          },
        )
          .setOrigin?.(0.5)
          ?.setDepth?.(5200);

      this.wireStrategicControls();
      this.tuneHudReadability();
      this.forceShadowFacing();
      this.redrawRoyalNodes(true);
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
      this.refreshStrategicControls();
    }

    update(time: number, delta: number): void {
      super.update(time, delta);
      this.forceShadowFacing();
      this.redrawRoyalNodes();
      this.refreshStrategicControls();
    }

    selectUnit(
      unitId: string | null,
    ): void {
      super.selectUnit(unitId);
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
      this.refreshStrategicControls();
    }

    handleBoardPointer(
      point: Readonly<{
        x: number;
        y: number;
      }>,
    ): void {
      const self = this as any;

      const candidates = Array.from(
        self.unitSprites?.entries?.() ?? [],
      ).map((entry: any) => {
        const [id, sprite] = entry;
        return {
          id,
          faction:
            self.controller.world.units[id]
              ?.faction ?? 'obsidian',
          x: Number(sprite.x) || 0,
          y: Number(sprite.y) || 0,
        };
      });

      const touchRadius = Math.max(
        42,
        Math.min(
          Number(self.scale?.width) || 1600,
          Number(self.scale?.height) || 1200,
        ) * 0.055,
      );

      const tappedUnitId =
        findVictoriaUnitAtPoint(
          point,
          candidates,
          touchRadius,
        );

      if (tappedUnitId) {
        this.selectUnit(tappedUnitId);
        return;
      }

      const selectedUnitId =
        self.selectedUnitId as string | null;

      if (selectedUnitId) {
        let attackTargetId: string | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
          if (candidate.faction !== 'obsidian') {
            continue;
          }

          if (!canUnitAttackTarget(
            self.controller.world,
            selectedUnitId,
            candidate.id,
          )) {
            continue;
          }

          const dx = candidate.x - point.x;
          const dy = candidate.y - point.y;
          const distance = Math.hypot(dx, dy);

          if (
            distance <= touchRadius &&
            distance < bestDistance
          ) {
            bestDistance = distance;
            attackTargetId = candidate.id;
          }
        }

        if (attackTargetId) {
          self.controller.runtime.commands.attack(
            self.controller.world,
            selectedUnitId,
            attackTargetId,
          );
          self.refreshHudText?.();
          this.refreshRoyalGuidance();
          this.redrawRoyalMoveMarkers();
          return;
        }
      }

      const before =
        self.controller.runtime.commands
          .peekTactical()
          .length;

      super.handleBoardPointer(point);

      const after =
        self.controller.runtime.commands
          .peekTactical()
          .length;

      if (after !== before) {
        self.refreshHudText?.();
      }

      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
    }

    private wireStrategicControls(): void {
      const self = this as any;

      const abilityArt = [
        self.hudArtwork?.royalDecree,
        self.hudArtwork?.holdTheCrown,
        self.hudArtwork?.sovereignLine,
        self.hudArtwork?.imperialGambit,
      ];

      abilityArt.forEach((artwork: any, index: number) => {
        artwork
          ?.setInteractive?.({ useHandCursor: true })
          ?.on?.('pointerdown', () => {
            this.queueVictoriaAbility(ABILITIES[index]!);
          });
      });

      const deployArt = [
        self.hudArtwork?.pawn,
        self.hudArtwork?.knight,
        self.hudArtwork?.bishop,
        self.hudArtwork?.rook,
      ];

      deployArt.forEach((artwork: any, index: number) => {
        artwork
          ?.setInteractive?.({ useHandCursor: true })
          ?.on?.('pointerdown', () => {
            this.recruitOrPromote(DEPLOY_KINDS[index]!);
          });
      });
    }

    private queueVictoriaAbility(ability: HeroAbilityId): void {
      const self = this as any;
      const world = self.controller.world;

      if (
        world.match.status !== 'active' ||
        world.turn.phase !== 'victoria_command'
      ) {
        return;
      }

      const hero = world.heroes.victoria;
      if (!hero?.heroUnitId || hero.status !== 'alive') {
        return;
      }

      const abilityState = hero.abilities[ability];
      if (
        !abilityState ||
        abilityState.cooldownTicksRemaining > 0
      ) {
        return;
      }

      self.controller.runtime.commands.heroAbility(
        world,
        'victoria',
        hero.heroUnitId,
        ability,
      );

      self.refreshHudText?.();
      this.refreshRoyalGuidance();
    }

    private recruitOrPromote(kind: RecruitableUnitKind): void {
      const self = this as any;
      const world = self.controller.world;

      if (
        world.match.status !== 'active' ||
        world.turn.phase !== 'victoria_command'
      ) {
        return;
      }

      const selectedId = self.selectedUnitId as string | null;
      const selected = selectedId
        ? world.units[selectedId]
        : undefined;

      if (
        selected &&
        selected.faction === 'victoria' &&
        selected.kind === 'pawn' &&
        selected.position.y <= 1 &&
        kind !== 'pawn'
      ) {
        const targetKind = kind as PromotableUnitKind;
        const result = queuePromotionRequest(
          world,
          {
            type: 'promote',
            sequence: world.tick,
            issuedTick: world.tick,
            faction: 'victoria',
            pawnId: selected.id,
            targetKind,
          },
        );
        self.controller.runtime.world = result.state;
      } else {
        const result = queueRecruitment(
          world,
          {
            type: 'recruit',
            sequence: world.tick,
            issuedTick: world.tick,
            faction: 'victoria',
            unitKind: kind,
          },
        );
        self.controller.runtime.world = result.state;
      }

      self.refreshHudText?.();
      this.refreshStrategicControls();
    }

    private refreshStrategicControls(): void {
      const self = this as any;
      const world = self.controller.world;
      const hero = world.heroes.victoria;

      const abilityArt = [
        self.hudArtwork?.royalDecree,
        self.hudArtwork?.holdTheCrown,
        self.hudArtwork?.sovereignLine,
        self.hudArtwork?.imperialGambit,
      ];

      abilityArt.forEach((artwork: any, index: number) => {
        const ability = ABILITIES[index]!;
        const unlockLevel = [1, 2, 3, 5][index]!;
        const available = Boolean(
          hero &&
          hero.status === 'alive' &&
          hero.level >= unlockLevel &&
          hero.abilities[ability]?.cooldownTicksRemaining === 0 &&
          world.turn.phase === 'victoria_command'
        );
        artwork?.setAlpha?.(available ? 1 : 0.42);
      });

      const deployArt = [
        self.hudArtwork?.pawn,
        self.hudArtwork?.knight,
        self.hudArtwork?.bishop,
        self.hudArtwork?.rook,
      ];

      deployArt.forEach((artwork: any, index: number) => {
        const kind = DEPLOY_KINDS[index]!;
        const available =
          isRecruitUnlocked(world, 'victoria', kind) &&
          world.turn.phase === 'victoria_command';
        artwork?.setAlpha?.(available ? 1 : 0.35);
      });
    }

    private tuneHudReadability(): void {
      const hudText =
        (this as any).hudText ?? {};

      for (
        const key of [
          'crown',
          'nodes',
          'command',
          'royalCommands',
        ]
      ) {
        hudText[key]
          ?.setFontSize?.(11);
      }

      hudText.round
        ?.setFontSize?.(10);
      hudText.phase
        ?.setFontSize?.(10);
      hudText.pendingOrders
        ?.setFontSize?.(10);
      hudText.turnBanner
        ?.setVisible?.(false);
      hudText.cancelLast
        ?.setFontSize?.(14);
      hudText.commitOrders
        ?.setFontSize?.(16);
    }

    private attackableTargetIds(): string[] {
      const self = this as any;
      const selectedId = self.selectedUnitId as string | null;
      if (!selectedId) return [];

      return Object.values(self.controller.world.units)
        .filter((unit: any) =>
          unit.faction === 'obsidian' &&
          canUnitAttackTarget(
            self.controller.world,
            selectedId,
            unit.id,
          ),
        )
        .map((unit: any) => unit.id)
        .sort();
    }

    private refreshRoyalGuidance(): void {
      if (!this.royalGuideInstruction) {
        return;
      }

      const self = this as any;
      const stagedOrders =
        self.controller.runtime.commands
          .peekTactical()
          .filter(
            (order: any) =>
              order.faction ===
              'victoria',
          );

      const stagedCost =
        stagedOrders.reduce(
          (
            total: number,
            order: any,
          ) =>
            total +
            order.commandCost,
          0,
        );

      const remaining = Math.max(
        0,
        self.controller.world.turn
          .royalCommandsRemaining
          .victoria - stagedCost,
      );

      const guidance =
        createRoyalBattlefieldGuidance({
          selectedUnitId:
            self.selectedUnitId,
          stagedOrders:
            stagedOrders.length,
          royalCommandsRemaining:
            remaining,
          phase:
            self.controller.world
              .turn.phase,
          attackableTargets:
            this.attackableTargetIds().length,
        });

      this.royalGuideHeadline
        ?.setText?.(
          guidance.headline,
        );
      this.royalGuideInstruction
        ?.setText?.(
          guidance.instruction,
        );
      this.royalGuideDetail
        ?.setText?.(
          guidance.detail,
        );
    }

    private clearRoyalMoveMarkers(): void {
      for (
        const marker of
        this.royalMoveMarkers
      ) {
        marker.destroy?.();
      }

      this.royalMoveMarkers = [];
    }

    private redrawRoyalMoveMarkers(): void {
      this.clearRoyalMoveMarkers();

      const self = this as any;
      const overlay =
        self.currentSelectionOverlay;

      for (const legacy of self.legalDestinationMarkers ?? []) {
        legacy.setVisible?.(false);
      }

      if (
        !self.selectedUnitId ||
        !overlay?.selectedAnchor
      ) {
        return;
      }

      const viewport = Math.min(
        Number(self.scale?.width) || 1600,
        Number(self.scale?.height) || 1200,
      );
      const tileWidth = Math.max(56, viewport * 0.065);
      const tileHeight = tileWidth * 0.52;

      const selectedTile =
        self.add.image(
          overlay.selectedAnchor.x,
          overlay.selectedAnchor.y,
          'royal-tile-victoria',
        );
      selectedTile
        ?.setDisplaySize?.(tileWidth * 1.15, tileHeight * 1.15)
        ?.setAlpha?.(0.92)
        ?.setDepth?.(873);
      this.royalMoveMarkers.push(selectedTile);

      for (
        const destination of
        overlay.destinations
      ) {
        const marker =
          self.add.image(
            destination.anchor.x,
            destination.anchor.y,
            'royal-tile-victoria',
          );

        marker
          ?.setDisplaySize?.(tileWidth, tileHeight)
          ?.setAlpha?.(0.78)
          ?.setDepth?.(875);

        this.royalMoveMarkers.push(marker);
      }

      for (const targetId of this.attackableTargetIds()) {
        const sprite = self.unitSprites.get(targetId);
        if (!sprite) continue;

        const targetTile =
          self.add.image(
            sprite.x,
            sprite.y + tileHeight * 0.18,
            'royal-tile-contested',
          );
        targetTile
          ?.setDisplaySize?.(tileWidth * 1.15, tileHeight * 1.15)
          ?.setAlpha?.(0.96)
          ?.setDepth?.(872);

        const reticle = self.add.ellipse(
          sprite.x,
          sprite.y - tileHeight * 0.25,
          tileWidth * 0.72,
          tileWidth * 0.72,
          0x000000,
          0,
        );
        reticle
          ?.setStrokeStyle?.(4, 0xff4b3e, 1)
          ?.setDepth?.(2100);

        this.royalMoveMarkers.push(targetTile, reticle);
      }

      const stagedOrders =
        self.controller.runtime.commands
          .peekTactical()
          .filter(
            (order: any) =>
              order.faction === 'victoria' &&
              order.unitId === self.selectedUnitId,
          );

      stagedOrders.forEach(
        (
          order: any,
          index: number,
        ) => {
          let targetX: number | null = null;
          let targetY: number | null = null;
          let lineColor = 0xffd34f;

          if (order.kind === 'move') {
            const destination =
              overlay.destinations.find(
                (candidate: any) =>
                  candidate.cell.x === order.destination.x &&
                  candidate.cell.y === order.destination.y,
              );
            if (destination) {
              targetX = destination.anchor.x;
              targetY = destination.anchor.y;
            }
          }

          if (order.kind === 'attack') {
            const targetSprite =
              self.unitSprites.get(order.targetUnitId);
            if (targetSprite) {
              targetX = targetSprite.x;
              targetY = targetSprite.y;
              lineColor = 0xff493d;
            }
          }

          if (targetX === null || targetY === null) {
            return;
          }

          const graphics = self.add.graphics?.();
          graphics?.lineStyle?.(5, lineColor, 0.95);
          graphics?.lineBetween?.(
            overlay.selectedAnchor.x,
            overlay.selectedAnchor.y,
            targetX,
            targetY,
          );

          const dx = targetX - overlay.selectedAnchor.x;
          const dy = targetY - overlay.selectedAnchor.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const ux = dx / length;
          const uy = dy / length;
          const px = -uy;
          const py = ux;
          const arrowLength = 18;
          const arrowWidth = 9;
          graphics?.fillStyle?.(lineColor, 0.98);
          graphics?.fillTriangle?.(
            targetX,
            targetY,
            targetX - ux * arrowLength + px * arrowWidth,
            targetY - uy * arrowLength + py * arrowWidth,
            targetX - ux * arrowLength - px * arrowWidth,
            targetY - uy * arrowLength - py * arrowWidth,
          );
          graphics?.setDepth?.(2101);

          const badge =
            self.add.text(
              targetX,
              targetY - 24,
              String(index + 1),
              {
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#1b0a07',
                backgroundColor:
                  order.kind === 'attack'
                    ? '#ff6658'
                    : '#ffd75e',
                padding: {
                  x: 7,
                  y: 3,
                },
              },
            );

          badge
            .setOrigin?.(0.5)
            ?.setDepth?.(2102);

          if (graphics) {
            this.royalMoveMarkers.push(graphics);
          }
          this.royalMoveMarkers.push(badge);
        },
      );
    }

    private clearRoyalNodes(): void {
      for (const sprite of this.royalNodeSprites) {
        sprite.destroy?.();
      }
      this.royalNodeSprites = [];
    }

    private redrawRoyalNodes(force = false): void {
      const self = this as any;
      const width = Number(self.scale?.width) || 1600;
      const height = Number(self.scale?.height) || 1200;
      const layout =
        createResponsiveBattlefieldLayout(width, height);
      const runtime =
        createBattlefieldSceneRuntime(
          self.controller.world,
          self.selectedUnitId,
          layout.projection,
        );

      const signature = [
        width,
        height,
        ...runtime.frame.nodes.map((node: any) =>
          `${node.id}:${node.owner ?? 'neutral'}:${node.contested ? 1 : 0}`,
        ),
      ].join('|');

      if (!force && signature === this.royalNodeSignature) {
        return;
      }

      this.royalNodeSignature = signature;
      this.clearRoyalNodes();

      const cellWidth = layout.board.width / 16;
      const majorWidth = Math.max(78, cellWidth * 1.7);
      const majorHeight = majorWidth * 0.92;
      const minorWidth = Math.max(48, cellWidth * 1.05);
      const minorHeight = minorWidth * 0.62;

      for (const node of runtime.frame.nodes) {
        let textureKey: string;

        if (node.kind === 'crown') {
          textureKey = node.owner === 'victoria'
            ? 'royal-node-major-victoria'
            : node.owner === 'obsidian'
              ? 'royal-node-major-shadow'
              : 'royal-node-major-neutral';
        } else {
          textureKey = node.contested
            ? 'royal-node-minor-contested'
            : node.owner === 'victoria'
              ? 'royal-node-minor-victoria'
              : node.owner === 'obsidian'
                ? 'royal-node-minor-shadow'
                : 'royal-node-minor-neutral';
        }

        if (node.contested && node.kind === 'crown') {
          const contestedFloor = self.add.image(
            node.x,
            node.y,
            'royal-tile-contested',
          );
          contestedFloor
            ?.setDisplaySize?.(majorWidth * 1.15, majorHeight * 0.48)
            ?.setAlpha?.(0.84)
            ?.setDepth?.(42);
          this.royalNodeSprites.push(contestedFloor);
        }

        const sprite = self.add.image(
          node.x,
          node.y,
          textureKey,
        );

        sprite
          ?.setOrigin?.(0.5, node.kind === 'crown' ? 0.78 : 0.66)
          ?.setDisplaySize?.(
            node.kind === 'crown' ? majorWidth : minorWidth,
            node.kind === 'crown' ? majorHeight : minorHeight,
          )
          ?.setDepth?.(45);

        this.royalNodeSprites.push(sprite);
      }
    }

    private forceShadowFacing(): void {
      const self = this as any;
      for (const [id, sprite] of self.unitSprites?.entries?.() ?? []) {
        const unit = self.controller.world.units[id];
        if (!unit || unit.faction !== 'obsidian') continue;

        const scaleX = Math.abs(Number(sprite.scaleX) || 1);
        const scaleY = Math.abs(Number(sprite.scaleY) || 1);
        sprite.setScale?.(-scaleX, scaleY);
      }
    }
  };
}
