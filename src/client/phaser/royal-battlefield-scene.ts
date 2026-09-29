import {
  createBattlefieldSceneClass,
} from './phaser-scene';
import {
  createRoyalBattlefieldGuidance,
} from './royal-battlefield-guidance';
import {
  findVictoriaUnitAtPoint,
} from '../input/unit-tap-target';

type PhaserSceneBase = new (
  config?: any,
) => object;

type Destroyable = Readonly<{
  destroy?: () => void;
}>;

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

      this.tuneHudReadability();
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
    }

    selectUnit(
      unitId: string | null,
    ): void {
      super.selectUnit(unitId);
      this.refreshRoyalGuidance();
      this.redrawRoyalMoveMarkers();
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

      if (
        !self.selectedUnitId ||
        !overlay?.selectedAnchor
      ) {
        return;
      }

      const selectedHalo =
        self.add.ellipse(
          overlay.selectedAnchor.x,
          overlay.selectedAnchor.y,
          76,
          38,
          0xffd447,
          0.16,
        );

      selectedHalo
        ?.setStrokeStyle?.(
          5,
          0xfff0a6,
          1,
        )
        ?.setDepth?.(873);

      this.royalMoveMarkers.push(
        selectedHalo,
      );

      for (
        const destination of
        overlay.destinations
      ) {
        const marker =
          self.add.ellipse(
            destination.anchor.x,
            destination.anchor.y,
            42,
            24,
            0xf3c84b,
            0.42,
          );

        marker
          .setStrokeStyle?.(
            4,
            0xffef93,
            1,
          )
          ?.setDepth?.(875);

        const pip =
          self.add.circle(
            destination.anchor.x,
            destination.anchor.y,
            5,
            0xfff1a8,
            1,
          );

        pip.setDepth?.(876);

        this.royalMoveMarkers.push(
          marker,
          pip,
        );
      }

      const stagedOrders =
        self.controller.runtime.commands
          .peekTactical()
          .filter(
            (order: any) =>
              order.faction ===
                'victoria' &&
              order.kind === 'move' &&
              order.unitId ===
                self.selectedUnitId,
          );

      stagedOrders.forEach(
        (
          order: any,
          index: number,
        ) => {
          const destination =
            overlay.destinations.find(
              (candidate: any) =>
                candidate.cell.x ===
                  order.destination.x &&
                candidate.cell.y ===
                  order.destination.y,
            );

          if (!destination) {
            return;
          }

          const graphics =
            self.add.graphics?.();

          graphics
            ?.lineStyle?.(
              5,
              0xffd34f,
              0.95,
            );
          graphics
            ?.lineBetween?.(
              overlay.selectedAnchor.x,
              overlay.selectedAnchor.y,
              destination.anchor.x,
              destination.anchor.y,
            );
          graphics?.setDepth?.(874);

          const badge =
            self.add.text(
              destination.anchor.x,
              destination.anchor.y - 22,
              String(index + 1),
              {
                fontFamily:
                  'Georgia, serif',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#1b0a07',
                backgroundColor:
                  '#ffd75e',
                padding: {
                  x: 7,
                  y: 3,
                },
              },
            );

          badge
            .setOrigin?.(0.5)
            ?.setDepth?.(877);

          if (graphics) {
            this.royalMoveMarkers.push(
              graphics,
            );
          }
          this.royalMoveMarkers.push(
            badge,
          );
        },
      );
    }
  };
}
