import { describe, expect, it } from 'vitest';
import {
  deployReinforcements,
  queueRecruitment,
  RECRUITMENT_COST,
} from '../../src/sim/production';
import { createWorld } from '../../src/sim/world';
import type { RecruitCommand, WorldState } from '../../src/sim/types';

const recruit = (
  unitKind: 'pawn' | 'knight' | 'bishop' | 'rook',
): RecruitCommand => ({
  type: 'recruit',
  sequence: 1,
  issuedTick: 0,
  faction: 'victoria',
  unitKind,
});

function withCrown(world: WorldState, amount: number): WorldState {
  return {
    ...world,
    economy: {
      crownPower: {
        ...world.economy.crownPower,
        victoria: amount,
      },
    },
  };
}

describe('Triptych production feedback', () => {
  it('returns a complete accepted receipt with price and remaining Crown', () => {
    const result = queueRecruitment(
      withCrown(createWorld(), 25),
      recruit('pawn'),
    );

    expect(result.receipt).toEqual({
      accepted: true,
      reason: null,
      unitKind: 'pawn',
      cost: RECRUITMENT_COST.pawn,
      remainingCurrency: 15,
      queued: true,
      placed: false,
      queueEntryId: 'victoria-recruit-1',
    });
  });

  it('returns machine-readable rejection receipts without mutating currency', () => {
    const locked = queueRecruitment(
      withCrown(createWorld(), 100),
      recruit('knight'),
    );
    expect(locked.receipt).toMatchObject({
      accepted: false,
      reason: 'locked',
      unitKind: 'knight',
      cost: RECRUITMENT_COST.knight,
      remainingCurrency: 100,
      queued: false,
      placed: false,
    });

    const poor = queueRecruitment(
      withCrown(createWorld(), 3),
      recruit('pawn'),
    );
    expect(poor.receipt).toMatchObject({
      accepted: false,
      reason: 'insufficient_crown',
      remainingCurrency: 3,
    });
  });

  it('matures a purchased head to READY regardless of legacy anchor validity', () => {
    const queued = queueRecruitment(
      withCrown(createWorld(), 20),
      recruit('pawn'),
    ).state;
    const invalidAnchor: WorldState = {
      ...queued,
      production: {
        ...queued.production,
        reinforcementAnchors: {
          ...queued.production.reinforcementAnchors,
          victoria: { x: 0, y: 0 },
        },
      },
    };

    const result = deployReinforcements(invalidAnchor);
    expect(result.receipts.victoria).toMatchObject({
      accepted: true,
      reason: null,
      queued: false,
      placed: false,
      queueEntryId: 'victoria-recruit-1',
    });
    expect(result.state.production.queues.victoria).toEqual([]);
    expect(result.state.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1']);
  });

  it('matures to READY even when the battlefield is fully occupied', () => {
    const queued = queueRecruitment(
      withCrown(createWorld(), 20),
      recruit('pawn'),
    ).state;
    const occupancy: Record<string, string> = {};
    for (let y = 0; y < 24; y += 1) {
      for (let x = 0; x < 24; x += 1) occupancy[`${x},${y}`] = 'blocked';
    }

    const result = deployReinforcements({ ...queued, occupancy });
    expect(result.receipts.victoria).toMatchObject({
      accepted: true,
      reason: null,
      queued: false,
      placed: false,
    });
    expect(result.state.production.ready.victoria).toHaveLength(1);
  });
});
