import { describe, expect, it } from 'vitest';

const SOURCE_MODULES = import.meta.glob('../../src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function repoPath(path: string): string {
  return path.replace(/^\.\.\/\.\.\//, '');
}

function directFactionControlWriteLines(source: string): number[] {
  const lines = source.split(/\r?\n/);
  const pattern = /(?:\bfactionControl\s*:\s*(?:'neutral'|'victoria'|'obsidian'|faction\b)|\.factionControl\s*=(?!=))/;
  return lines.flatMap((line, index) => pattern.test(line) ? [index + 1] : []);
}

function canonicalPerTileSupplyLines(source: string): number[] {
  const lines = source.split(/\r?\n/);
  const pattern = /\bsupplied\s*\??\s*:/;
  return lines.flatMap((line, index) => pattern.test(line) ? [index + 1] : []);
}

function importsSupplyMutationAuthority(source: string): boolean {
  const importsSupply = /from\s+['"][^'"]*\/supply['"]/.test(source);
  const namesMutationAuthority =
    /\b(?:resolveSupplyAttrition|advanceSupplyExposure)\b/.test(source);
  return importsSupply && namesMutationAuthority;
}

describe('canonical supply authority architecture', () => {
  it('detects representative forbidden supply and ownership leaks', () => {
    expect(canonicalPerTileSupplyLines(
      "type Tile = { supplied: boolean; factionControl: 'neutral' };",
    )).toEqual([1]);
    expect(directFactionControlWriteLines(
      "const tile = { ...old, factionControl: faction };",
    )).toEqual([1]);
    expect(importsSupplyMutationAuthority(
      "import { resolveSupplyAttrition } from '../../sim/supply';",
    )).toBe(true);
  });

  it('keeps canonical territory types free of stored per-tile supplied flags', () => {
    const territorySources = Object.entries(SOURCE_MODULES)
      .filter(([path]) => [
        'src/sim/types.ts',
        'src/sim/territory.ts',
        'src/sim/triptych-territory.ts',
      ].includes(repoPath(path)));

    const violations = territorySources
      .map(([path, source]) => ({
        path: repoPath(path),
        lines: canonicalPerTileSupplyLines(source),
      }))
      .filter(entry => entry.lines.length > 0);

    expect(violations).toEqual([]);
  });

  it('prevents supply authority from mutating territorial factionControl directly', () => {
    const source = SOURCE_MODULES['../../src/sim/supply.ts']!;
    expect(directFactionControlWriteLines(source)).toEqual([]);
  });

  it('keeps fixed-tick runtime free of supply attrition authority', () => {
    const source = SOURCE_MODULES['../../src/client/runtime/fixed-tick-runtime.ts']!;
    expect(source).not.toContain('resolveSupplyAttrition');
    expect(source).not.toContain('advanceSupplyExposure');
  });

  it('keeps client input and render modules from importing supply mutation authority', () => {
    const violations = Object.entries(SOURCE_MODULES)
      .filter(([path]) => {
        const normalized = repoPath(path);
        return normalized.startsWith('src/client/input/') ||
          normalized.startsWith('src/client/render/');
      })
      .filter(([, source]) => importsSupplyMutationAuthority(source))
      .map(([path]) => repoPath(path));

    expect(violations).toEqual([]);
  });
});
