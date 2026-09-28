import type {
  Coord,
  Faction,
  UnitKind,
  UnitState,
  WorldState,
} from './types';

import {
  projectThreatCells,
} from './threats';

import {
  coordKey,
} from './world';

export type TacticalBonusKind =
  | 'knight_fork'
  | 'open_file'
  | 'royal_alignment'
  | 'sovereign_line';

export type TacticalBonus =
  Readonly<{
    kind:
      TacticalBonusKind;
    faction:
      Faction;
    sourceUnitIds:
      readonly string[];
    targetUnitIds:
      readonly string[];
  }>;

const TARGET_PRIORITY:
  Readonly<
    Record<UnitKind, number>
  > = {
    king: 6,
    queen: 5,
    rook: 4,
    bishop: 3,
    knight: 3,
    pawn: 1,
  };

const MAJOR_TARGETS =
  new Set<UnitKind>([
    'king',
    'queen',
    'rook',
    'bishop',
    'knight',
  ]);

const ORTHOGONAL_DIRECTIONS =
  [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ] as const;

function isLiving(
  world: WorldState,
  unit: UnitState,
): boolean {
  const combat =
    world.combat[unit.id];

  return !combat ||
    combat.health > 0;
}

function sameCell(
  a: Coord,
  b: Coord,
): boolean {
  return (
    a.x === b.x &&
    a.y === b.y
  );
}

function aligned(
  a: Coord,
  b: Coord,
): boolean {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  return (
    dx === 0 ||
    dy === 0 ||
    Math.abs(dx) ===
      Math.abs(dy)
  );
}

function sign(
  value: number,
): -1 | 0 | 1 {
  if (value === 0) {
    return 0;
  }

  return value > 0
    ? 1
    : -1;
}

function lineIsClear(
  world: WorldState,
  from: Coord,
  to: Coord,
): boolean {
  if (
    sameCell(from, to) ||
    !aligned(from, to)
  ) {
    return false;
  }

  const dx =
    sign(
      to.x - from.x,
    );

  const dy =
    sign(
      to.y - from.y,
    );

  let x =
    from.x + dx;

  let y =
    from.y + dy;

  while (
    x !== to.x ||
    y !== to.y
  ) {
    if (
      world.occupancy[
        coordKey({ x, y })
      ]
    ) {
      return false;
    }

    x += dx;
    y += dy;
  }

  return true;
}

function heroForFaction(
  world: WorldState,
  faction: Faction,
): UnitState | null {
  const heroId =
    world.heroes[faction]
      .heroUnitId;

  if (!heroId) {
    return null;
  }

  const hero =
    world.units[heroId];

  if (
    !hero ||
    hero.faction !== faction ||
    !isLiving(world, hero)
  ) {
    return null;
  }

  return hero;
}

export function detectKnightFork(
  world: WorldState,
  unitId: string,
): TacticalBonus | null {
  const knight =
    world.units[unitId];

  if (
    !knight ||
    knight.kind !== 'knight' ||
    !isLiving(world, knight)
  ) {
    return null;
  }

  const threatenedKeys =
    new Set(
      projectThreatCells(
        world,
        knight,
      ).map(coordKey),
    );

  const targets =
    Object.values(world.units)
      .filter(
        unit =>
          unit.faction !==
            knight.faction &&
          isLiving(
            world,
            unit,
          ) &&
          threatenedKeys.has(
            coordKey(
              unit.position,
            ),
          ),
      );

  if (
    targets.length < 2 ||
    !targets.some(
      target =>
        MAJOR_TARGETS.has(
          target.kind,
        ),
    )
  ) {
    return null;
  }

  const chosen =
    [...targets]
      .sort(
        (a, b) =>
          TARGET_PRIORITY[
            b.kind
          ] -
            TARGET_PRIORITY[
              a.kind
            ] ||
          a.id.localeCompare(
            b.id,
          ),
      )
      .slice(0, 2)
      .map(
        target =>
          target.id,
      )
      .sort();

  return {
    kind:
      'knight_fork',
    faction:
      knight.faction,
    sourceUnitIds: [
      knight.id,
    ],
    targetUnitIds:
      chosen,
  };
}

function rayToEdgeIsClear(
  world: WorldState,
  from: Coord,
  direction:
    Readonly<{
      x: number;
      y: number;
    }>,
): boolean {
  let x =
    from.x +
    direction.x;

  let y =
    from.y +
    direction.y;

  while (
    x >= 0 &&
    y >= 0 &&
    x < world.width &&
    y < world.height
  ) {
    if (
      world.occupancy[
        coordKey({ x, y })
      ]
    ) {
      return false;
    }

    x += direction.x;
    y += direction.y;
  }

  return true;
}

export function detectOpenFile(
  world: WorldState,
  unitId: string,
): TacticalBonus | null {
  const rook =
    world.units[unitId];

  if (
    !rook ||
    rook.kind !== 'rook' ||
    !isLiving(world, rook)
  ) {
    return null;
  }

  const hasOpenRay =
    ORTHOGONAL_DIRECTIONS
      .some(
        direction =>
          rayToEdgeIsClear(
            world,
            rook.position,
            direction,
          ),
      );

  if (!hasOpenRay) {
    return null;
  }

  return {
    kind:
      'open_file',
    faction:
      rook.faction,
    sourceUnitIds: [
      rook.id,
    ],
    targetUnitIds: [],
  };
}

export function detectRoyalAlignment(
  world: WorldState,
  faction: Faction,
): readonly TacticalBonus[] {
  const hero =
    heroForFaction(
      world,
      faction,
    );

  if (!hero) {
    return [];
  }

  return Object.values(
    world.units,
  )
    .filter(
      unit =>
        unit.id !==
          hero.id &&
        unit.faction ===
          faction &&
        unit.kind !==
          'pawn' &&
        unit.kind !==
          'king' &&
        isLiving(
          world,
          unit,
        ) &&
        lineIsClear(
          world,
          hero.position,
          unit.position,
        ),
    )
    .sort(
      (a, b) =>
        a.id.localeCompare(
          b.id,
        ),
    )
    .map(
      unit => ({
        kind: 'royal_alignment' as const,
        faction,
        sourceUnitIds: [
          unit.id,
          hero.id,
        ].sort(),
        targetUnitIds: [],
      }),
    );
}

export function detectSovereignLine(
  world: WorldState,
  faction: Faction,
): readonly TacticalBonus[] {
  const hero =
    heroForFaction(
      world,
      faction,
    );

  const sovereignId =
    world.match
      .sovereigns[
        faction
      ].kingId;

  if (
    !hero ||
    !sovereignId
  ) {
    return [];
  }

  const sovereign =
    world.units[
      sovereignId
    ];

  if (
    !sovereign ||
    sovereign.faction !==
      faction ||
    !isLiving(
      world,
      sovereign,
    ) ||
    !lineIsClear(
      world,
      hero.position,
      sovereign.position,
    )
  ) {
    return [];
  }

  return [
    {
      kind:
        'sovereign_line',
      faction,
      sourceUnitIds: [
        sovereign.id,
        hero.id,
      ].sort(),
      targetUnitIds: [],
    },
  ];
}
