import { describe, expect, it } from 'vitest';

import { tileId } from '../../src/sim/board-topology';
import {
  buildFortification,
  damageFortification,
  getFortificationAt,
  type FortificationState,
} from '../../src/sim/fortifications';
import { resolveSettlement } from '../../src/sim/territory';
import {
  computeFactionVisibleCells,
  visibleCellsForFortification,
  visibleCellsForUnit,
} from '../../src/sim/vision';
import { createWorld, placeUnit } from '../../src/sim/world';
import type { UnitState } from '../../src/sim/types';

const ids = (cells: readonly { x: number; y: number }[]) => new Set(cells.map(tileId));

function unit(kind: UnitState['kind'], position = { x: 7, y: 7 } as const): UnitState {
  return { id: kind, faction: 'victoria', kind, position };
}

describe('chess-geometric battlefield vision', () => {
  it('gives pawns a one-tile surrounding ring', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('pawn')));

    expect(seen).toContain('6,6');
    expect(seen).toContain('8,8');
    expect(seen).toContain('7,8');
    expect(seen).not.toContain('7,9');
  });

  it('gives knights isolated legal L-hop windows', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('knight')));

    expect(seen).toEqual(new Set([
      '5,6', '5,8', '6,5', '6,9',
      '8,5', '8,9', '9,6', '9,8',
    ]));
    expect(seen).not.toContain('7,8');
  });

  it('gives rook, bishop and queen their bounded ray geometries', () => {
    const world = createWorld();
    const rook = ids(visibleCellsForUnit(world, unit('rook')));
    const bishop = ids(visibleCellsForUnit(world, unit('bishop')));
    const queen = ids(visibleCellsForUnit(world, unit('queen')));

    expect(rook).toContain('7,10');
    expect(rook).not.toContain('7,11');
    expect(rook).not.toContain('10,10');

    expect(bishop).toContain('10,10');
    expect(bishop).not.toContain('11,11');
    expect(bishop).not.toContain('7,8');

    expect(queen).toContain('7,10');
    expect(queen).toContain('10,10');
    expect(queen).not.toContain('7,11');
  });

  it('gives kings two surrounding rings', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('king')));

    expect(seen).toContain('5,5');
    expect(seen).toContain('9,9');
    expect(seen).not.toContain('7,10');
  });

  it('lets ordinary units share sight but lets fortifications terminate rays', () => {
    const rook = unit('rook');
    let world = createWorld([rook]);
    world = placeUnit(world, {
      id: 'friendly-pawn', faction: 'victoria', kind: 'pawn', position: { x: 7, y: 8 },
    });

    expect(ids(visibleCellsForUnit(world, rook))).toContain('7,10');

    world = resolveSettlement(world);
    world = buildFortification(world, {
      id: 'blocking-bastion', faction: 'victoria', cell: { x: 7, y: 8 }, kind: 'bastion',
    }).state;

    const blocked = ids(visibleCellsForUnit(world, rook));
    expect(blocked).toContain('7,8');
    expect(blocked).not.toContain('7,9');
  });

  it('treats owned territory and controlled nodes as live vision sources', () => {
    let world = createWorld([
      { id: 'settler', faction: 'victoria', kind: 'pawn', position: { x: 7, y: 10 } },
    ]);
    world = resolveSettlement(world);
    world = {
      ...world,
      territory: {
        ...world.territory,
        nodes: {
          ...world.territory.nodes,
          'minor-w': { ...world.territory.nodes['minor-w']!, owner: 'victoria' },
          crown: { ...world.territory.nodes.crown!, owner: 'victoria' },
        },
      },
    };

    const visible = computeFactionVisibleCells(world, 'victoria');
    expect(visible).toContain('7,10');
    expect(visible).toContain(tileId(world.territory.nodes['minor-w']!.center));
    expect(visible).toContain(tileId(world.territory.nodes.crown!.center));
  });

  it('gives Redoubts a larger beacon than Bastions and removes sight on destruction', () => {
    const bastion: FortificationState = {
      id: 'b', faction: 'victoria', kind: 'bastion', cell: { x: 7, y: 7 }, durability: 3,
    };
    const redoubt: FortificationState = {
      id: 'r', faction: 'victoria', kind: 'redoubt', cell: { x: 7, y: 7 }, durability: 3,
    };
    const world = createWorld();

    expect(ids(visibleCellsForFortification(world, bastion))).toContain('10,7');
    expect(ids(visibleCellsForFortification(world, bastion))).not.toContain('11,7');
    expect(ids(visibleCellsForFortification(world, redoubt))).toContain('11,7');

    let fortified = createWorld([
      { id: 'builder', faction: 'victoria', kind: 'pawn', position: { x: 7, y: 10 } },
    ]);
    fortified = resolveSettlement(fortified);
    fortified = buildFortification(fortified, {
      id: 'watch', faction: 'victoria', cell: { x: 7, y: 10 }, kind: 'redoubt',
    }).state;
    expect(computeFactionVisibleCells(fortified, 'victoria')).toContain('7,13');

    fortified = damageFortification(fortified, 'watch', 99);
    expect(getFortificationAt(fortified, { x: 7, y: 10 })).toBeNull();
    expect(computeFactionVisibleCells(fortified, 'victoria')).not.toContain('7,13');
  });
});
