import { tilePolygon } from '../board/projection';
import { getBattlefieldCameraState, zoomStoredBattlefieldCamera } from '../camera/battlefield-camera-store';
import { applyBattlefieldHudLayout } from '../hud/responsive-layout';
import { topologyForWorld } from '../../sim/territory';
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
  VICTORIA_WALK_FRAME_PATHS,
  victoriaWalkFrameKey,
} from '../render/victoria-walk';
import {
  CANONICAL_ASSET_PATHS,
} from '../assets/canonical';
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
import {
  publishLiveDebug,
} from '../debug/live-debug-overlay';

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
  setTexture?: (
    texture: string,
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
        'victoria-idle',
        CANONICAL_ASSET_PATHS.victoria,
      );

      VICTORIA_WALK_FRAME_PATHS.forEach(
        (asset, index) => {
          scene.load.image(
            `victoria-walk-${String(
              index + 1,
            ).padStart(2, '0')}`,
            asset,
          );
        },
      );

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
        () => {
          this.layoutBattlefield();
          this.layoutHud();
        },
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
        deployLabel: makeText(commandValueStyle),
        pawnCost: makeText(commandValueStyle),
        knightCost: makeText(commandValueStyle),
        bishopCost: makeText(commandValueStyle),
        rookCost: makeText(commandValueStyle),
        zoomIn: makeText(royalLabelStyle),
        zoomOut: makeText(royalLabelStyle),
        selectedName: makeText(liveValueStyle),
        selectedHealth: makeText(commandValueStyle),

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
        ?.setText?.('UNDO');
      for (const [key, label, factor] of [['zoomIn', '+', 1.2], ['zoomOut', '−', 1/1.2]] as const) {
        this.hudText[key]?.setText?.(label);
        this.hudText[key]?.setInteractive?.({ useHandCursor: true })?.on?.('pointerdown', () => {
          zoomStoredBattlefieldCamera(getBattlefieldCameraState().zoom * factor);
          this.layoutBattlefield();
        });
      }

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
          text.top.commandCapacity.replace('CAPACITY', 'ARMY'),
        );

      this.hudText.royalCommands
        ?.setText?.(
          text.top.royalCommands,
        );

      this.hudText.round
        ?.setText?.(text.top.round);

      this.hudText.phase
        ?.setText?.(`${text.top.turnBanner} · ${text.top.round}`);

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
          `ORDERS ${royalRemaining}/${hud.turn.royalCommandsMaximum}`,
        );

      const pendingText = stagedOrders.length === 0
        ? 'NO ORDERS QUEUED'
        : `${stagedOrders.length} ORDER${stagedOrders.length === 1 ? '' : 'S'} QUEUED`;

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

      this.hudText.deployLabel?.setText?.('RECRUIT');
      for (const kind of ['pawn', 'knight', 'bishop', 'rook'] as const) {
        this.hudText[`${kind}Cost`]?.setText?.(`${hud.deploy[kind].cost}`);
      }
      const selected = hud.selectedUnit;
      this.hudText.selectedName?.setText?.(selected
        ? selected.id === 'victoria-queen' ? 'VICTORIA · QUEEN' : selected.kind.toUpperCase()
        : 'SELECT A UNIT');
      this.hudText.selectedHealth?.setText?.(selected
        ? `HP ${hud.selectedCombat?.health ?? 0}/${hud.selectedMaxHealth ?? 0}`
        : 'Tap a piece on the board');
      applyBattlefieldHudLayout(this);
    }

    private layoutHudChildren(): void {
      applyBattlefieldHudLayout(this);
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

      this.refreshHudText();
    }

    private layoutHudText(): void {
      applyBattlefieldHudLayout(this);
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
      applyBattlefieldHudLayout(this);
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
        topologyForWorld(this.controller.world).id,
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
        point.y < layout.board.y ||
        point.y >= layout.hud.y
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

      const presentationNow =
        this.controller.runtime
          .presentationClock.elapsedMs;

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
            presentationNow,
          );

        if (
          unit.id === 'victoria-queen'
        ) {
          const moving =
            this.motion.isMoving(
              unit.id,
              presentationNow,
            );

          const textureKey =
            moving
              ? victoriaWalkFrameKey(
                  presentationNow,
                )
              : 'victoria-idle';

          sprite.setTexture?.(
            textureKey,
          );

          publishLiveDebug(
            'victoria',
            {
              logical:
                this.controller.world
                  .units[unit.id]
                  ?.position,
              authoritativeScreen: {
                x: unit.x,
                y: unit.y,
              },
              visualScreen: {
                x: visual.x,
                y: visual.y,
              },
              spriteScreen: {
                x: sprite.x,
                y: sprite.y,
              },
              moving,
              presentationNow,
              round:
                this.controller.world
                  .turn.round,
              phase:
                this.controller.world
                  .turn.phase,
              pendingOrders:
                this.controller.runtime
                  .commands
                  .peekTactical()
                  .length,
            },
          );
        }

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

      const selected = this.controller.world.units[frame.selection.unitId];
      if (selected) {
        const layout = createResponsiveBattlefieldLayout(
          Number(scene.scale?.width) || 1600, Number(scene.scale?.height) || 900,
        );
        const points = tilePolygon(selected.position, layout.projection, topologyForWorld(this.controller.world).id);
        this.selectionMarker?.setDisplaySize?.(
          (Math.max(...points.map(p => p.x))-Math.min(...points.map(p => p.x)))*.82,
          (Math.max(...points.map(p => p.y))-Math.min(...points.map(p => p.y)))*.6,
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
