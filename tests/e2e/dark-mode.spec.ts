// E2E tests for the light and dark color tokens, checked as computed colors in real Chrome

import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/** The computed colors that the two themes must give, in the rgb form that Chrome returns. */
const THEMES = {
  light: {
    page: 'rgb(238, 238, 238)',
    surface: 'rgb(255, 255, 255)',
    text: 'rgb(51, 51, 51)',
    accent: 'rgb(11, 87, 208)',
    error: 'rgb(179, 38, 30)',
    errorBackground: 'rgb(252, 232, 230)',
    border: 'rgb(118, 118, 118)',
  },
  dark: {
    page: 'rgb(32, 33, 36)',
    surface: 'rgb(41, 42, 45)',
    text: 'rgb(232, 234, 237)',
    accent: 'rgb(138, 180, 248)',
    error: 'rgb(249, 180, 174)',
    errorBackground: 'rgb(64, 32, 34)',
    border: 'rgb(142, 145, 143)',
  },
} as const;

/**
 * Reads one computed style of the first element that matches a selector.
 * @param page - The popup page.
 * @param selector - The CSS selector.
 * @param property - The CSS property.
 * @returns The computed value.
 */
async function style(page: Page, selector: string, property: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test(`paints the page, the list, the Open button, and the error with the ${scheme} tokens`, async ({
      context,
      popup,
    }) => {
      const colors = THEMES[scheme];
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: scheme });
      await popup(page);

      expect(await style(page, 'body', 'background-color')).toBe(colors.page);
      expect(await style(page, 'body', 'color')).toBe(colors.text);
      expect(await style(page, '#list', 'background-color')).toBe(colors.surface);
      expect(await style(page, '#list', 'border-top-color')).toBe(colors.border);
      expect(await style(page, '.btn-open', 'background-color')).toBe(colors.accent);

      await page.locator('#list').fill('');
      await page.getByRole('button', { name: /^Open / }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await style(page, '[role=alert]', 'color')).toBe(colors.error);
      expect(await style(page, '[role=alert]', 'background-color')).toBe(colors.errorBackground);
    });
  });
}
