import {
  createBattlefieldSceneClass,
} from './phaser-scene';
import {
  createRoyalBattlefieldGuidance,
} from './royal-battlefield-guidance';

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
    );

  return class RoyalBattlefieldScene extends BattlefieldBase {
    private royalGuideHeadline: any = null;
    private royalGuideInstruction: any = null;
    private royalGuideDetail: any = null;
    private royalMoveMarkers: Destroyable[] = [];

    create(): void {
      super.create();

      const scene = this as any;
      const width =
        Number(scene.scale?.width) || 1600;
      const height =
        Number(scene.scale?.height) || 1200;

      this.royalGuideHeadline =
        scene.add.text(
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
        scene.add.text(
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
        scene.add.text(
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

      // The approved spec puts Victoria's sovereign profile in the
      // bottom-left command deck. Reuse the existing portrait-backed
      // Victoria status art there until the generated atlas is promoted.
      (this as any).hudRegions
        ?.selectedUnit
        ?.setTexture?.(
          'hud-victoria-status',
        );

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
      const before =
        this.controller.runtime.commands
          .peekTactical()
          .length;

      super.handleBoardPointer(point);

      const after =
        this.controller.runtime.commands
          .peekTactical()
          .length;

      if (after !== before) {
        (this as any)
          .refreshHudText?.();
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

      const remaining = Math.max(
        0,
        this.controller.world.turn
          .royalCommandsRemaining
          .victoria - stagedCost,
      );

      const guidance =
        createRoyalBattlefieldGuidance({
          selectedUnitId:
            this.selectedUnitId,
          stagedOrders:
            stagedOrders.length,
          royalCommandsRemaining:
            remaining,
          phase:
            this.controller.world
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

      const scene = this as any;
      const overlay =
        this.currentSelectionOverlay;

      if (
        !this.selectedUnitId ||
        !overlay.selectedAnchor
      ) {
        return;
      }

      for (
        const destination of
        overlay.destinations
      ) {
        const marker =
          scene.add.circle(
            destination.anchor.x,
            destination.anchor.y,
            13,
            0xf3c84b,
            0.16,
          );

        marker
          .setStrokeStyle?.(
            3,
            0xffe891,
            0.95,
          )
          ?.setDepth?.(875);

        const pip =
          scene.add.circle(
            destination.anchor.x,
            destination.anchor.y,
            3,
            0xfff1a8,
            0.95,
          );

        pip.setDepth?.(876);

        this.royalMoveMarkers.push(
          marker,
          pip,
        );
      }

      const stagedOrders =
        this.controller.runtime.commands
          .peekTactical()
          .filter(
            order =>
              order.faction ===
                'victoria' &&
              order.kind === 'move' &&
              order.unitId ===
                this.selectedUnitId,
          );

      stagedOrders.forEach(
        (order, index) => {
          if (
            order.kind !== 'move'
          ) {
            return;
          }

          const destination =
            overlay.destinations.find(
              candidate =>
                candidate.cell.x ===
                  order.destination.x &&
                candidate.cell.y ===
                  order.destination.y,
            );

          if (!destination) {
            return;
          }

          const graphics =
            scene.add.graphics?.();

          graphics
            ?.lineStyle?.(
              4,
              0xffd34f,
              0.82,
            );
          graphics
            ?.lineBetween?.(
              overlay.selectedAnchor!.x,
              overlay.selectedAnchor!.y,
              destination.anchor.x,
              destination.anchor.y,
            );
          graphics?.setDepth?.(874);

          const badge =
            scene.add.text(
              destination.anchor.x,
              destination.anchor.y - 18,
              String(index + 1),
              {
                fontFamily:
                  'Georgia, serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#1b0a07',
                backgroundColor:
                  '#ffd75e',
                padding: {
                  x: 6,
                  y: 2,
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
