export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 900;
export const PHASER_PARENT_ID = 'queen-victoria-rts';

export interface PhaserShellDescriptor {
  width: number;
  height: number;
  parentId: string;
  sceneKeys: readonly string[];
  resizePolicy: 'resize';
  autoCenter: boolean;
  runtimeOwner: 'battlefield';
  runtimeKind: 'fixed-tick';
  background: string;
  transparent: boolean;
}

export function createPhaserShellDescriptor(): PhaserShellDescriptor {
  return {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parentId: PHASER_PARENT_ID,
    sceneKeys: ['battlefield'],
    resizePolicy: 'resize',
    autoCenter: true,
    runtimeOwner: 'battlefield',
    runtimeKind: 'fixed-tick',
    background: '#100d18',
    transparent: false,
  };
}
