import {
  describe,
  expect,
  it,
} from 'vitest';

import * as projectionModule
  from '../../src/client/board/projection';

import {
  boardCellToScreen,
  screenToBoardCell,
  type BoardProjection,
} from '../../src/client/board/projection';

const base: BoardProjection = {
  topLeft: {
    x: 400,
    y: 180,
  },
  topRight: {
    x: 1200,
    y: 180,
  },
  bottomLeft: {
    x: 120,
    y: 820,
  },
  bottomRight: {
    x: 1480,
    y: 820,
  },
};

type SafeProjectionFactory = (
  projection: BoardProjection,
  hudTop: number,
) => BoardProjection;

function safeFactory():
  SafeProjectionFactory {
  const typed =
    projectionModule as unknown as {
      constrainProjectionAboveHud?:
        SafeProjectionFactory;
    };

  const candidate =
    typed.constrainProjectionAboveHud;

  expect(
    typeof candidate,
  ).toBe('function');

  return candidate!;
}

describe(
  'GOD battlefield HUD exclusion',
  () => {
    it('keeps every playable cell centre above the HUD deck', () => {
      const hudTop = 700;

      const projection =
        safeFactory()(
          base,
          hudTop,
        );

      for (
        let y = 0;
        y < 16;
        y += 1
      ) {
        for (
          let x = 0;
          x < 16;
          x += 1
        ) {
          expect(
            boardCellToScreen(
              { x, y },
              projection,
            ).y,
          ).toBeLessThan(
            hudTop,
          );
        }
      }
    });

    it('preserves pointer-to-board mapping after HUD exclusion', () => {
      const projection =
        safeFactory()(
          base,
          700,
        );

      const cells = [
        { x: 0, y: 0 },
        { x: 7, y: 7 },
        { x: 15, y: 15 },
        { x: 3, y: 13 },
      ];

      for (
        const cell of cells
      ) {
        const screen =
          boardCellToScreen(
            cell,
            projection,
          );

        expect(
          screenToBoardCell(
            screen,
            projection,
          ),
        ).toEqual(cell);
      }
    });

    it('preserves the exclusion invariant when the available HUD top changes', () => {
      const factory =
        safeFactory();

      for (
        const hudTop of
        [760, 620, 480]
      ) {
        const projection =
          factory(
            base,
            hudTop,
          );

        const bottom =
          boardCellToScreen(
            {
              x: 15,
              y: 15,
            },
            projection,
          );

        expect(
          bottom.y,
        ).toBeLessThan(
          hudTop,
        );
      }
    });
  },
);

describe(
  'GOD battlefield resize invariants',
  () => {
    it('preserves safe projection and inverse mapping across landscape and portrait-like layouts', () => {
      const factory =
        safeFactory();

      const cases = [
        {
          projection: {
            topLeft: { x: 240, y: 120 },
            topRight: { x: 1360, y: 120 },
            bottomLeft: { x: 80, y: 820 },
            bottomRight: { x: 1520, y: 820 },
          },
          hudTop: 700,
        },
        {
          projection: {
            topLeft: { x: 120, y: 140 },
            topRight: { x: 780, y: 140 },
            bottomLeft: { x: 40, y: 760 },
            bottomRight: { x: 860, y: 760 },
          },
          hudTop: 620,
        },
      ];

      for (
        const sample of cases
      ) {
        const projection =
          factory(
            sample.projection,
            sample.hudTop,
          );

        const cells = [
          { x: 0, y: 0 },
          { x: 7, y: 7 },
          { x: 15, y: 15 },
        ];

        for (
          const cell of cells
        ) {
          const screen =
            boardCellToScreen(
              cell,
              projection,
            );

          expect(
            screen.y,
          ).toBeLessThan(
            sample.hudTop,
          );

          expect(
            screenToBoardCell(
              screen,
              projection,
            ),
          ).toEqual(cell);
        }
      }
    });
  },
);
