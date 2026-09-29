import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ASSET_PATHS,
} from '../../src/client/assets/canonical';

describe('Phase 6 canonical battlefield assets', () => {
  it('locks the palace battlefield artwork', () => {
    expect(CANONICAL_ASSET_PATHS.board)
      .toBe('/Queen-Victoria-RTS/assets/battlefield/palace-board.png');
  });

  it('locks Victoria to her canonical battlefield art', () => {
    expect(CANONICAL_ASSET_PATHS.victoria)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria.png');
  });

  it('locks Shadow King V3 explicitly', () => {
    expect(CANONICAL_ASSET_PATHS.shadowKing)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-king-v3.png');
  });

  it('uses stable browser paths rather than phone-storage paths', () => {
    for (const path of Object.values(CANONICAL_ASSET_PATHS)) {
      expect(path.startsWith('/Queen-Victoria-RTS/assets/')).toBe(true);
      expect(path.includes('/storage/')).toBe(false);
    }
  });
});

describe('Phase 6 canonical troop art', () => {
  it('locks Victoria troop assets', () => {
    expect(CANONICAL_ASSET_PATHS.victoriaPawn)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria-pawn.png');

    expect(CANONICAL_ASSET_PATHS.victoriaKnight)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria-knight.png');

    expect(CANONICAL_ASSET_PATHS.victoriaBishop)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria-bishop.png');

    expect(CANONICAL_ASSET_PATHS.victoriaRook)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria-rook.png');
  });

  it('locks Shadow troop assets', () => {
    expect(CANONICAL_ASSET_PATHS.shadowKnight)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-knight.png');

    expect(CANONICAL_ASSET_PATHS.shadowBishop)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-bishop.png');

    expect(CANONICAL_ASSET_PATHS.shadowRook)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-rook.png');

    expect(CANONICAL_ASSET_PATHS.shadowQueen)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-queen.png');
  });
});

describe('Phase 6 sovereign and pawn art', () => {
  it('locks Victoria King artwork', () => {
    expect(CANONICAL_ASSET_PATHS.victoriaKing)
      .toBe('/Queen-Victoria-RTS/assets/units/victoria-king.png');
  });

  it('locks Shadow pawn artwork', () => {
    expect(CANONICAL_ASSET_PATHS.shadowPawn)
      .toBe('/Queen-Victoria-RTS/assets/units/shadow-pawn.png');
  });
});
