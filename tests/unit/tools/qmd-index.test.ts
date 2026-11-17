// Tool guard: the index:qmd script points to a real shell tool in src/tools with a purpose comment

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/**
 * Read the index:qmd script of package.json and return the tool path it runs.
 * @returns Path of the shell tool, relative to the project root.
 */
function indexToolPath(): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const match = /^sh (\S+\.sh)$/.exec(pkg.scripts['index:qmd'] ?? '');
  if (!match?.[1]) {
    throw new Error('package.json index:qmd must be "sh <path>.sh"');
  }
  return match[1];
}

describe('qmd-index tool', () => {
  it('index:qmd points to an existing file in src/tools', () => {
    const path = indexToolPath();
    expect(path.startsWith('src/tools/')).toBe(true);
    expect(existsSync(join(ROOT, path))).toBe(true);
  });

  it('the file starts with a shebang and then a purpose comment', () => {
    const lines = readFileSync(join(ROOT, indexToolPath()), 'utf8').split('\n');
    expect(lines[0]).toBe('#!/bin/sh');
    expect(lines[1]).toMatch(/^# \S/);
  });

  it('the file has valid shell syntax', () => {
    expect(() => execFileSync('sh', ['-n', join(ROOT, indexToolPath())])).not.toThrow();
  });

  it('the script finds the project root two folders above itself', () => {
    const body = readFileSync(join(ROOT, indexToolPath()), 'utf8');
    expect(body).toContain('"$(dirname "$0")/../.."');
  });

  it('no live document names the old docs/ location', () => {
    for (const doc of ['CLAUDE.md', 'docs/project-decisions.md', 'package.json']) {
      expect(readFileSync(join(ROOT, doc), 'utf8')).not.toContain('docs/qmd-index.sh');
    }
  });
});
