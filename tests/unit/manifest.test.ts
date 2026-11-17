// Unit tests for src/manifest.json: the permissions, the shortcut, and the toolbar title

import manifest from '@/manifest.json';
import { describe, expect, it } from 'vitest';

describe('manifest', () => {
  it('needs Chrome 110 or later, for the offscreen API and the action context', () => {
    expect(Number.parseInt(manifest.minimum_chrome_version, 10)).toBeGreaterThanOrEqual(110);
  });

  it('asks for exactly the four required permissions', () => {
    expect([...manifest.permissions].sort()).toEqual([
      'contextMenus',
      'offscreen',
      'storage',
      'tabs',
    ]);
  });

  it('keeps both clipboard permissions optional and asks for none at install', () => {
    expect(manifest.optional_permissions).toEqual(['clipboardRead', 'clipboardWrite']);
    expect(manifest.permissions).not.toContain('clipboardRead');
    expect(manifest.permissions).not.toContain('clipboardWrite');
  });

  it('declares one copy-window command with the suggested shortcut and no action override', () => {
    expect(Object.keys(manifest.commands)).toEqual(['copy-window']);
    expect(manifest.commands['copy-window']).toEqual({
      suggested_key: { default: 'Alt+Shift+C' },
      description: "Copy this window's tabs",
    });
    expect(manifest.commands).not.toHaveProperty('_execute_action');
  });

  it('names the toolbar action for a screen reader', () => {
    expect(manifest.action.default_title).toBe('OpenList: open or copy a list of URLs');
  });

  it('does not list the offscreen page, because Chrome needs no manifest entry for it', () => {
    expect(JSON.stringify(manifest)).not.toContain('offscreen/index');
  });
});
