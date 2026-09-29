import { describe, expect, it } from 'vitest';

import {
  TITLE_BACKGROUND_ASSET,
} from '../../src/client/phaser/title-scene';

describe('title scene art', () => {
  it('uses the generated title-screen composition', () => {
    expect(TITLE_BACKGROUND_ASSET).toBe(
      'assets/title/title-screen.png',
    );
  });
});
