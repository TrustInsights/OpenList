// Layout guard: enforces the orientation folder layout and file size limits

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  exportedDeclarations,
  exportedFunctions,
  guardedSourceFiles,
  guardedTestFiles,
  hasExplicitReturnType,
  listFiles,
} from '@tests/helpers/source-scan';
import { describe, expect, it } from 'vitest';

const MAX_LINES = 250;
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|ico|webp|psd|pxm|woff2?)$/i;
const CONFIG_FILES = ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'];

const ALLOWED_ROOT_ENTRIES = new Set([
  '.claude',
  '.git',
  '.gitignore',
  '.graphifyignore',
  '.npmrc',
  '.size-limit.json',
  '.superpowers',
  '.DS_Store',
  'AGENTS.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'LICENSE',
  'README.md',
  'archived',
  'biome.json',
  'claude-graphify-semantic.sh',
  'data',
  'dist',
  'docs',
  'graphify-out',
  'input',
  'knip.json',
  'logs',
  'node_modules',
  'output',
  'package.json',
  'playwright.config.ts',
  'pnpm-lock.yaml',
  'references',
  'src',
  'temp',
  'tests',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
]);

/**
 * List the source and test files that the TSDoc, return type, and promise guards cover.
 * @returns Relative paths of every guarded file under src and tests.
 */
function sourceAndTestFiles(): string[] {
  return [...guardedSourceFiles(), ...guardedTestFiles()];
}

/**
 * Read the lines of the root .gitignore file.
 * @returns Trimmed lines of the file.
 */
function gitignoreLines(): string[] {
  return readFileSync(join(ROOT, '.gitignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim());
}

describe('project layout', () => {
  it('root holds only allowed entries', () => {
    const extra = readdirSync(ROOT).filter((name) => !ALLOWED_ROOT_ENTRIES.has(name));
    expect(extra).toEqual([]);
  });

  it('no test file lives under src', () => {
    const misplaced = listFiles(join(ROOT, 'src')).filter((path) => /\.test\.tsx?$/.test(path));
    expect(misplaced).toEqual([]);
  });

  it('gitignore keeps project folders tracked', () => {
    const lines = gitignoreLines();
    for (const folder of ['docs/', 'tests/', 'output/', '.claude/']) {
      expect(lines).not.toContain(folder);
    }
  });

  it('gitignore blocks secrets and junk', () => {
    const lines = gitignoreLines();
    for (const entry of ['.env', 'credentials.json', '.DS_Store', '*.zip']) {
      expect(lines).toContain(entry);
    }
  });

  it('no file over 250 lines in src and tests', () => {
    const files = [...listFiles(join(ROOT, 'src')), ...listFiles(join(ROOT, 'tests'))].filter(
      (path) => !BINARY_EXTENSIONS.test(path)
    );
    const tooLong = files.filter(
      (path) => readFileSync(join(ROOT, path), 'utf8').trimEnd().split('\n').length > MAX_LINES
    );
    expect(tooLong).toEqual([]);
  });

  it('every guarded source and test file starts with a purpose comment', () => {
    const files = [...sourceAndTestFiles(), ...CONFIG_FILES];
    const uncommented = files.filter((path) => {
      const text = readFileSync(join(ROOT, path), 'utf8');
      return !(text.startsWith('//') || text.startsWith('/*'));
    });
    expect(uncommented).toEqual([]);
  });

  it('every exported function in source and test files has TSDoc', () => {
    const missing: string[] = [];
    for (const path of sourceAndTestFiles()) {
      const text = readFileSync(join(ROOT, path), 'utf8');
      for (const { before, name, signature } of exportedFunctions(text)) {
        const doc = before.trimEnd().endsWith('*/') ? before.slice(before.lastIndexOf('/**')) : '';
        const returnsNothing = /:\s*(?:Promise<void>|void)\s*$/.test(signature.trim());
        if (!doc.startsWith('/**') || (!returnsNothing && !doc.includes('@returns'))) {
          missing.push(`${path}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('every exported type, interface, and const in source and test files has TSDoc', () => {
    const missing: string[] = [];
    for (const path of sourceAndTestFiles()) {
      const text = readFileSync(join(ROOT, path), 'utf8');
      for (const { before, name } of exportedDeclarations(text)) {
        const documented = before.trimEnd().endsWith('*/');
        if (!documented) missing.push(`${path}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every exported function in source and test files has an explicit return type', () => {
    const untyped: string[] = [];
    for (const path of sourceAndTestFiles()) {
      const text = readFileSync(join(ROOT, path), 'utf8');
      for (const { name, signature } of exportedFunctions(text)) {
        if (!hasExplicitReturnType(signature)) untyped.push(`${path}: ${name}`);
      }
    }
    expect(untyped).toEqual([]);
  });

  it('the return type guard reads destructured, object, default, and arrow forms', () => {
    const text = [
      'export function Bare({ a }: Props) {',
      '  return null;',
      '}',
      'export function Typed({ a }: Props): React.JSX.Element {',
      '  return null;',
      '}',
      'export function Shape(): { x: number; run: () => Promise<void> } {',
      '  return null;',
      '}',
      'export async function Plain(x: number) {',
      '  return x;',
      '}',
      'export default function Fallback(x: number) {',
      '  return x;',
      '}',
      'export default async function (x: number): Promise<number> {',
      '  return x;',
      '}',
      'export const ArrowBare = (x: number) => x;',
      'export const ArrowTyped = async <T,>(x: T): Promise<() => void> => () => {};',
      'export const ArrowGeneric = (x: number): Array<number> => [x];',
      'export const NotAFunction = (1 + 2);',
    ].join('\n');
    const verdicts = exportedFunctions(text).map(({ name, signature }) => [
      name,
      hasExplicitReturnType(signature),
    ]);
    expect(verdicts).toEqual([
      ['Bare', false],
      ['Typed', true],
      ['Shape', true],
      ['Plain', false],
      ['Fallback', false],
      ['default', true],
      ['ArrowBare', false],
      ['ArrowTyped', true],
      ['ArrowGeneric', true],
    ]);
  });

  it('manifest version equals package version', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
    const manifest = JSON.parse(readFileSync(join(ROOT, 'src/manifest.json'), 'utf8')) as {
      version: string;
    };
    expect(manifest.version).toBe(pkg.version);
  });

  it('no promise then chains in source and test files', () => {
    const needle = '.then' + '(';
    const chained = sourceAndTestFiles().filter((path) =>
      readFileSync(join(ROOT, path), 'utf8').includes(needle)
    );
    expect(chained).toEqual([]);
  });
});
