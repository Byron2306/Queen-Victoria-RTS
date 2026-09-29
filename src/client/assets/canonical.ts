import { assetUrl } from './base-url'

export const CANONICAL_ASSET_PATHS = {
  board: assetUrl('assets/battlefield/palace-board.png'),

  victoria: assetUrl('assets/units/victoria.png'),
  victoriaKing: assetUrl('assets/units/victoria-king.png'),
  victoriaPawn: assetUrl('assets/units/victoria-pawn.png'),
  victoriaKnight: assetUrl('assets/units/victoria-knight.png'),
  victoriaBishop: assetUrl('assets/units/victoria-bishop.png'),
  victoriaRook: assetUrl('assets/units/victoria-rook.png'),

  shadowKing: assetUrl('assets/units/shadow-king-v3.png'),
  shadowPawn: assetUrl('assets/units/shadow-pawn.png'),
  shadowKnight: assetUrl('assets/units/shadow-knight.png'),
  shadowBishop: assetUrl('assets/units/shadow-bishop.png'),
  shadowRook: assetUrl('assets/units/shadow-rook.png'),
  shadowQueen: assetUrl('assets/units/shadow-queen.png'),
} as const
