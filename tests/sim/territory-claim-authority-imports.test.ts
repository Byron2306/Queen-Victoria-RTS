import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC_ROOT = resolve(process.cwd(), 'src');
const ALLOWED_OWNERSHIP_WRITERS = new Set([
  'src/sim/territory.ts',
  'src/sim/triptych-territory.ts',
]);

function tsFilesUnder(root: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...tsFilesUnder(path));
    else if (stat.isFile() && path.endsWith('.ts')) files.push(path);
  }
  return files;
}

function directFactionControlWriteLines(source: string): number[] {
  const lines = source.split(/\r?\n/);
  const writePattern = /(?:\bfactionControl\s*:\s*(?:'neutral'|'victoria'|'obsidian'|faction\b)|\.factionControl\s*=)/;
  return lines.flatMap((line, index) => writePattern.test(line) ? [index + 1] : []);
}

function repoPath(path: string): string {
  return relative(process.cwd(), path).replaceAll('\\', '/');
}

describe('canonical territorial ownership architecture', () => {
  it('detects representative direct factionControl writes', () => {
    const syntheticLeak = [
      "tile.factionControl = 'victoria';",
      "const next = { ...tile, factionControl: faction };",
    ].join('\n');

    expect(directFactionControlWriteLines(syntheticLeak)).toEqual([1, 2]);
  });

  it('allows direct territorial ownership writes only inside the canonical claim authority and opening-state initializer', () => {
    const violations = tsFilesUnder(SRC_ROOT)
      .map(path => ({
        path: repoPath(path),
        lines: directFactionControlWriteLines(readFileSync(path, 'utf8')),
      }))
      .filter(entry => entry.lines.length > 0)
      .filter(entry => !ALLOWED_OWNERSHIP_WRITERS.has(entry.path));

    expect(violations).toEqual([]);
  });
});
