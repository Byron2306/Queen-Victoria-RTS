import { assetUrl } from '../assets/base-url';

export const TITLE_SCENE_KEY = 'title';
export const TITLE_BACKGROUND_ASSET =
  'assets/title/title-screen.png';

export const TITLE_MENU_HITBOXES = {
  start: {
    x: 0.68,
    y: 0.56,
    width: 0.32,
    height: 0.078,
  },
  options: {
    x: 0.68,
    y: 0.65,
    width: 0.32,
    height: 0.078,
  },
  credits: {
    x: 0.68,
    y: 0.74,
    width: 0.32,
    height: 0.078,
  },
} as const;

type SceneBaseConstructor =
  new (...args: any[]) => object;

type MenuHitbox =
  (typeof TITLE_MENU_HITBOXES)[
    keyof typeof TITLE_MENU_HITBOXES
  ];

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
        'title-screen',
        assetUrl(TITLE_BACKGROUND_ASSET),
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
        'title-screen',
      );

      background.setDisplaySize?.(
        width,
        height,
      );
      background.setDepth?.(0);

      this.createMenuHitbox(
        TITLE_MENU_HITBOXES.start,
        () => scene.scene.start(
          'battlefield',
        ),
      );

      this.createMenuHitbox(
        TITLE_MENU_HITBOXES.options,
        () => this.showNotice(
          'OPTIONS · COMING WITH THE UI PASS',
        ),
      );

      this.createMenuHitbox(
        TITLE_MENU_HITBOXES.credits,
        () => this.showNotice(
          'QUEEN VICTORIA RTS · ROYAL TACTICAL STRATEGY',
        ),
      );
    }

    private createMenuHitbox(
      box: MenuHitbox,
      action: () => void,
    ): void {
      const scene = this as any;
      const width =
        Number(scene.scale?.width) || 1600;
      const height =
        Number(scene.scale?.height) || 1200;

      scene.add
        .rectangle?.(
          width * box.x,
          height * box.y,
          width * box.width,
          height * box.height,
          0xffffff,
          0.001,
        )
        ?.setDepth?.(2)
        ?.setInteractive?.({
          useHandCursor: true,
        })
        ?.on?.(
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
          width * 0.68,
          height * 0.84,
          message,
          {
            fontFamily:
              'Georgia, Times New Roman, serif',
            fontSize: '18px',
            color: '#f4d98a',
            backgroundColor:
              'rgba(20, 9, 16, 0.84)',
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
