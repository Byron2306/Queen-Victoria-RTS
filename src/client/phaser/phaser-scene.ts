import { assetUrl } from '../assets/base-url';
import {
  fitAspectInside,
} from '../render/hud-art-layout';
import {
  createHudModel,
} from '../hud/model';
import {
  createHudTextModel,
  createHudTurnText,
} from '../hud/text-model';
import {
  unitVisualHeightForRank,
} from '../render/unit-visual-footprint';
import {
  BattlefieldSceneController,
} from './battlefield-scene';
import {
  createBattlefieldSceneRuntime,
} from './scene-rendering';
import {
  UnitMotionTracker,
} from '../render/unit-motion-tracker';
import {
  createResponsiveBattlefieldLayout,
} from '../render/responsive-battlefield';
import {
  createSelectionGeometryOverlay,
  type SelectionGeometryOverlay,
} from '../render/selection-geometry-overlay';
import {
  createBoardDebugOverlay,
} from '../render/board-debug-overlay';
import {
  resolveBoardPointerCell,
} from '../input/board-pointer-cell';
import type {
  BoardProjection,
} from '../board/projection';

type PhaserSceneBase = new (
  config?: any,
) => object;

interface DisplayObjectLike {
  x: number;
  y: number;
  displayWidth?: number;
  displayHeight?: number;
  depth?: number;
  visible?: boolean;
  setOrigin?: (...args: number[]) => DisplayObjectLike;
  setScale?: (...args: number[]) => DisplayObjectLike;
  setDisplaySize?: (
    width: number,
    height: number,
  ) => DisplayObjectLike;
  setDepth?: (depth: number) => DisplayObjectLike;
  setPosition?: (
    x: number,
    y: number,
  ) => DisplayObjectLike;
  setVisible?: (
    visible: boolean,
  ) => DisplayObjectLike;
  setFillStyle?: (
    color: number,
    alpha?: number,
  ) => DisplayObjectLike;
  setStrokeStyle?: (
    ...args: number[]
  ) => DisplayObjectLike;
  destroy?: () => void;
  setInteractive?: (
    ...args: any[]
  ) => DisplayObjectLike;
  on?: (
    event: string,
    callback: (...args: any[]) => void,
  ) => DisplayObjectLike;
}

interface TextObjectLike {
  x: number;
  y: number;
  text: string;
  style: Record<string, unknown>;
  displayWidth?: number;
  displayHeight?: number;
  setOrigin?: (...args: number[]) => TextObjectLike;
  setDepth?: (depth: number) => TextObjectLike;
  setPosition?: (
    x: number,
    y: number,
  ) => TextObjectLike;
  setText?: (value: string) => TextObjectLike;
  setVisible?: (visible: boolean) => TextObjectLike;
  destroy?: () => void;
  setInteractive?: (
    ...args: any[]
  ) => TextObjectLike;
  on?: (
    event: string,
    callback: (...args: any[]) => void,
  ) => TextObjectLike;
}

export function createBattlefieldSceneClass<
  TBase extends PhaserSceneBase,
>(
  BaseScene: TBase,
) {
  class BattlefieldScene extends (
    BaseScene as PhaserSceneBase
  ) {
    public readonly controller:
      BattlefieldSceneController;

    public readonly unitSprites =
      new Map<string, DisplayObjectLike>();

    public legalDestinationMarkers:
      DisplayObjectLike[] = [];

    public boardDebugMarkers:
      DisplayObjectLike[] = [];

    public hudRegions: {
      victoriaStatus?: DisplayObjectLike;
      topStatus?: DisplayObjectLike;
      enemyStatus?: DisplayObjectLike;
      selectedUnit?: DisplayObjectLike;
      abilities?: DisplayObjectLike;
      deployUnits?: DisplayObjectLike;
    } = {};

    public hudArtwork: {
      royalDecree?: DisplayObjectLike;
      holdTheCrown?: DisplayObjectLike;
      sovereignLine?: DisplayObjectLike;
      imperialGambit?: DisplayObjectLike;
      pawn?: DisplayObjectLike;
      knight?: DisplayObjectLike;
      bishop?: DisplayObjectLike;
      rook?: DisplayObjectLike;
    } = {};

    public hudText: Record<
      string,
      TextObjectLike
    > = {};

    private boardDebugVisible = false;

    private readonly motion =
      new UnitMotionTracker();

    public selectedUnitId: string | null = null;

    public currentSelectionOverlay:
      SelectionGeometryOverlay = {
        selectedCell: null,
        selectedAnchor: null,
        destinations: [],
      };
    public boardSprite: DisplayObjectLike | null = null;
    private selectionMarker: DisplayObjectLike | null = null;

    constructor() {
      super({
        key: 'battlefield',
      });

      this.controller =
        new BattlefieldSceneController();
    }

    get turnHudText():
      readonly string[] {
      return createHudTurnText(
        createHudModel(
          this.controller.world,
          this.selectedUnitId,
        ),
      );
    }

    preload(): void {
      const scene = this as any;

      const runtime =
        createBattlefieldSceneRuntime(
          this.controller.world,
          this.selectedUnitId,
        );

      for (const texture of runtime.textures) {
        scene.load.image(
          texture.key,
          texture.asset,
        );
      }

      scene.load.image(
        'hud-top-status',
        assetUrl('assets/ui/top-status.png'),
      );

      scene.load.image(
        'hud-selected-unit',
        assetUrl('assets/ui/selected-unit-panel.png'),
      );

      scene.load.image(
        'hud-abilities',
        assetUrl('assets/ui/abilities-frame.png'),
      );

      scene.load.image(
        'hud-deploy-units',
        assetUrl('assets/ui/deploy-units.png'),
      );

      scene.load.image(
        'hud-ability-royal-decree',
        assetUrl('assets/ui/ability-royal-decree.png'),
      );

      scene.load.image(
        'hud-ability-hold-the-crown',
        assetUrl('assets/ui/ability-hold-the-crown.png'),
      );

      scene.load.image(
        'hud-ability-sovereign-line',
        assetUrl('assets/ui/ability-sovereign-line.png'),
      );

      scene.load.image(
        'hud-ability-imperial-gambit',
        assetUrl('assets/ui/ability-imperial-gambit.png'),
      );

      scene.load.image(
        'hud-deploy-pawn',
        assetUrl('assets/ui/deploy-pawn.png'),
      );

      scene.load.image(
        'hud-deploy-knight',
        assetUrl('assets/ui/deploy-knight.png'),
      );

      scene.load.image(
        'hud-deploy-bishop',
        assetUrl('assets/ui/deploy-bishop.png'),
      );

      scene.load.image(
        'hud-deploy-rook',
        assetUrl('assets/ui/deploy-rook.png'),
      );

      scene.load.image(
        'hud-victoria-status',
        assetUrl('assets/ui/victoria-status.png'),
      );

      scene.load.image(
        'hud-shadow-king-status',
        assetUrl('assets/ui/shadow-king-status.png'),
      );
    }

    create(): void {
      const scene = this as any;

      const runtime =
        createBattlefieldSceneRuntime(
          this.controller.world,
          this.selectedUnitId,
        );

      this.boardSprite = scene.add.image(
        800,
        450,
        runtime.frame.board.textureKey,
      );

      this.boardSprite
        ?.setOrigin?.(0.5, 0.5)
        ?.setDepth?.(
          runtime.frame.board.depth,
        );

      for (const node of runtime.frame.nodes) {
        const nodeSprite = scene.add.circle(
          node.x,
          node.y,
          node.kind === 'crown' ? 10 : 7,
          node.owner === 'victoria'
            ? 0xc9a227
            : node.owner === 'obsidian'
              ? 0x6d3fa0
              : 0xd8d3c4,
          0.7,
        );

        nodeSprite.setDepth?.(node.depth);
      }

      const textureKeys = new Map(
        runtime.textures.map(
          texture => [
            texture.asset,
            texture.key,
          ],
        ),
      );

      for (const unit of runtime.frame.units) {
        const textureKey =
          textureKeys.get(unit.asset);

        if (!textureKey) {
          throw new Error(
            `Missing loaded texture for ${unit.id}`,
          );
        }

        const sprite = scene.add.image(
          unit.x,
          unit.y,
          textureKey,
        );

        sprite
          .setOrigin?.(0.5, 0.92)
          ?.setDepth?.(unit.depth);

        sprite.setScale?.(
          unit.scaleX,
          1,
        );

        this.unitSprites.set(
          unit.id,
          sprite,
        );

        this.motion.resolve(
          unit.id,
          {
            x: unit.x,
            y: unit.y,
          },
          0,
        );
      }

      this.refreshSelection(runtime.frame);

      this.layoutBattlefield();
      this.createHudScaffold();

      const scale = (this as any).scale;

      scale?.on?.(
        'resize',
        () => this.layoutBattlefield(),
      );

      const input = (this as any).input;

      input?.on?.(
        'pointerdown',
        (pointer: {
          worldX?: number;
          worldY?: number;
          x?: number;
          y?: number;
        }) => {
          const x =
            Number.isFinite(pointer.worldX)
              ? Number(pointer.worldX)
              : Number(pointer.x);

          const y =
            Number.isFinite(pointer.worldY)
              ? Number(pointer.worldY)
              : Number(pointer.y);

          if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
          ) {
            return;
          }

          this.handleBoardPointer({
            x,
            y,
          });
        },
      );
    }

    private createHudScaffold(): void {
      const scene = this as any;

      const makePlaceholder = () => {
        if (scene.add.rectangle) {
          return scene.add.rectangle(
            0,
            0,
            10,
            10,
            0x17110f,
            0.82,
          ) as DisplayObjectLike;
        }

        return scene.add.ellipse(
          0,
          0,
          10,
          10,
          0x17110f,
          0.82,
        ) as DisplayObjectLike;
      };

      const makeArtwork = (
        textureKey: string,
      ) =>
        scene.add.image(
          0,
          0,
          textureKey,
        ) as DisplayObjectLike;

      this.hudRegions = {
        victoriaStatus:
          makeArtwork('hud-victoria-status'),

        topStatus:
          makeArtwork('hud-top-status'),

        enemyStatus:
          makeArtwork('hud-shadow-king-status'),

        selectedUnit:
          makeArtwork('hud-selected-unit'),

        abilities:
          makeArtwork('hud-abilities'),

        deployUnits:
          makeArtwork('hud-deploy-units'),
      };

      this.hudArtwork = {
        royalDecree:
          makeArtwork(
            'hud-ability-royal-decree',
          ),

        holdTheCrown:
          makeArtwork(
            'hud-ability-hold-the-crown',
          ),

        sovereignLine:
          makeArtwork(
            'hud-ability-sovereign-line',
          ),

        imperialGambit:
          makeArtwork(
            'hud-ability-imperial-gambit',
          ),

        pawn:
          makeArtwork('hud-deploy-pawn'),

        knight:
          makeArtwork('hud-deploy-knight'),

        bishop:
          makeArtwork('hud-deploy-bishop'),

        rook:
          makeArtwork('hud-deploy-rook'),
      };

      for (const artwork of Object.values(
        this.hudArtwork,
      )) {
        artwork
          ?.setOrigin?.(0.5)
          ?.setDepth?.(5001);
      }

      for (const region of Object.values(
        this.hudRegions,
      )) {
        region
          ?.setOrigin?.(0.5)
          ?.setDepth?.(5000)
          ?.setStrokeStyle?.(
            2,
            0xd6ad4a,
            0.9,
          );
      }

      this.createHudTextLayer();
      this.layoutHud();
      this.refreshHudText();
    }

    private createHudTextLayer(): void {
      const scene = this as any;

      if (!scene.add?.text) {
        return;
      }

      const royalLabelStyle = {
        fontFamily:
          "Georgia, 'Palatino Linotype', Palatino, serif",
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f6e6b0',
        stroke: '#24130b',
        strokeThickness: 4,
        align: 'center',
      };

      const liveValueStyle = {
        fontFamily:
          "Georgia, 'Palatino Linotype', Palatino, serif",
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fff4cf',
        stroke: '#1a0d08',
        strokeThickness: 3,
        align: 'center',
      };

      const commandValueStyle = {
        ...liveValueStyle,
        fontSize: '12px',
        strokeThickness: 2,
      };

      const makeText = (
        style: Record<string, unknown>,
      ): TextObjectLike =>
        scene.add.text(
          0,
          0,
          '',
          style,
        ) as TextObjectLike;

      this.hudText = {
        crown:
          makeText(commandValueStyle),

        nodes:
          makeText(commandValueStyle),

        command:
          makeText(commandValueStyle),

        royalCommands:
          makeText(commandValueStyle),

        round:
          makeText(commandValueStyle),

        phase:
          makeText(commandValueStyle),

        turnBanner:
          makeText({
            ...royalLabelStyle,
            fontSize: '20px',
          }),

        pendingOrders:
          makeText({
            ...commandValueStyle,
            fontSize: '11px',
          }),

        cancelLast:
          makeText({
            ...royalLabelStyle,
            fontSize: '15px',
            backgroundColor:
              '#352014',
            padding: {
              x: 12,
              y: 8,
            },
          }),

        commitOrders:
          makeText({
            ...royalLabelStyle,
            fontSize: '17px',
            backgroundColor:
              '#6f351d',
            padding: {
              x: 16,
              y: 10,
            },
          }),

        victoriaName:
          makeText(royalLabelStyle),

        victoriaHealth:
          makeText(liveValueStyle),

        enemyName:
          makeText(royalLabelStyle),

        enemyHealth:
          makeText(liveValueStyle),
      };

      for (
        const text of
        Object.values(this.hudText)
      ) {
        text
          .setOrigin?.(0.5)
          ?.setDepth?.(5010);
      }

      this.hudText.cancelLast
        ?.setText?.('CANCEL LAST');

      this.hudText.commitOrders
        ?.setText?.(
          'COMMIT ORDERS',
        );

      this.hudText.cancelLast
        ?.setInteractive?.({
          useHandCursor: true,
        })
        ?.on?.(
          'pointerdown',
          () => {
            this.cancelLastStagedOrder();
          },
        );

      this.hudText.commitOrders
        ?.setInteractive?.({
          useHandCursor: true,
        })
        ?.on?.(
          'pointerdown',
          () => {
            this.commitOrders();
          },
        );

      this.refreshHudText();
    }

    private refreshHudText(): void {
      if (
        Object.keys(this.hudText)
          .length === 0
      ) {
        return;
      }

      const hud =
        createHudModel(
          this.controller.world,
          this.selectedUnitId,
        );

      const text =
        createHudTextModel(hud);

      this.hudText.crown
        ?.setText?.(text.top.crown);

      this.hudText.nodes
        ?.setText?.(text.top.nodes);

      this.hudText.command
        ?.setText?.(
          text.top.commandCapacity,
        );

      this.hudText.royalCommands
        ?.setText?.(
          text.top.royalCommands,
        );

      this.hudText.round
        ?.setText?.(text.top.round);

      this.hudText.phase
        ?.setText?.(text.top.phase);

      this.hudText.turnBanner
        ?.setText?.(
          text.top.turnBanner,
        );

      const stagedOrders =
        this.controller.runtime.commands
          .peekTactical()
          .filter(
            order =>
              order.faction ===
              'victoria',
          );

      const stagedCost =
        stagedOrders.reduce(
          (total, order) =>
            total +
            order.commandCost,
          0,
        );

      const royalRemaining =
        Math.max(
          0,
          hud.turn
            .royalCommandsRemaining -
            stagedCost,
        );

      this.hudText.royalCommands
        ?.setText?.(
          `ROYAL COMMANDS ${royalRemaining}/${hud.turn.royalCommandsMaximum}`,
        );

      const pendingText =
        stagedOrders.length === 0
          ? text.top.pendingOrders
          : `PENDING: ${stagedOrders
              .map(
                (order, index) =>
                  `${index + 1} ${order.kind.toUpperCase()}`,
              )
              .join(' · ')}`;

      this.hudText.pendingOrders
        ?.setText?.(
          pendingText,
        );

      this.hudText.victoriaName
        ?.setText?.(
          text.victoria.name,
        );

      this.hudText.victoriaHealth
        ?.setText?.(
          text.victoria.health,
        );

      this.hudText.enemyName
        ?.setText?.(
          text.enemy.name,
        );

      this.hudText.enemyHealth
        ?.setText?.(
          text.enemy.health,
        );
    }

    private layoutHudChildren(): void {
      const abilities =
        this.hudRegions.abilities;

      if (
        abilities &&
        abilities.displayWidth &&
        abilities.displayHeight
      ) {
        const railWidth =
          abilities.displayWidth;

        const railHeight =
          abilities.displayHeight;

        const offsets = [
          -0.30,
          -0.10,
          0.10,
          0.30,
        ];

        const abilityArt = [
          this.hudArtwork.royalDecree,
          this.hudArtwork.holdTheCrown,
          this.hudArtwork.sovereignLine,
          this.hudArtwork.imperialGambit,
        ];

        const slotSize =
          Math.min(
            railHeight * 0.52,
            railWidth * 0.16,
          );

        abilityArt.forEach(
          (artwork, index) => {
            if (!artwork) {
              return;
            }

            artwork.setPosition?.(
              abilities.x +
                railWidth *
                  offsets[index]!,
              abilities.y,
            );

            this.fitHudArtwork(
              artwork,
              slotSize,
              slotSize,
            );
          },
        );
      }

      const deploy =
        this.hudRegions.deployUnits;

      if (
        deploy &&
        deploy.displayWidth &&
        deploy.displayHeight
      ) {
        const panelWidth =
          deploy.displayWidth;

        const panelHeight =
          deploy.displayHeight;

        const offsets = [
          -0.30,
          -0.10,
          0.10,
          0.30,
        ];

        const deployArt = [
          this.hudArtwork.pawn,
          this.hudArtwork.knight,
          this.hudArtwork.bishop,
          this.hudArtwork.rook,
        ];

        const slotSize =
          Math.min(
            panelHeight * 0.42,
            panelWidth * 0.17,
          );

        deployArt.forEach(
          (artwork, index) => {
            if (!artwork) {
              return;
            }

            artwork.setPosition?.(
              deploy.x +
                panelWidth *
                  offsets[index]!,
              deploy.y,
            );

            this.fitHudArtwork(
              artwork,
              slotSize,
              slotSize,
            );
          },
        );
      }
    }

    private cancelLastStagedOrder(): void {
      if (
        this.controller.world
          .turn.phase !==
        'victoria_command'
      ) {
        return;
      }

      const staged =
        this.controller.runtime.commands
          .peekTactical()
          .filter(
            order =>
              order.faction ===
              'victoria',
          );

      const last =
        staged[
          staged.length - 1
        ];

      if (!last) {
        return;
      }

      this.controller.runtime.commands
        .cancelTactical(
          last.orderId,
        );

      this.refreshHudText();
    }

    private commitOrders(): void {
      if (
        this.controller.world
          .turn.phase !==
        'victoria_command'
      ) {
        return;
      }

      this.controller.endTurn();

      this.layoutBattlefield();
      this.refreshHudText();
    }

    private layoutHudText(): void {
    const top =
      this.hudRegions.topStatus;

    if (
      top &&
      top.displayWidth
    ) {
      const w =
        top.displayWidth;

      const y =
        top.y;

      const upperY =
        y - 8;

      const lowerY =
        y + 10;

      this.hudText.crown
        ?.setPosition?.(
          top.x - w * 0.32,
          upperY,
        );

      this.hudText.nodes
        ?.setPosition?.(
          top.x - w * 0.11,
          upperY,
        );

      this.hudText.command
        ?.setPosition?.(
          top.x + w * 0.12,
          upperY,
        );

      this.hudText.royalCommands
        ?.setPosition?.(
          top.x + w * 0.34,
          upperY,
        );

      this.hudText.round
        ?.setPosition?.(
          top.x - w * 0.16,
          lowerY,
        );

      this.hudText.phase
        ?.setPosition?.(
          top.x + w * 0.16,
          lowerY,
        );

      this.hudText.turnBanner
        ?.setPosition?.(
          top.x,
          y + 34,
        );

      this.hudText.pendingOrders
        ?.setPosition?.(
          top.x,
          y + 54,
        );
    }

    const scene =
      this as any;

    const commandLayout =
      createResponsiveBattlefieldLayout(
        Number(
          scene.scale?.width,
        ) || 1600,
        Number(
          scene.scale?.height,
        ) || 900,
      );

    const commandY =
      commandLayout.hud.y +
      commandLayout.hud.height *
        0.16;

    this.hudText.cancelLast
      ?.setPosition?.(
        commandLayout.hud.x +
          commandLayout.hud.width *
            0.48,
        commandY,
      );

    this.hudText.commitOrders
      ?.setPosition?.(
        commandLayout.hud.x +
          commandLayout.hud.width *
            0.64,
        commandY,
      );

    const victoria =
        this.hudRegions.victoriaStatus;

      if (
        victoria &&
        victoria.displayWidth
      ) {
        const x =
          victoria.x +
          victoria.displayWidth *
            0.72;

        this.hudText.victoriaName
          ?.setPosition?.(
            x,
            victoria.y - 10,
          );

        this.hudText.victoriaHealth
          ?.setPosition?.(
            x,
            victoria.y + 14,
          );
      }

      const enemy =
        this.hudRegions.enemyStatus;

      if (
        enemy &&
        enemy.displayWidth
      ) {
        const x =
          enemy.x -
          enemy.displayWidth *
            0.72;

        this.hudText.enemyName
          ?.setPosition?.(
            x,
            enemy.y - 10,
          );

        this.hudText.enemyHealth
          ?.setPosition?.(
            x,
            enemy.y + 14,
          );
      }
    }

    private fitHudArtwork(
      artwork: DisplayObjectLike | undefined,
      maxWidth: number,
      maxHeight: number,
    ): void {
      if (!artwork) {
        return;
      }

      const sourceWidth =
        Number((artwork as any).width) || 1;

      const sourceHeight =
        Number((artwork as any).height) || 1;

      const fitted =
        fitAspectInside({
          sourceWidth,
          sourceHeight,
          maxWidth,
          maxHeight,
        });

      artwork.setDisplaySize?.(
        fitted.width,
        fitted.height,
      );
    }

    private layoutHud(): void {
      const scene = this as any;

      const width =
        Number(scene.scale?.width) || 1600;

      const height =
        Number(scene.scale?.height) || 900;

      const landscape =
        width >= height;

      const topH =
        Math.max(
          72,
          Math.min(
            118,
            height * 0.12,
          ),
        );

      const bottomH =
        Math.max(
          110,
          Math.min(
            180,
            height * 0.18,
          ),
        );

      const sideW =
        Math.max(
          180,
          Math.min(
            280,
            width * 0.18,
          ),
        );

      const centreW =
        Math.max(
          320,
          width - sideW * 2 - 40,
        );

      const abilities =
        this.hudRegions.abilities;

      const deploy =
        this.hudRegions.deployUnits;

      if (abilities) {
        const abilityY =
          abilities.y;

        const abilitySpacing =
          landscape
            ? Math.max(
                52,
                centreW * 0.11,
              )
            : Math.max(
                58,
                width * 0.18,
              );

        const abilityStart =
          abilities.x -
          abilitySpacing * 1.5;

        const abilityArt = [
          this.hudArtwork.royalDecree,
          this.hudArtwork.holdTheCrown,
          this.hudArtwork.sovereignLine,
          this.hudArtwork.imperialGambit,
        ];

        abilityArt.forEach(
          (artwork, index) => {
            artwork
              ?.setPosition?.(
                abilityStart +
                  abilitySpacing * index,
                abilityY,
              )
              ?.setDisplaySize?.(
                landscape
                  ? Math.max(
                      54,
                      bottomH * 0.46,
                    )
                  : Math.max(
                      62,
                      width * 0.14,
                    ),
                landscape
                  ? Math.max(
                      54,
                      bottomH * 0.46,
                    )
                  : Math.max(
                      62,
                      width * 0.14,
                    ),
              );
          },
        );
      }

      if (deploy) {
        const deployY =
          deploy.y;

        const deploySpacing =
          landscape
            ? Math.max(
                38,
                sideW * 0.22,
              )
            : Math.max(
                56,
                width * 0.17,
              );

        const deployStart =
          deploy.x -
          deploySpacing * 1.5;

        const deployArt = [
          this.hudArtwork.pawn,
          this.hudArtwork.knight,
          this.hudArtwork.bishop,
          this.hudArtwork.rook,
        ];

        deployArt.forEach(
          (artwork, index) => {
            artwork
              ?.setPosition?.(
                deployStart +
                  deploySpacing * index,
                deployY,
              )
              ?.setDisplaySize?.(
                landscape
                  ? Math.max(
                      42,
                      bottomH * 0.34,
                    )
                  : Math.max(
                      54,
                      width * 0.13,
                    ),
                landscape
                  ? Math.max(
                      42,
                      bottomH * 0.34,
                    )
                  : Math.max(
                      54,
                      width * 0.13,
                    ),
              );
          },
        );
      }


      if (landscape) {
        this.hudRegions.victoriaStatus
          ?.setPosition?.(
            sideW / 2 + 12,
            topH / 2 + 8,
          );

        this.fitHudArtwork(
          this.hudRegions.victoriaStatus,
          topH,
          topH,
        );

        this.hudRegions.topStatus
          ?.setPosition?.(
            width / 2,
            topH / 2 + 8,
          );

        this.fitHudArtwork(
          this.hudRegions.topStatus,
          centreW,
          topH * 0.86,
        );

        this.hudRegions.enemyStatus
          ?.setPosition?.(
            width - sideW / 2 - 12,
            topH / 2 + 8,
          );

        this.fitHudArtwork(
          this.hudRegions.enemyStatus,
          topH,
          topH,
        );

        this.hudRegions.selectedUnit
          ?.setPosition?.(
            sideW / 2 + 12,
            height - bottomH / 2 - 32,
          );

        this.fitHudArtwork(
          this.hudRegions.selectedUnit,
          sideW,
          bottomH * 0.88,
        );

        this.hudRegions.abilities
          ?.setPosition?.(
            width / 2,
            height - bottomH / 2 - 32,
          );

        this.fitHudArtwork(
          this.hudRegions.abilities,
          centreW * 0.62,
          bottomH * 0.88,
        );

        this.hudRegions.deployUnits
          ?.setPosition?.(
            width - sideW / 2 - 12,
            height - bottomH / 2 - 32,
          );

        this.fitHudArtwork(
          this.hudRegions.deployUnits,
          sideW,
          bottomH * 0.88,
        );

        this.layoutHudChildren();
        this.layoutHudText();

        return;
      }

      const portraitSideW =
        width * 0.46;

      this.hudRegions.victoriaStatus
        ?.setPosition?.(
          width * 0.25,
          70,
        );

      this.fitHudArtwork(
        this.hudRegions.victoriaStatus,
        110,
        110,
      );

      this.hudRegions.enemyStatus
        ?.setPosition?.(
          width * 0.75,
          70,
        );

      this.fitHudArtwork(
        this.hudRegions.enemyStatus,
        110,
        110,
      );

      this.hudRegions.topStatus
        ?.setPosition?.(
          width / 2,
          150,
        )
        ?.setDisplaySize?.(
          width * 0.94,
          70,
        );

      this.hudRegions.selectedUnit
        ?.setPosition?.(
          width / 2,
          height - 390,
        )
        ?.setDisplaySize?.(
          width * 0.94,
          130,
        );

      this.hudRegions.abilities
        ?.setPosition?.(
          width / 2,
          height - 240,
        )
        ?.setDisplaySize?.(
          width * 0.94,
          130,
        );

      this.hudRegions.deployUnits
        ?.setPosition?.(
          width / 2,
          height - 90,
        )
        ?.setDisplaySize?.(
          width * 0.94,
          130,
        );

      this.layoutHudChildren();
      this.layoutHudText();
    }

    setBoardDebugVisible(
      visible: boolean,
    ): void {
      this.boardDebugVisible = visible;
      this.refreshBoardDebugOverlay();
    }

    private refreshBoardDebugOverlay(): void {
      for (const marker of this.boardDebugMarkers) {
        marker.destroy?.();
      }

      this.boardDebugMarkers = [];

      if (!this.boardDebugVisible) {
        return;
      }

      const scene = this as any;

      const layout =
        createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600,
          Number(scene.scale?.height) || 900,
        );

      const overlay =
        createBoardDebugOverlay(
          this.controller.world,
          this.selectedUnitId,
          layout.projection,
        );

      const baseRadius =
        Math.max(
          2,
          Math.min(
            layout.board.width,
            layout.board.height,
          ) / 260,
        );

      for (const cell of overlay.cells) {
        let fill = 0xb8b0a3;
        let alpha = 0.24;
        let stroke = 0xe7dfcf;
        let strokeAlpha = 0.36;
        let radius = baseRadius;

        if (cell.occupantId) {
          fill = 0xd9d2c4;
          alpha = 0.48;
          radius = baseRadius * 1.35;
        }

        if (cell.legalDestination) {
          fill = 0xd6ad4a;
          alpha = 0.55;
          stroke = 0xf4d77a;
          strokeAlpha = 0.9;
          radius = baseRadius * 1.8;
        }

        if (cell.selected) {
          fill = 0xffd45c;
          alpha = 0.9;
          stroke = 0xfff0a8;
          strokeAlpha = 1;
          radius = baseRadius * 2.4;
        }

        const marker =
          scene.add.circle(
            cell.anchor.x,
            cell.anchor.y,
            radius,
            fill,
            alpha,
          ) as DisplayObjectLike;

        marker
          .setFillStyle?.(
            fill,
            alpha,
          )
          ?.setStrokeStyle?.(
            cell.selected ? 2 : 1,
            stroke,
            strokeAlpha,
          )
          ?.setDepth?.(840);

        this.boardDebugMarkers.push(marker);
      }
    }

    selectUnit(
      unitId: string | null,
    ): void {
      this.selectedUnitId = unitId;

      const scene = this as any;

      const layout =
        createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600,
          Number(scene.scale?.height) || 900,
        );

      const runtime =
        createBattlefieldSceneRuntime(
          this.controller.world,
          this.selectedUnitId,
          layout.projection,
        );

      this.refreshSelection(runtime.frame);
      this.refreshLegalDestinationMarkers();
      this.refreshBoardDebugOverlay();
    }

    protected resolvePointerCell(
      point: Readonly<{
        x: number;
        y: number;
      }>,
      projection: BoardProjection,
    ): Readonly<{
      x: number;
      y: number;
    }> | null {
      return resolveBoardPointerCell(
        point,
        projection,
      );
    }

    handleBoardPointer(
      point: Readonly<{
        x: number;
        y: number;
      }>,
    ): void {
      const scene = this as any;

      const layout =
        createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600,
          Number(scene.scale?.height) || 900,
        );

      if (
        point.y >=
        layout.hud.y
      ) {
        return;
      }

      const cell =
        this.resolvePointerCell(
          point,
          layout.projection,
        );

      if (!cell) {
        return;
      }

      const occupantId =
        this.controller.world.occupancy[
          `${cell.x},${cell.y}`
        ];

      if (occupantId) {
        const occupant =
          this.controller.world.units[
            occupantId
          ];

        if (
          occupant?.faction === 'victoria'
        ) {
          this.selectUnit(occupantId);
        }

        return;
      }

      if (!this.selectedUnitId) {
        return;
      }

      const legal =
        this.currentSelectionOverlay
          .destinations
          .some(
            destination =>
              destination.cell.x === cell.x &&
              destination.cell.y === cell.y,
          );

      if (!legal) {
        return;
      }

      this.controller.runtime.commands.move(
        this.controller.world,
        this.selectedUnitId,
        {
          x: cell.x,
          y: cell.y,
        },
      );
    }

    private refreshLegalDestinationMarkers(): void {
      for (
        const marker
        of this.legalDestinationMarkers
      ) {
        marker.destroy?.();
      }

      this.legalDestinationMarkers = [];

      if (!this.selectedUnitId) {
        this.currentSelectionOverlay = {
          selectedCell: null,
          selectedAnchor: null,
          destinations: [],
        };

        return;
      }

      const scene = this as any;

      const layout =
        createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600,
          Number(scene.scale?.height) || 900,
        );

      const overlay =
        createSelectionGeometryOverlay(
          this.controller.world,
          this.selectedUnitId,
          layout.projection,
        );

      this.currentSelectionOverlay =
        overlay;

      const markerWidth =
        Math.max(
          12,
          layout.board.width / 16 * 0.42,
        );

      const markerHeight =
        Math.max(
          8,
          layout.board.height / 16 * 0.34,
        );

      for (
        const destination
        of overlay.destinations
      ) {
        const marker =
          scene.add.ellipse(
            destination.anchor.x,
            destination.anchor.y,
            markerWidth,
            markerHeight,
            0xd6ad4a,
            0.22,
          ) as DisplayObjectLike;

        marker
          .setFillStyle?.(
            0xd6ad4a,
            0.22,
          )
          ?.setStrokeStyle?.(
            1,
            0xf4d77a,
            0.65,
          )
          ?.setDepth?.(850);

        this.legalDestinationMarkers.push(
          marker,
        );
      }
    }

    private applyUnitVisualFootprint(
      unitId: string,
      sprite: DisplayObjectLike,
      boardHeight: number,
    ): void {
      const boardY =
        this.controller.world.units[
          unitId
        ]?.position.y ?? 0;

      const cellHeight =
        boardHeight / 16;

      const visualHeight =
        unitVisualHeightForRank({
          boardY,
          cellHeight,
        });

      const rawWidth =
        Number((sprite as any).width) ||
        visualHeight;

      const rawHeight =
        Number((sprite as any).height) ||
        visualHeight;

      const aspect =
        rawHeight > 0
          ? rawWidth / rawHeight
          : 1;

      sprite.setDisplaySize?.(
        visualHeight * aspect,
        visualHeight,
      );
    }

    layoutBattlefield(): void {
      const scene = this as any;

      const width =
        Number(scene.scale?.width) || 1600;

      const height =
        Number(scene.scale?.height) || 900;

      const layout =
        createResponsiveBattlefieldLayout(
          width,
          height,
        );

      this.boardSprite
        ?.setPosition?.(
          layout.boardRender.x +
            layout.boardRender.width / 2,
          layout.boardRender.y +
            layout.boardRender.height / 2,
        )
        ?.setDisplaySize?.(
          layout.boardRender.width,
          layout.boardRender.height,
        );

      const runtime =
        createBattlefieldSceneRuntime(
          this.controller.world,
          this.selectedUnitId,
          layout.projection,
        );

      for (const unit of runtime.frame.units) {
        const sprite =
          this.unitSprites.get(unit.id);

        if (!sprite) {
          continue;
        }

        sprite
          .setPosition?.(
            unit.x,
            unit.y,
          )
          ?.setDepth?.(unit.depth);

        this.applyUnitVisualFootprint(
          unit.id,
          sprite,
          layout.boardRender.height,
        );

        const currentScaleY =
          Math.abs(
            Number((sprite as any).scaleY) || 1,
          );

        const currentScaleX =
          Math.abs(
            Number((sprite as any).scaleX) || 1,
          );

        sprite.setScale?.(
          currentScaleX * unit.scaleX,
          currentScaleY,
        );

        this.motion.reset(
          unit.id,
          {
            x: unit.x,
            y: unit.y,
          },
          0,
        );
      }

      this.refreshSelection(runtime.frame);
      this.refreshLegalDestinationMarkers();
      this.refreshBoardDebugOverlay();
      this.layoutHud();
    }

    update(
      time: number,
      delta: number,
    ): void {
      this.controller.update(delta);

      const scene = this as any;

      const layout =
        createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600,
          Number(scene.scale?.height) || 900,
        );

      const runtime =
        createBattlefieldSceneRuntime(
          this.controller.world,
          this.selectedUnitId,
          layout.projection,
        );

      const liveUnitIds =
        new Set<string>();

      for (const unit of runtime.frame.units) {
        liveUnitIds.add(unit.id);

        const sprite =
          this.unitSprites.get(unit.id);

        if (!sprite) {
          continue;
        }

        const visual =
          this.motion.resolve(
            unit.id,
            {
              x: unit.x,
              y: unit.y,
            },
            time,
          );

        this.applyUnitVisualFootprint(
          unit.id,
          sprite,
          layout.boardRender.height,
        );

        sprite
          .setPosition?.(
            visual.x,
            visual.y,
          )
          ?.setDepth?.(
            1000 +
            Math.round(visual.y * 10),
          );
      }

      this.motion.prune(liveUnitIds);

      this.refreshSelection(runtime.frame);
      this.refreshHudText();
    }

    private refreshSelection(
      frame: ReturnType<
        typeof createBattlefieldSceneRuntime
      >['frame'],
    ): void {
      const scene = this as any;

      if (!frame.selection) {
        this.selectionMarker
          ?.setVisible?.(false);

        return;
      }

      if (!this.selectionMarker) {
        this.selectionMarker =
          scene.add.ellipse(
            frame.selection.x,
            frame.selection.y,
            58,
            28,
            0x000000,
            0,
          );

        this.selectionMarker
          ?.setStrokeStyle?.(
            3,
            0xd4af37,
            0.95,
          );
      }

      this.selectionMarker
        ?.setPosition?.(
          frame.selection.x,
          frame.selection.y,
        )
        ?.setDepth?.(
          frame.selection.depth,
        )
        ?.setVisible?.(true);
    }
  }

  return BattlefieldScene as unknown as {
    new (): BattlefieldScene & InstanceType<TBase>;
  };
}
