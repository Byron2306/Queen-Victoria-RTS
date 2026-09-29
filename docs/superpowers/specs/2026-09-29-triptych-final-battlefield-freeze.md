# Royal War Triptych — Final Battlefield Freeze

**Date:** 2026-09-29  
**Status:** LOCKED — user-approved final structural battlefield geometry  
**Branch:** `agent/royal-war-triptych`

This appendix is authoritative for battlefield geometry and opening placement wherever earlier design text still describes the retired 16×16 board or older directional node ownership.

## 1. Canonical logical battlefield

The Royal War Triptych battlefield is a **24×24 logical coordinate space**.

Exactly **288 cells are playable**.

The playable cross is:

- central war theatre: every `x = 0..23` for `y = 8..15`,
- north/south strategic spine: `x = 9..14` for every `y = 0..23`,
- all remaining corner-quadrant cells are void/non-playable.

The battlefield grows around the established unit footprint. Moving from 16×16 to 24×24 must not make units or individual tiles appear smaller. Presentation expands the physical projected world by `24 / 16 = 1.5` and the free-roam camera exposes the additional space.

Victoria opens in the west. Obsidian opens in the east.

## 2. Capture nodes

There are exactly eight neutral opening objectives. There is no exact-centre node.

| ID | Kind | Cell |
| --- | --- | --- |
| `crown` | Crown | `(11,1)` |
| `crown-south` | Crown | `(12,22)` |
| `minor-nw` | Minor | `(9,7)` |
| `minor-ne` | Minor | `(14,7)` |
| `minor-w` | Minor | `(10,11)` |
| `minor-e` | Minor | `(13,12)` |
| `minor-sw` | Minor | `(9,16)` |
| `minor-se` | Minor | `(14,16)` |

Both Crown nodes begin neutral. They are equal strategic objectives, not faction-owned home nodes.

## 3. Opening armies

Each faction begins with six units. Bishops are not opening pieces and remain an early force-composition/recruitment decision.

### Victoria

| Unit | Cell |
| --- | --- |
| King | `(1,11)` |
| Victoria / Queen | `(5,11)` |
| Rook | `(3,9)` |
| Knight | `(3,13)` |
| Pawn | `(5,10)` |
| Pawn | `(5,12)` |

### Obsidian

| Unit | Cell |
| --- | --- |
| King | `(22,12)` |
| Queen | `(18,12)` |
| Rook | `(20,14)` |
| Knight | `(20,10)` |
| Pawn | `(18,13)` |
| Pawn | `(18,11)` |

No opening unit occupies a capture-node cell.

## 4. Prepared fortification belts

Prepared forts are real simulation objects present before Round 1. Each begins with durability `3` and uses all normal fortification blocking, damage, destruction, and vision rules.

### Victoria

- Bastion `(8,9)`
- Redoubt `(8,11)`
- Bastion `(8,13)`

### Obsidian

- Bastion `(15,14)`
- Redoubt `(15,12)`
- Bastion `(15,10)`

The staggered belts create prepared defensive lines without forming solid walls. The north/south spine remains a strategic flanking system.

## 5. Opening territory

Each faction begins with exactly **39 controlled cells**. The remaining **210 playable cells are neutral**.

### Victoria, 39 cells

- `y=9`, `x=0..8`
- `y=10`, `x=0..5`
- `y=11`, `x=0..8`
- `y=12`, `x=0..5`
- `y=13`, `x=0..8`

### Obsidian, exact 180-degree mirror

- `y=14`, `x=15..23`
- `y=13`, `x=18..23`
- `y=12`, `x=15..23`
- `y=11`, `x=18..23`
- `y=10`, `x=15..23`

Every opening unit and prepared fortification begins on friendly controlled territory.

The entire six-column central killing ground `x=9..14`, `y=8..15` begins neutral.

## 6. Reinforcement anchors

- Victoria: `(2,12)`
- Obsidian: `(21,11)`

Both are playable, empty at opening, and faction-controlled.

## 7. Presentation invariant

The physical projection must preserve the established apparent unit/tile footprint. The additional logical cells create a larger navigable world, not smaller chess pieces.

Camera movement never changes simulation coordinates, intelligence authority, occupancy, or legal movement state.

## 8. Design consequence

The opening creates:

- broad neutral territory rather than immediate contact,
- a six-column no-man's-land between prepared fortification belts,
- long north/south flanking routes,
- neutral Crown objectives requiring deliberate expansion,
- enough frontier depth for reconnaissance, stale intelligence, deceptive banners, fortification doctrine, reinforcement lattices, and Knight raiding to develop before sovereign contact.

This geometry supersedes retired 16×16 coordinates and any earlier wording that assigns the Crown sanctuaries to a faction at game start.
