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

function unit(kind: UnitState['kind'], position = { x: 11, y: 11 } as const): UnitState {
  return { id: kind, faction: 'victoria', kind, position };
}

describe('chess-geometric battlefield vision', () => {
  it('gives pawns a one-tile surrounding ring', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('pawn')));

    expect(seen).toContain('10,10');
    expect(seen).toContain('12,12');
    expect(seen).toContain('11,12');
    expect(seen).not.toContain('11,13');
  });

  it('gives knights isolated legal L-hop windows', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('knight')));

    expect(seen).toEqual(new Set([
      '9,10', '9,12', '10,9', '10,13',
      '12,9', '12,13', '13,10', '13,12',
    ]));
    expect(seen).not.toContain('11,12');
  });

  it('gives rook, bishop and queen their bounded ray geometries', () => {
    const world = createWorld();
    const rook = ids(visibleCellsForUnit(world, unit('rook')));
    const bishop = ids(visibleCellsForUnit(world, unit('bishop')));
    const queen = ids(visibleCellsForUnit(world, unit('queen')));

    expect(rook).toContain('11,14');
    expect(rook).not.toContain('11,15');
    expect(rook).not.toContain('14,14');

    expect(bishop).toContain('14,14');
    expect(bishop).not.toContain('15,15');
    expect(bishop).not.toContain('11,12');

    expect(queen).toContain('11,14');
    expect(queen).toContain('14,14');
    expect(queen).not.toContain('11,15');
  });

  it('gives kings two surrounding rings', () => {
    const world = createWorld();
    const seen = ids(visibleCellsForUnit(world, unit('king')));

    expect(seen).toContain('9,9');
    expect(seen).toContain('13,13');
    expect(seen).not.toContain('11,14');
  });

  it('lets ordinary units share sight but lets fortifications terminate rays', () => {
    const rook = unit('rook');
    let world = createWorld([rook]);
    world = placeUnit(world, {
      id: 'friendly-pawn', faction: 'victoria', kind: 'pawn', position: { x: 11, y: 12 },
    });

    expect(ids(visibleCellsForUnit(world, rook))).toContain('11,14');

    world = resolveSettlement(world);
    world = buildFortification(world, {
      id: 'blocking-bastion', faction: 'victoria', cell: { x: 11, y: 12 }, kind: 'bastion',
    }).state;

    const blocked = ids(visibleCellsForUnit(world, rook));
    expect(blocked).toContain('11,12');
    expect(blocked).not.toContain('11,13');
  });

  it('treats owned territory and controlled nodes as live vision sources', () => {
    let world = createWorld([
      { id: 'settler', faction: 'victoria', kind: 'pawn', position: { x: 11, y: 14 } },
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
    expect(visible).toContain('11,14');
    expect(visible).toContain(tileId(world.territory.nodes['minor-w']!.center));
    expect(visible).toContain(tileId(world.territory.nodes.crown!.center));
  });

  it('gives Redoubts a larger beacon than Bastions and removes sight on destruction', () => {
    const bastion: FortificationState = {
      id: 'b', faction: 'victoria', kind: 'bastion', cell: { x: 11, y: 11 }, durability: 3,
    };
    const redoubt: FortificationState = {
      id: 'r', faction: 'victoria', kind: 'redoubt', cell: { x: 11, y: 11 }, durability: 3,
    };
    const world = createWorld();

    expect(ids(visibleCellsForFortification(world, bastion))).toContain('14,11');
    expect(ids(visibleCellsForFortification(world, bastion))).not.toContain('15,11');
    expect(ids(visibleCellsForFortification(world, redoubt))).toContain('15,11');

    let fortified = createWorld([
      { id: 'builder', faction: 'victoria', kind: 'pawn', position: { x: 11, y: 14 } },
    ]);
    fortified = resolveSettlement(fortified);
    fortified = buildFortification(fortified, {
      id: 'watch', faction: 'victoria', cell: { x: 11, y: 14 }, kind: 'redoubt',
    }).state;
    expect(computeFactionVisibleCells(fortified, 'victoria')).toContain('11,18');

    fortified = damageFortification(fortified, 'watch', 99);
    expect(getFortificationAt(fortified, { x: 11, y: 14 })).toBeNull();
    expect(computeFactionVisibleCells(fortified, 'victoria')).not.toContain('11,18');
  });
});
