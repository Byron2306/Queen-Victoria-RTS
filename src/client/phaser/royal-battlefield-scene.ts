import { createBattlefieldSceneClass } from './phaser-scene';
import { createRoyalBattlefieldGuidance } from './royal-battlefield-guidance';
import { findVictoriaUnitAtPoint } from '../input/unit-tap-target';
import { assetUrl } from '../assets/base-url';
import { canUnitAttackTarget } from '../../sim/combat';
import { isRecruitUnlocked } from '../../sim/economy';
import {
  queueRecruitment,
  type ProductionReceipt,
} from '../../sim/production';
import { queuePromotionRequest } from '../../sim/promotion';
import { createBattlefieldSceneRuntime } from './scene-rendering';
import { createResponsiveBattlefieldLayout } from '../render/responsive-battlefield';
import {
  createTriptychOrderVisuals,
  createTriptychStrategicOverlay,
} from '../render/triptych-presentation';
import type {
  HeroAbilityId,
  PromotableUnitKind,
  RecruitableUnitKind,
  WorldState,
} from '../../sim/types';

type PhaserSceneBase = new (config?: any) => object;
type Destroyable = Readonly<{ destroy?: () => void }>;
type Point = Readonly<{ x: number; y: number }>;

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

const ORDER_COLOURS: Readonly<Record<string, number>> = {
  move: 0xffd34f,
  attack: 0xff493d,
  assault: 0xff8a2d,
  reinforce: 0x66d7ff,
  guard: 0xd8b1ff,
  ability: 0xffe584,
  recruit: 0xd6ad4a,
};

const ORDER_BADGES: Readonly<Record<string, string>> = {
  move: 'M',
  attack: 'A',
  assault: '⚔',
  reinforce: 'R',
  guard: 'G',
  ability: '✦',
  recruit: '+',
};

function polygonPath(graphics: any, polygon: readonly Point[]): void {
  if (!graphics || polygon.length === 0) return;
  graphics.beginPath?.();
  graphics.moveTo?.(polygon[0]!.x, polygon[0]!.y);
  for (let i = 1; i < polygon.length; i += 1) {
    graphics.lineTo?.(polygon[i]!.x, polygon[i]!.y);
  }
  graphics.closePath?.();
}

export function createRoyalBattlefieldSceneClass<TBase extends PhaserSceneBase>(
  BaseScene: TBase,
) {
  const BattlefieldBase = createBattlefieldSceneClass(BaseScene) as any;

  return class RoyalBattlefieldScene extends BattlefieldBase {
    private royalGuideHeadline: any = null;
    private royalGuideInstruction: any = null;
    private royalGuideDetail: any = null;
    private royalMoveMarkers: Destroyable[] = [];
    private royalNodeSprites: Destroyable[] = [];
    private royalStrategicMarkers: Destroyable[] = [];
    private royalNodeSignature = '';
    private royalStrategicSignature = '';
    private lastProductionFeedback: ProductionReceipt | null = null;

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
      for (const [key, path] of images) self.load.image(key, assetUrl(path));
    }

    create(): void {
      super.create();
      const self = this as any;
      const width = Number(self.scale?.width) || 1600;
      const height = Number(self.scale?.height) || 1200;

      this.royalGuideHeadline = self.add.text(width / 2, height * 0.735, '', {
        fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif",
        fontSize: '22px', fontStyle: 'bold', color: '#ffe7a0',
        stroke: '#2b0d09', strokeThickness: 5, align: 'center',
      }).setOrigin?.(0.5)?.setDepth?.(5200);

      this.royalGuideInstruction = self.add.text(width / 2, height * 0.765, '', {
        fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif",
        fontSize: '18px', fontStyle: 'bold', color: '#fff8dc',
        stroke: '#2b0d09', strokeThickness: 4, align: 'center',
        backgroundColor: 'rgba(39, 15, 12, 0.76)',
        padding: { x: 16, y: 6 },
      }).setOrigin?.(0.5)?.setDepth?.(5200);

      this.royalGuideDetail = self.add.text(width / 2, height * 0.795, '', {
        fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif",
        fontSize: '12px', color: '#f0d9a0', stroke: '#1a0907',
        strokeThickness: 3, align: 'center',
      }).setOrigin?.(0.5)?.setDepth?.(5200);

      this.wireStrategicControls();
      this.tuneHudReadability();
      this.forceShadowFacing();
      this.redrawRoyalNodes(true);
      this.redrawStrategicOverlay(true);
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
      this.refreshStrategicControls();
    }

    update(time: number, delta: number): void {
      super.update(time, delta);
      this.forceShadowFacing();
      this.redrawRoyalNodes();
      this.redrawStrategicOverlay();
      this.refreshStrategicControls();
    }

    selectUnit(unitId: string | null): void {
      super.selectUnit(unitId);
      this.lastProductionFeedback = null;
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
      this.refreshStrategicControls();
    }

    handleBoardPointer(point: Point): void {
      const self = this as any;
      const candidates = Array.from(self.unitSprites?.entries?.() ?? []).map((entry: any) => {
        const [id, sprite] = entry;
        return {
          id,
          faction: self.controller.world.units[id]?.faction ?? 'obsidian',
          x: Number(sprite.x) || 0,
          y: Number(sprite.y) || 0,
        };
      });

      const touchRadius = Math.max(
        42,
        Math.min(Number(self.scale?.width) || 1600, Number(self.scale?.height) || 1200) * 0.055,
      );

      const tappedUnitId = findVictoriaUnitAtPoint(point, candidates, touchRadius);
      if (tappedUnitId) {
        this.selectUnit(tappedUnitId);
        return;
      }

      const selectedUnitId = self.selectedUnitId as string | null;
      if (selectedUnitId) {
        let attackTargetId: string | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          if (candidate.faction !== 'obsidian') continue;
          if (!canUnitAttackTarget(self.controller.world, selectedUnitId, candidate.id)) continue;
          const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
          if (distance <= touchRadius && distance < bestDistance) {
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
          this.lastProductionFeedback = null;
          self.refreshHudText?.();
          this.refreshRoyalGuidance();
          this.redrawRoyalMoveMarkers();
          return;
        }
      }

      const before = self.controller.runtime.commands.peekTactical().length;
      super.handleBoardPointer(point);
      const after = self.controller.runtime.commands.peekTactical().length;
      if (after !== before) {
        this.lastProductionFeedback = null;
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
        artwork?.setInteractive?.({ useHandCursor: true })?.on?.('pointerdown', () => {
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
        artwork?.setInteractive?.({ useHandCursor: true })?.on?.('pointerdown', () => {
          this.recruitOrPromote(DEPLOY_KINDS[index]!);
        });
      });

      // Touch-first: make the whole deployment panel quarters tappable rather
      // than forcing the player to hit the small unit illustration itself.
      const panel = self.hudRegions?.deployUnits;
      if (panel && self.add?.zone && panel.displayWidth && panel.displayHeight) {
        const offsets = [-0.30, -0.10, 0.10, 0.30];
        offsets.forEach((offset, index) => {
          self.add.zone(
            panel.x + panel.displayWidth * offset,
            panel.y,
            panel.displayWidth * 0.18,
            panel.displayHeight * 0.72,
          )?.setDepth?.(5100)?.setInteractive?.({ useHandCursor: true })?.on?.(
            'pointerdown',
            () => this.recruitOrPromote(DEPLOY_KINDS[index]!),
          );
        });
      }
    }

    private queueVictoriaAbility(ability: HeroAbilityId): void {
      const self = this as any;
      const world = self.controller.world;
      if (world.match.status !== 'active' || world.turn.phase !== 'victoria_command') return;
      const hero = world.heroes.victoria;
      if (!hero?.heroUnitId || hero.status !== 'alive') return;
      const abilityState = hero.abilities[ability];
      if (!abilityState || abilityState.cooldownTicksRemaining > 0) return;
      self.controller.runtime.commands.heroAbility(
        world, 'victoria', hero.heroUnitId, ability,
      );
      this.lastProductionFeedback = null;
      self.refreshHudText?.();
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
    }

    private recruitOrPromote(kind: RecruitableUnitKind): void {
      const self = this as any;
      const world = self.controller.world;
      if (world.match.status !== 'active' || world.turn.phase !== 'victoria_command') return;

      const selectedId = self.selectedUnitId as string | null;
      const selected = selectedId ? world.units[selectedId] : undefined;
      if (
        selected && selected.faction === 'victoria' && selected.kind === 'pawn' &&
        (selected.position.y <= 1 || selected.position.y >= 14) && kind !== 'pawn'
      ) {
        const result = queuePromotionRequest(world, {
          type: 'promote', sequence: world.tick, issuedTick: world.tick,
          faction: 'victoria', pawnId: selected.id,
          targetKind: kind as PromotableUnitKind,
        });
        self.controller.runtime.world = result.state;
        this.lastProductionFeedback = null;
      } else {
        const result = queueRecruitment(world, {
          type: 'recruit', sequence: world.tick, issuedTick: world.tick,
          faction: 'victoria', unitKind: kind,
        });
        self.controller.runtime.world = result.state;
        this.lastProductionFeedback = result.receipt;
      }

      self.refreshHudText?.();
      this.refreshStrategicControls();
      this.refreshRoyalGuidance();
      this.redrawStrategicOverlay(true);
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
          hero && hero.status === 'alive' && hero.level >= unlockLevel &&
          hero.abilities[ability]?.cooldownTicksRemaining === 0 &&
          world.turn.phase === 'victoria_command',
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
        const available = isRecruitUnlocked(world, 'victoria', kind) &&
          world.turn.phase === 'victoria_command';
        artwork?.setAlpha?.(available ? 1 : 0.35);
      });
    }

    private tuneHudReadability(): void {
      const hudText = (this as any).hudText ?? {};
      for (const key of ['crown', 'nodes', 'command', 'royalCommands']) {
        hudText[key]?.setFontSize?.(11);
      }
      hudText.round?.setFontSize?.(10);
      hudText.phase?.setFontSize?.(10);
      hudText.pendingOrders?.setFontSize?.(10);
      hudText.turnBanner?.setVisible?.(false);
      hudText.cancelLast?.setFontSize?.(14);
      hudText.commitOrders?.setFontSize?.(16);
    }

    private attackableTargetIds(): string[] {
      const self = this as any;
      const selectedId = self.selectedUnitId as string | null;
      if (!selectedId) return [];
      return Object.values(self.controller.world.units)
        .filter((unit: any) => unit.faction === 'obsidian' &&
          canUnitAttackTarget(self.controller.world, selectedId, unit.id))
        .map((unit: any) => unit.id)
        .sort();
    }

    private refreshRoyalGuidance(): void {
      if (!this.royalGuideInstruction) return;
      const self = this as any;
      const stagedOrders = self.controller.runtime.commands.peekTactical()
        .filter((order: any) => order.faction === 'victoria');
      const stagedCost = stagedOrders.reduce(
        (total: number, order: any) => total + order.commandCost, 0,
      );
      const remaining = Math.max(
        0,
        self.controller.world.turn.royalCommandsRemaining.victoria - stagedCost,
      );
      const guidance = createRoyalBattlefieldGuidance({
        selectedUnitId: self.selectedUnitId,
        stagedOrders: stagedOrders.length,
        royalCommandsRemaining: remaining,
        phase: self.controller.world.turn.phase,
        attackableTargets: this.attackableTargetIds().length,
        productionFeedback: this.lastProductionFeedback,
      });
      this.royalGuideHeadline?.setText?.(guidance.headline);
      this.royalGuideInstruction?.setText?.(guidance.instruction);
      this.royalGuideDetail?.setText?.(guidance.detail);
    }

    private clearRoyalMoveMarkers(): void {
      for (const marker of this.royalMoveMarkers) marker.destroy?.();
      this.royalMoveMarkers = [];
    }

    private drawTilePolygon(
      polygon: readonly Point[] | null | undefined,
      fill: number,
      alpha: number,
      stroke: number,
      strokeWidth = 3,
      depth = 875,
    ): any {
      if (!polygon || polygon.length < 3) return null;
      const self = this as any;
      const graphics = self.add.graphics?.();
      if (!graphics) return null;
      graphics.fillStyle?.(fill, alpha);
      graphics.lineStyle?.(strokeWidth, stroke, Math.min(1, alpha + 0.18));
      polygonPath(graphics, polygon);
      graphics.fillPath?.();
      graphics.strokePath?.();
      graphics.setDepth?.(depth);
      return graphics;
    }

    private drawOrderLine(from: Point, to: Point, style: string, index: number): void {
      const self = this as any;
      const colour = ORDER_COLOURS[style] ?? 0xffd34f;
      const graphics = self.add.graphics?.();
      if (!graphics) return;
      const width = style === 'assault' ? 8 : style === 'reinforce' ? 4 : 5;
      graphics.lineStyle?.(width, colour, style === 'reinforce' ? 0.82 : 0.96);
      graphics.lineBetween?.(from.x, from.y, to.x, to.y);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / length;
      const uy = dy / length;
      const px = -uy;
      const py = ux;
      const arrowLength = style === 'assault' ? 24 : 18;
      const arrowWidth = style === 'assault' ? 12 : 9;
      graphics.fillStyle?.(colour, 0.98);
      graphics.fillTriangle?.(
        to.x, to.y,
        to.x - ux * arrowLength + px * arrowWidth,
        to.y - uy * arrowLength + py * arrowWidth,
        to.x - ux * arrowLength - px * arrowWidth,
        to.y - uy * arrowLength - py * arrowWidth,
      );
      graphics.setDepth?.(2101);
      this.royalMoveMarkers.push(graphics);

      const badge = self.add.text?.(
        (from.x + to.x) / 2,
        (from.y + to.y) / 2 - 18,
        `${index + 1}${ORDER_BADGES[style] ?? ''}`,
        {
          fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold',
          color: '#160907', backgroundColor: '#f4d77c',
          padding: { x: 6, y: 3 },
        },
      );
      badge?.setOrigin?.(0.5)?.setDepth?.(2102);
      if (badge) this.royalMoveMarkers.push(badge);
    }

    private redrawRoyalMoveMarkers(): void {
      this.clearRoyalMoveMarkers();
      const self = this as any;
      const overlay = self.currentSelectionOverlay;
      for (const legacy of self.legalDestinationMarkers ?? []) legacy.setVisible?.(false);

      if (self.selectedUnitId && overlay?.selectedAnchor) {
        const selected = this.drawTilePolygon(
          overlay.selectedPolygon,
          0xb61f2b,
          0.34,
          0xffd86a,
          5,
          873,
        );
        if (selected) this.royalMoveMarkers.push(selected);

        for (const destination of overlay.destinations ?? []) {
          const marker = this.drawTilePolygon(
            destination.polygon,
            0xc62432,
            0.46,
            0xffcb55,
            3,
            875,
          );
          if (marker) this.royalMoveMarkers.push(marker);
        }

        for (const targetId of this.attackableTargetIds()) {
          const target = self.controller.world.units[targetId];
          if (!target) continue;
          const layout = createResponsiveBattlefieldLayout(
            Number(self.scale?.width) || 1600,
            Number(self.scale?.height) || 1200,
          );
          const runtime = createBattlefieldSceneRuntime(
            self.controller.world,
            self.selectedUnitId,
            layout.projection,
          );
          const targetRender = runtime.frame.units.find((unit: any) => unit.id === targetId);
          const targetPolygon = targetRender
            ? (awaitlessTilePolygon(target.position, layout.projection))
            : null;
          const marker = this.drawTilePolygon(
            targetPolygon,
            0x8d1010,
            0.48,
            0xff5148,
            5,
            872,
          );
          if (marker) this.royalMoveMarkers.push(marker);
        }
      }

      const width = Number(self.scale?.width) || 1600;
      const height = Number(self.scale?.height) || 1200;
      const layout = createResponsiveBattlefieldLayout(width, height);
      const staged = self.controller.runtime.commands.peekTactical()
        .filter((order: any) => order.faction === 'victoria');
      const visuals = createTriptychOrderVisuals(
        self.controller.world,
        staged,
        layout.projection,
      );
      visuals.forEach((visual: any, index: number) => {
        if (visual.from && visual.to) this.drawOrderLine(visual.from, visual.to, visual.style, index);
      });
    }

    private clearStrategicOverlay(): void {
      for (const marker of this.royalStrategicMarkers) marker.destroy?.();
      this.royalStrategicMarkers = [];
    }

    private redrawStrategicOverlay(force = false): void {
      const self = this as any;
      const world = self.controller.world as WorldState;
      const width = Number(self.scale?.width) || 1600;
      const height = Number(self.scale?.height) || 1200;
      const signature = JSON.stringify({
        width, height,
        territory: (world.territory as any).tiles,
        banners: (world.territory as any).banners,
        fortifications: (world.territory as any).fortifications,
        military: world.military,
      });
      if (!force && signature === this.royalStrategicSignature) return;
      this.royalStrategicSignature = signature;
      this.clearStrategicOverlay();

      const layout = createResponsiveBattlefieldLayout(width, height);
      const overlay = createTriptychStrategicOverlay(world, layout.projection);

      for (const territory of overlay.territory) {
        const colour = territory.faction === 'victoria' ? 0xb2232d : 0x5a2388;
        const marker = this.drawTilePolygon(territory.polygon, colour, 0.13, colour, 1, 40);
        if (marker) this.royalStrategicMarkers.push(marker);
      }

      for (const fortification of overlay.fortifications) {
        const colour = fortification.faction === 'victoria' ? 0xe1b956 : 0x8b5ac9;
        const marker = this.drawTilePolygon(
          fortification.polygon, colour, 0.26, colour, 4, 1600,
        );
        if (marker) this.royalStrategicMarkers.push(marker);
        const label = self.add.text?.(
          fortification.anchor.x,
          fortification.anchor.y,
          `▰ ${fortification.durability}`,
          { fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#fff0b5', stroke: '#1b0c08', strokeThickness: 3 },
        );
        label?.setOrigin?.(0.5)?.setDepth?.(1602);
        if (label) this.royalStrategicMarkers.push(label);
      }

      for (const banner of overlay.banners) {
        const label = self.add.text?.(
          banner.anchor.x,
          banner.anchor.y - 20,
          `⚑ ${banner.contestedBy ? 'CONTESTED' : `${banner.roundsHeld}/2`}`,
          { fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'bold', color: banner.faction === 'victoria' ? '#ffd46a' : '#c99cff', stroke: '#160907', strokeThickness: 3 },
        );
        label?.setOrigin?.(0.5)?.setDepth?.(1750);
        if (label) this.royalStrategicMarkers.push(label);
      }

      const rankPips: Readonly<Record<string, number>> = {
        recruit: 0, proven: 1, veteran: 2, elite: 3, guard: 4,
      };
      for (const rank of overlay.ranks) {
        const pips = rankPips[rank.rank] ?? 0;
        if (pips <= 0) continue;
        const label = self.add.text?.(
          rank.anchor.x,
          rank.anchor.y - 46,
          `${'◆'.repeat(pips)} ${rank.kills}`,
          { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#ffe49a', stroke: '#1b0b08', strokeThickness: 3 },
        );
        label?.setOrigin?.(0.5)?.setDepth?.(2050);
        if (label) this.royalStrategicMarkers.push(label);
      }
    }

    private showCombatDelta(before: WorldState, after: WorldState, staged: readonly any[]): void {
      const self = this as any;
      for (const [id, oldCombat] of Object.entries(before.combat) as Array<[string, any]>) {
        const oldUnit = before.units[id];
        if (!oldUnit) continue;
        const newCombat = after.combat[id];
        const oldSprite = self.unitSprites?.get?.(id);
        if (!newCombat && !after.units[id]) {
          const text = self.add.text?.(oldSprite?.x ?? 0, (oldSprite?.y ?? 0) - 35, 'DEFEATED', {
            fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#ff7468', stroke: '#220807', strokeThickness: 4,
          });
          text?.setOrigin?.(0.5)?.setDepth?.(6000);
          self.time?.delayedCall?.(1100, () => text?.destroy?.());
          continue;
        }
        if (newCombat && newCombat.health < oldCombat.health) {
          const damage = oldCombat.health - newCombat.health;
          const sprite = self.unitSprites?.get?.(id);
          const text = self.add.text?.(sprite?.x ?? oldSprite?.x ?? 0, (sprite?.y ?? oldSprite?.y ?? 0) - 35, `-${damage} HP`, {
            fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#ff786c', stroke: '#220807', strokeThickness: 4,
          });
          text?.setOrigin?.(0.5)?.setDepth?.(6000);
          self.time?.delayedCall?.(1000, () => text?.destroy?.());
        }
      }

      for (const order of staged) {
        if (order.kind !== 'assault') continue;
        const beforeUnit = before.units[order.unitId];
        const afterUnit = after.units[order.unitId];
        if (!beforeUnit || !afterUnit) continue;
        const advanced = beforeUnit.position.x !== afterUnit.position.x || beforeUnit.position.y !== afterUnit.position.y;
        const sprite = self.unitSprites?.get?.(order.unitId);
        const text = self.add.text?.(
          sprite?.x ?? 0,
          (sprite?.y ?? 0) - 58,
          advanced ? 'ASSAULT ADVANCE' : 'ASSAULT HELD',
          { fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'bold', color: advanced ? '#ffcf69' : '#f2b0a6', stroke: '#1b0b08', strokeThickness: 3 },
        );
        text?.setOrigin?.(0.5)?.setDepth?.(6001);
        self.time?.delayedCall?.(1200, () => text?.destroy?.());
      }
    }

    // The base HUD button calls this dynamically. Capturing both worlds here
    // makes combat visible instead of silently mutating beneath the sprites.
    private commitOrders(): void {
      const self = this as any;
      if (self.controller.world.turn.phase !== 'victoria_command') return;
      const before = self.controller.world as WorldState;
      const staged = [...self.controller.runtime.commands.peekTactical()];
      self.controller.endTurn();
      const after = self.controller.world as WorldState;
      self.layoutBattlefield?.();
      self.refreshHudText?.();
      this.lastProductionFeedback = null;
      this.showCombatDelta(before, after, staged);
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
      this.redrawRoyalNodes(true);
      this.redrawStrategicOverlay(true);
    }

    private clearRoyalNodes(): void {
      for (const sprite of this.royalNodeSprites) sprite.destroy?.();
      this.royalNodeSprites = [];
    }

    private redrawRoyalNodes(force = false): void {
      const self = this as any;
      const width = Number(self.scale?.width) || 1600;
      const height = Number(self.scale?.height) || 1200;
      const layout = createResponsiveBattlefieldLayout(width, height);
      const runtime = createBattlefieldSceneRuntime(
        self.controller.world, self.selectedUnitId, layout.projection,
      );
      const signature = [
        width, height,
        ...runtime.frame.nodes.map((node: any) =>
          `${node.id}:${node.owner ?? 'neutral'}:${node.contested ? 1 : 0}`,
        ),
      ].join('|');
      if (!force && signature === this.royalNodeSignature) return;
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
          const contestedFloor = self.add.image(node.x, node.y, 'royal-tile-contested');
          contestedFloor?.setDisplaySize?.(majorWidth * 1.15, majorHeight * 0.48)?.setAlpha?.(0.84)?.setDepth?.(42);
          this.royalNodeSprites.push(contestedFloor);
        }

        const sprite = self.add.image(node.x, node.y, textureKey);
        sprite?.setOrigin?.(0.5, node.kind === 'crown' ? 0.78 : 0.66)?.setDisplaySize?.(
          node.kind === 'crown' ? majorWidth : minorWidth,
          node.kind === 'crown' ? majorHeight : minorHeight,
        )?.setDepth?.(45);
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

// Small local projection helper kept outside the scene class so the marker
// renderer never falls back to image dimensions. It mirrors tilePolygon's
// public contract without making Phaser own simulation geometry.
import { tilePolygon as awaitlessTilePolygon } from '../board/projection';
