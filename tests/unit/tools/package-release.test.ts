// Tests for src/tools/package-release.sh using a small fake dist folder under temp/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'src/tools/package-release.sh');
const BASE = join(ROOT, 'temp/package-release-test');
const DIST = join(BASE, 'dist');
const OUT = join(BASE, 'out');
const PKG = join(BASE, 'package.json');
const LICENSE_FILE = join(BASE, 'LICENSE');

/** Writes a fake manifest into the fake dist folder. @param version - Version text. */
function writeManifest(version: string): void {
  writeFileSync(
    join(DIST, 'manifest.json'),
    JSON.stringify({ manifest_version: 3, version, background: { service_worker: 'sw.js' } })
  );
}

/** Runs the packaging script against the fake folders. @returns The script output. */
function run(): string {
  return execFileSync('sh', [SCRIPT], {
    env: { ...process.env, DIST_DIR: DIST, OUT_DIR: OUT, PACKAGE_JSON: PKG, LICENSE_FILE },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Lists the file names inside a zip. @param zip - Zip path. @returns File names. */
function listZip(zip: string): string[] {
  return execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
}

describe('package-release.sh', () => {
  beforeEach(() => {
    rmSync(BASE, { recursive: true, force: true });
    mkdirSync(DIST, { recursive: true });
    writeManifest('1.2.3');
    writeFileSync(join(DIST, 'sw.js'), 'export {};');
    writeFileSync(PKG, JSON.stringify({ version: '1.2.3' }));
    writeFileSync(LICENSE_FILE, 'MIT');
  });

  it('creates openlist-<version>.zip with the manifest at the root', () => {
    const out = run();
    expect(out).toContain('version: 1.2.3');
    expect(out).toMatch(/sha256:\s+[0-9a-f]{64}/);
    expect(listZip(join(OUT, 'openlist-1.2.3.zip'))).toEqual(
      expect.arrayContaining(['manifest.json', 'sw.js'])
    );
  });

  it('adds the LICENSE file of the project to the zip', () => {
    run();
    expect(listZip(join(OUT, 'openlist-1.2.3.zip'))).toContain('LICENSE');
  });

  it('leaves out .DS_Store files and source maps', () => {
    writeFileSync(join(DIST, '.DS_Store'), 'x');
    writeFileSync(join(DIST, 'sw.js.map'), '{}');
    run();
    const names = listZip(join(OUT, 'openlist-1.2.3.zip'));
    expect(names.some((n) => n.endsWith('.DS_Store'))).toBe(false);
    expect(names.some((n) => n.endsWith('.map'))).toBe(false);
  });

  it('fails when the license file is missing', () => {
    rmSync(LICENSE_FILE);
    expect(() => run()).toThrow(/license file .* is missing/);
  });

  it('fails when the manifest is missing', () => {
    rmSync(join(DIST, 'manifest.json'));
    expect(() => run()).toThrow(/manifest.json not found/);
  });

  it('fails when the manifest version differs from package.json', () => {
    writeFileSync(PKG, JSON.stringify({ version: '9.9.9' }));
    expect(() => run()).toThrow(/differs from package.json/);
  });

  it('fails when the service worker file is missing', () => {
    rmSync(join(DIST, 'sw.js'));
    expect(() => run()).toThrow(/service worker file sw.js is missing/);
  });
});
