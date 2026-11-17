// Guard: the files that users and store reviewers read hold no administrative notes

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '@tests/helpers/source-scan';
import { describe, expect, it } from 'vitest';

/** Terms that belong in CHANGELOG.md or docs/, never in a file that a user or a store reviewer reads. */
const ADMIN_TERMS =
  /\b(?:reviewed|after review|review kept|audit|validator|vitest|vitest-axe|playwright|axe-core|biome|knip|zod|claude|hindsight|graphify|qmd|subagent|agent|workflow|todo|tbd|not checked|test suite|unit test|e2e)\b|\.test\.|(?:tests|src|temp|output|data)\//i;

/**
 * Cut one section out of a Markdown file, from its heading to the next level-two heading.
 * @param text - The file text.
 * @param heading - The exact heading line, for example "## Usage".
 * @returns The section text, or an empty string when the heading is missing.
 */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n${heading}\n`);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length + 2);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Find the administrative terms in a text.
 * @param text - The text to scan.
 * @returns Each matching term with its line.
 */
function adminTermsIn(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => ADMIN_TERMS.test(line))
    .map((line) => line.trim());
}

describe('deliverables', () => {
  it('the scan finds a planted administrative note', () => {
    expect(adminTermsIn('Reviewed by an agent with Playwright.\nA plain line.')).toEqual([
      'Reviewed by an agent with Playwright.',
    ]);
    expect(adminTermsIn('See tests/unit/a.test.ts')).toHaveLength(1);
  });

  it('README Features, Usage, and Privacy hold no administrative notes', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    for (const heading of ['## Features', '## Usage', '## Privacy']) {
      const body = section(readme, heading);
      expect(body.length, heading).toBeGreaterThan(100);
      expect(adminTermsIn(body), heading).toEqual([]);
    }
  });

  it('the README makes no compliance claim', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    expect(readme).not.toMatch(/compliant|compliance|WCAG 2\.1 AA/i);
  });

  it('the store notes hold no administrative notes', () => {
    const notes = readFileSync(join(ROOT, 'docs/store-notes.md'), 'utf8');
    expect(notes.length).toBeGreaterThan(500);
    expect(adminTermsIn(notes)).toEqual([]);
  });

  it('the store notes justify every permission of the manifest', () => {
    const notes = readFileSync(join(ROOT, 'docs/store-notes.md'), 'utf8');
    const manifest = JSON.parse(readFileSync(join(ROOT, 'src/manifest.json'), 'utf8')) as {
      permissions: string[];
      optional_permissions: string[];
    };
    for (const permission of manifest.permissions) {
      expect(notes, permission).toMatch(new RegExp(`\\| \`${permission}\` \\| Required \\|`));
    }
    for (const permission of manifest.optional_permissions) {
      expect(notes, permission).toMatch(new RegExp(`\\| \`${permission}\` \\| Optional \\|`));
    }
  });

  it('the accessibility record states the standard, the date, the build, and that OpenList is not yet called compliant', () => {
    const record = readFileSync(join(ROOT, 'docs/accessibility.md'), 'utf8');
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
    expect(record).toContain('WCAG 2.1 level AA');
    expect(record).toContain('2026-11-16');
    expect(record).toContain(`OpenList ${pkg.version}`);
    expect(record).toContain('is not called compliant with WCAG 2.1 AA');
    expect(record).toContain('NOT DONE (needs the owner)');
    expect(record).toContain('UNVERIFIED (needs the owner)');
  });
});
