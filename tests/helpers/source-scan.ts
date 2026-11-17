// Source scanning helpers for the project style guards: file walks and export finders

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The project root. The guards run from it, and every scanned path is relative to it. */
export const ROOT = process.cwd();

/**
 * List every file under a directory, as paths relative to the project root.
 * @param dir - Absolute directory path to walk.
 * @returns Relative file paths with forward slashes.
 */
export function listFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...listFiles(full));
    } else {
      found.push(relative(ROOT, full).split('\\').join('/'));
    }
  }
  return found;
}

/**
 * List the TypeScript files in src that the style guards cover. Every file under src is covered.
 * @returns Relative paths of guarded source files.
 */
export function guardedSourceFiles(): string[] {
  return listFiles(join(ROOT, 'src')).filter((path) => /\.tsx?$/.test(path));
}

/**
 * List the TypeScript files in tests that the style guards cover. Every file under tests is covered.
 * @returns Relative paths of guarded test files.
 */
export function guardedTestFiles(): string[] {
  return listFiles(join(ROOT, 'tests')).filter((path) => /\.tsx?$/.test(path));
}

/**
 * Tell whether the text after a parameter list starts with a return type annotation.
 * @param signature - The text between the closing parenthesis of the parameters and the body.
 * @returns True when a colon and a type follow the parameter list.
 */
export function hasExplicitReturnType(signature: string): boolean {
  return /^\s*:\s*\S/.test(signature);
}

/**
 * Read the return type text of a function whose parameter list closes at an index.
 * The scan balances braces, brackets, and parentheses, so object types and destructured
 * parameters do not end it early. The body starts at the first top-level brace after the type.
 * @param text - Source file text.
 * @param afterParams - Index just after the closing parenthesis of the parameter list.
 * @returns The text between the parameter list and the body brace.
 */
function returnTypeText(text: string, afterParams: number): string {
  let depth = 0;
  let hasColon = false;
  let sawType = false;
  for (let i = afterParams; i < text.length; i++) {
    const char = text.charAt(i);
    if (char === '{' && depth === 0 && (!hasColon || sawType)) return text.slice(afterParams, i);
    if (depth === 0 && char === ':') hasColon = true;
    else if (depth === 0 && /[^\s:{}[\]()]/.test(char)) sawType = true;
    if ('{[('.includes(char)) depth++;
    if ('}])'.includes(char)) depth--;
    if (depth === 0 && char === '}') sawType = true;
  }
  return text.slice(afterParams);
}

/**
 * Find the index just after the parenthesis that closes a parameter list.
 * @param text - Source file text.
 * @param open - Index of the opening parenthesis.
 * @returns The index after the matching closing parenthesis.
 */
function afterParamList(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text.charAt(i) === '(') depth++;
    if (text.charAt(i) === ')' && --depth === 0) return i + 1;
  }
  return text.length;
}

/**
 * Read the return type text of an arrow function whose parameter list closes at an index.
 * The scan ends at the arrow. Angle brackets and function types in the return type do not end it.
 * @param text - Source file text.
 * @param afterParams - Index just after the closing parenthesis of the parameter list.
 * @returns The text between the parameter list and the arrow, or null when no arrow follows.
 */
function arrowReturnTypeText(text: string, afterParams: number): string | null {
  let depth = 0;
  for (let i = afterParams; i < text.length; i++) {
    const char = text.charAt(i);
    if (char === '=' && text.charAt(i + 1) === '>') {
      if (depth === 0) return text.slice(afterParams, i);
      i++;
    } else if (depth === 0 && char === ';') {
      return null;
    } else if ('{[(<'.includes(char)) depth++;
    else if ('}])>'.includes(char)) depth--;
  }
  return null;
}

/**
 * Find every exported function in a source text. The finder reads function declarations,
 * default function exports, and const arrow functions.
 * @param text - Source file text.
 * @returns For each function, the text before it, its name, and its return type text.
 */
export function exportedFunctions(
  text: string
): { before: string; name: string; signature: string }[] {
  const found: { index: number; before: string; name: string; signature: string }[] = [];
  const declaration = /^export (?:async )?function (\w+)\s*(?:<[^(]*>)?\(/gm;
  const defaultForm = /^export default (?:async )?function\s*(\w*)\s*(?:<[^(]*>)?\(/gm;
  for (const [pattern, fallback] of [
    [declaration, ''],
    [defaultForm, 'default'],
  ] as const) {
    for (const match of text.matchAll(pattern)) {
      const open = match.index + match[0].length - 1;
      found.push({
        index: match.index,
        before: text.slice(0, match.index),
        name: match[1] || fallback,
        signature: returnTypeText(text, afterParamList(text, open)),
      });
    }
  }
  const arrowForm = /^export const (\w+)\s*=\s*(?:async\s+)?(?:<[^(]*>\s*)?\(/gm;
  for (const match of text.matchAll(arrowForm)) {
    const open = match.index + match[0].length - 1;
    const signature = arrowReturnTypeText(text, afterParamList(text, open));
    if (signature === null) continue;
    found.push({
      index: match.index,
      before: text.slice(0, match.index),
      name: match[1] ?? '',
      signature,
    });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map(({ before, name, signature }) => ({ before, name, signature }));
}

/**
 * Find every exported type, interface, or const declaration in a source text.
 * @param text - Source file text.
 * @returns For each declaration, the text before it and its name.
 */
export function exportedDeclarations(text: string): { before: string; name: string }[] {
  const found: { before: string; name: string }[] = [];
  for (const match of text.matchAll(/^export (?:type|interface|const) (\w+)/gm)) {
    found.push({ before: text.slice(0, match.index), name: match[1] ?? '' });
  }
  return found;
}
