import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ASSET_PATHS,
} from '../../src/client/assets/canonical';

describe('Phase 6 canonical battlefield assets', () => {
  it('locks the palace battlefield artwork', () => {
    expect(CANONICAL_ASSET_PATHS.board)
      .toBe('/assets/battlefield/palace-board.png');
  });

  it('locks Victoria to her canonical battlefield art', () => {
    expect(CANONICAL_ASSET_PATHS.victoria)
      .toBe('/assets/units/victoria.png');
  });

  it('locks Shadow King V3 explicitly', () => {
    expect(CANONICAL_ASSET_PATHS.shadowKing)
      .toBe('/assets/units/shadow-king-v3.png');
  });

  it('uses stable browser paths rather than phone-storage paths', () => {
    for (const path of Object.values(CANONICAL_ASSET_PATHS)) {
      expect(path.startsWith('/assets/')).toBe(true);
      expect(path.includes('/storage/')).toBe(false);
    }
  });
});

describe('Phase 6 canonical troop art', () => {
  it('locks Victoria troop assets', () => {
    expect(CANONICAL_ASSET_PATHS.victoriaPawn)
      .toBe('/assets/units/victoria-pawn.png');

    expect(CANONICAL_ASSET_PATHS.victoriaKnight)
      .toBe('/assets/units/victoria-knight.png');

    expect(CANONICAL_ASSET_PATHS.victoriaBishop)
      .toBe('/assets/units/victoria-bishop.png');

    expect(CANONICAL_ASSET_PATHS.victoriaRook)
      .toBe('/assets/units/victoria-rook.png');
  });

  it('locks Shadow troop assets', () => {
    expect(CANONICAL_ASSET_PATHS.shadowKnight)
      .toBe('/assets/units/shadow-knight.png');

    expect(CANONICAL_ASSET_PATHS.shadowBishop)
      .toBe('/assets/units/shadow-bishop.png');

    expect(CANONICAL_ASSET_PATHS.shadowRook)
      .toBe('/assets/units/shadow-rook.png');

    expect(CANONICAL_ASSET_PATHS.shadowQueen)
      .toBe('/assets/units/shadow-queen.png');
  });
});

describe('Phase 6 sovereign and pawn art', () => {
  it('locks Victoria King artwork', () => {
    expect(CANONICAL_ASSET_PATHS.victoriaKing)
      .toBe('/assets/units/victoria-king.png');
  });

  it('locks Shadow pawn artwork', () => {
    expect(CANONICAL_ASSET_PATHS.shadowPawn)
      .toBe('/assets/units/shadow-pawn.png');
  });
});
