import { assetUrl } from '../assets/base-url';

export const TITLE_SCENE_KEY = 'title';

type SceneBaseConstructor =
  new (...args: any[]) => object;

export function createTitleSceneClass<
  BaseScene extends SceneBaseConstructor,
>(SceneBase: BaseScene) {
  return class TitleScene extends SceneBase {
    constructor(..._args: any[]) {
      super({
        key: TITLE_SCENE_KEY,
      });
    }

    preload(): void {
      const scene = this as any;

      scene.load.image(
        'title-palace',
        assetUrl(
          'assets/battlefield/palace-board.png',
        ),
      );
    }

    create(): void {
      const scene = this as any;
      const width =
        Number(scene.scale?.width) || 1600;
      const height =
        Number(scene.scale?.height) || 1200;

      const background = scene.add.image(
        width / 2,
        height / 2,
        'title-palace',
      );

      background.setDisplaySize?.(
        width,
        height,
      );
      background.setDepth?.(0);

      scene.add
        .rectangle?.(
          width * 0.70,
          height * 0.5,
          width * 0.54,
          height,
          0x120a12,
          0.42,
        )
        ?.setDepth?.(1);

      const title = scene.add.text(
        width * 0.70,
        height * 0.26,
        'QUEEN VICTORIA RTS',
        {
          fontFamily:
            'Georgia, Times New Roman, serif',
          fontSize: '72px',
          fontStyle: 'bold',
          color: '#fff0c2',
          stroke: '#4c120d',
          strokeThickness: 8,
          align: 'center',
        },
      );

      title
        .setOrigin?.(0.5)
        ?.setDepth?.(2);

      const subtitle = scene.add.text(
        width * 0.70,
        height * 0.34,
        'ROYAL TACTICAL STRATEGY',
        {
          fontFamily:
            'Georgia, Times New Roman, serif',
          fontSize: '26px',
          color: '#f4d98a',
          letterSpacing: 5,
        },
      );

      subtitle
        .setOrigin?.(0.5)
        ?.setDepth?.(2);

      this.createMenuButton(
        width * 0.70,
        height * 0.50,
        'START SKIRMISH',
        () => scene.scene.start(
          'battlefield',
        ),
      );

      this.createMenuButton(
        width * 0.70,
        height * 0.61,
        'OPTIONS',
        () => this.showNotice(
          'OPTIONS · COMING WITH THE UI PASS',
        ),
      );

      this.createMenuButton(
        width * 0.70,
        height * 0.72,
        'CREDITS',
        () => this.showNotice(
          'QUEEN VICTORIA RTS · ROYAL TACTICAL STRATEGY',
        ),
      );
    }

    private createMenuButton(
      x: number,
      y: number,
      label: string,
      action: () => void,
    ): void {
      const scene = this as any;
      const width =
        Number(scene.scale?.width) || 1600;
      const height =
        Number(scene.scale?.height) || 1200;

      const frame = scene.add
        .rectangle?.(
          x,
          y,
          width * 0.31,
          height * 0.072,
          0x471313,
          0.96,
        )
        ?.setStrokeStyle?.(
          4,
          0xd6ad55,
          1,
        )
        ?.setDepth?.(2)
        ?.setInteractive?.({
          useHandCursor: true,
        });

      scene.add
        .text(
          x,
          y,
          label,
          {
            fontFamily:
              'Georgia, Times New Roman, serif',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#fff0c2',
          },
        )
        .setOrigin?.(0.5)
        ?.setDepth?.(3);

      frame?.on?.(
        'pointerover',
        () => frame.setFillStyle?.(
          0x7c1f22,
          1,
        ),
      );

      frame?.on?.(
        'pointerout',
        () => frame.setFillStyle?.(
          0x471313,
          0.96,
        ),
      );

      frame?.on?.(
        'pointerdown',
        action,
      );
    }

    private showNotice(
      message: string,
    ): void {
      const scene = this as any;
      const width =
        Number(scene.scale?.width) || 1600;
      const height =
        Number(scene.scale?.height) || 1200;

      scene.children
        ?.getByName?.(
          'title-notice',
        )
        ?.destroy?.();

      scene.add
        .text(
          width * 0.70,
          height * 0.84,
          message,
          {
            fontFamily:
              'Georgia, Times New Roman, serif',
            fontSize: '18px',
            color: '#f4d98a',
            backgroundColor:
              'rgba(20, 9, 16, 0.78)',
            padding: {
              x: 18,
              y: 10,
            },
          },
        )
        .setOrigin?.(0.5)
        ?.setName?.('title-notice')
        ?.setDepth?.(4);
    }
  };
}
