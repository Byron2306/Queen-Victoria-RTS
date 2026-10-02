import { describe, expect, test } from 'vitest';

const sourceFiles = import.meta.glob('../../src/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Readonly<Record<string, string>>;

const FORBIDDEN_V1_GEOMETRY_IMPORTS = [
  'isPlayableCell',
  'allPlayableCells',
  'createBoardTile',
  'BOARD_WIDTH',
  'BOARD_HEIGHT',
  'orthogonalNeighbors',
] as const;

const V1_GEOMETRY_ALLOWLIST = new Set([
  'src/sim/board-topology.ts',
  'src/sim/battlefield-topology-authority.ts',
]);

function repoPath(globPath: string): string {
  return globPath.replace(/^\.\.\/\.\.\//, '');
}

function importedBoardTopologyNames(source: string): readonly string[] {
  const imports = source.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]*board-topology['"];?/g,
  );
  const names = new Set<string>();

  for (const match of imports) {
    for (const item of match[1]!.split(',')) {
      const imported = item
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (imported) names.add(imported);
    }
  }

  return [...names].sort();
}

describe('topology authority architecture', () => {
  test('forbids live world-aware modules from importing V1 geometry authority', () => {
    const violations: string[] = [];

    for (const [globPath, source] of Object.entries(sourceFiles)) {
      const path = repoPath(globPath);
      if (V1_GEOMETRY_ALLOWLIST.has(path)) continue;

      const forbidden = importedBoardTopologyNames(source)
        .filter((name) => FORBIDDEN_V1_GEOMETRY_IMPORTS.includes(
          name as (typeof FORBIDDEN_V1_GEOMETRY_IMPORTS)[number],
        ));

      if (forbidden.length > 0) {
        violations.push(`${path}: ${forbidden.join(', ')}`);
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
