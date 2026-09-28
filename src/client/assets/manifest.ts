export type Phase6AssetKind =
  | 'environment'
  | 'unit'
  | 'hud'
  | 'ability';

export interface Phase6AssetDefinition {
  source: string;
  kind: Phase6AssetKind;
  anchorX: number;
  anchorY: number;
}

export const PHASE6_ASSETS = {
  board: {
    source: 'c5cdd10e-600a-4345-853c-0e15d6a8db45.png',
    kind: 'environment',
    anchorX: 0.5,
    anchorY: 0.5,
  },

  victoria: {
    source: 'da0a7c16-f335-4750-b213-8e2c062a0cb1.png',
    kind: 'unit',
    anchorX: 0.5,
    anchorY: 0.94,
  },

  shadowKing: {
    source: 'shadow-king-v3.png',
    kind: 'unit',
    anchorX: 0.5,
    anchorY: 0.94,
  },
} satisfies Record<string, Phase6AssetDefinition>;
