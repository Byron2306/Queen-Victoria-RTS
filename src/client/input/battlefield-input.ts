import type {
  Coord,
  WorldState,
} from '../../sim/types';
import { coordKey } from '../../sim/world';
import { ClientCommandBridge } from '../runtime/command-bridge';

export class BattlefieldInput {
  public selectedUnitId: string | null = null;

  constructor(
    private readonly commands: ClientCommandBridge,
  ) {}

  pointerDown(
    world: WorldState,
    issuedTick: number,
    cell: Coord,
  ): void {
    if (this.selectedUnitId) {
      const selected = world.units[this.selectedUnitId];

      if (!selected) {
        this.selectedUnitId = null;
        return;
      }
    }

    const occupantId = world.occupancy[coordKey(cell)];
    const occupant = occupantId
      ? world.units[occupantId]
      : undefined;

    if (occupant?.faction === 'victoria') {
      this.selectedUnitId = occupant.id;
      return;
    }

    if (!this.selectedUnitId) {
      return;
    }

    const selected = world.units[this.selectedUnitId];

    if (!selected) {
      this.selectedUnitId = null;
      return;
    }

    if (occupant && occupant.faction !== selected.faction) {
      this.commands.attack(
        issuedTick,
        selected.id,
        occupant.id,
      );
      return;
    }

    if (!occupant) {
      this.commands.move(
        issuedTick,
        selected.id,
        cell,
      );
    }
  }
}
