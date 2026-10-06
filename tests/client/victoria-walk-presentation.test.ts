import { describe, expect, it } from 'vitest';

import {
  VICTORIA_WALK_FRAME_MS,
  VICTORIA_WALK_FRAME_PATHS,
  victoriaWalkFrameKey,
} from '../../src/client/render/victoria-walk';

describe('Victoria V1 walk presentation', () => {
  it('locks the stabilized eight-frame asset family', () => {
    expect(VICTORIA_WALK_FRAME_MS).toBe(110);

    expect(VICTORIA_WALK_FRAME_PATHS).toEqual([
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-01.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-02.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-03.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-04.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-05.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-06.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-07.png',
      '/Queen-Victoria-RTS/assets/units/victoria-walk/victoria-walk-08.png',
    ]);
  });

  it('derives animation frames only from deterministic presentation time', () => {
    expect(victoriaWalkFrameKey(0)).toBe('victoria-walk-01');
    expect(victoriaWalkFrameKey(109)).toBe('victoria-walk-01');
    expect(victoriaWalkFrameKey(110)).toBe('victoria-walk-02');
    expect(victoriaWalkFrameKey(769)).toBe('victoria-walk-07');
    expect(victoriaWalkFrameKey(770)).toBe('victoria-walk-08');
    expect(victoriaWalkFrameKey(879)).toBe('victoria-walk-08');
    expect(victoriaWalkFrameKey(880)).toBe('victoria-walk-01');
  });

  it('normalizes invalid presentation time to the first frame', () => {
    expect(victoriaWalkFrameKey(-1)).toBe('victoria-walk-01');
    expect(victoriaWalkFrameKey(Number.NaN)).toBe('victoria-walk-01');
    expect(victoriaWalkFrameKey(Number.POSITIVE_INFINITY)).toBe('victoria-walk-01');
  });
});
