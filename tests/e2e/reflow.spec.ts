// E2E tests for reflow: zoom by viewport emulation and the text spacing override

import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/** A state of the popup that the layout checks visit. */
type PopupState = 'default' | 'details open' | 'error' | 'status message';

/** Every state that the layout checks visit. */
const STATES: PopupState[] = ['default', 'details open', 'error', 'status message'];

/**
 * Brings the popup into one of the states that the layout checks visit.
 * @param page - The popup page.
 * @param state - The state to reach.
 * @returns A promise that resolves when the state shows.
 */
async function reach(page: Page, state: PopupState): Promise<void> {
  if (state === 'details open') {
    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByText('Tabs opened')).toBeVisible();
  }
  if (state === 'error') {
    await page.locator('#list').fill('');
    await page.getByRole('button', { name: /^Open / }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  }
  if (state === 'status message') {
    await page.getByRole('button', { name: /^Copy / }).click();
    await expect(page.getByRole('status')).not.toBeEmpty();
  }
}

/**
 * Lists the problems with the layout of the popup: a sideways scroll, an element past the
 * viewport edge, and text that a fixed box clips.
 * @param page - The popup page.
 * @param ellipsisAllowed - True accepts the one line example, which the design cuts with an ellipsis.
 * @returns One line per problem. An empty list means the layout holds.
 */
async function layoutProblems(page: Page, ellipsisAllowed: boolean): Promise<string[]> {
  return page.evaluate((allowEllipsis) => {
    const problems: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      problems.push(`sideways scroll: ${root.scrollWidth} wide in ${root.clientWidth}`);
    }
    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const name = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''} "${(element.textContent ?? '').trim().slice(0, 24)}"`;
      if (box.left < -0.5 || box.right > root.clientWidth + 0.5) {
        problems.push(
          `outside the viewport: ${name} (${Math.round(box.left)} to ${Math.round(box.right)})`
        );
      }
      const hasText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''
      );
      const style = getComputedStyle(element);
      const clips = element.tagName === 'BUTTON' || style.overflow !== 'visible';
      const cutByDesign = allowEllipsis && style.textOverflow === 'ellipsis';
      if (
        hasText &&
        clips &&
        !cutByDesign &&
        element.tagName !== 'TEXTAREA' &&
        element.tagName !== 'SELECT'
      ) {
        if (element.scrollWidth > element.clientWidth + 1)
          problems.push(`text clipped sideways: ${name}`);
        if (element.scrollHeight > element.clientHeight + 1)
          problems.push(`text clipped down: ${name}`);
      }
    }
    return problems;
  }, ellipsisAllowed);
}

/**
 * Checks that the example line holds the whole first address in its text, so a screen reader
 * and a copy of the text lose nothing when the design cuts the line with an ellipsis.
 * @param page - The popup page.
 * @returns A promise that resolves when the check passes.
 */
async function expectFullExampleText(page: Page): Promise<void> {
  const first = (await page.locator('#list').inputValue()).split('\n')[0];
  await expect(page.locator('#format-example')).toHaveText(`Example: ${first}`);
}

/** A viewport that stands for a browser zoom level on a 1280 by 1024 CSS pixel window. */
const ZOOMS = [
  { zoom: '200%', width: 640, height: 512 },
  { zoom: '400%', width: 320, height: 256 },
] as const;

/** The text spacing override of WCAG 2.1 success criterion 1.4.12, applied to every element. */
const TEXT_SPACING = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

test.describe('Zoom by viewport emulation', () => {
  for (const { zoom, width, height } of ZOOMS) {
    for (const state of STATES) {
      test(`at ${zoom} (${width} px wide) the ${state} state has no sideways scroll and no clipped text`, async ({
        context,
        popup,
      }) => {
        const page = await context.newPage();
        await page.setViewportSize({ width, height });
        await popup(page);
        await reach(page, state);

        expect(await layoutProblems(page, width > 360)).toEqual([]);
        if (state !== 'error') await expectFullExampleText(page);
        const popupWidth = await page
          .locator('body')
          .evaluate((node) => node.getBoundingClientRect().width);
        expect(popupWidth).toBeLessThanOrEqual(width);
      });
    }
  }
});

test.describe('Text spacing override', () => {
  for (const width of [450, 320]) {
    for (const state of STATES) {
      test(`at ${width} px wide the ${state} state keeps every word visible`, async ({
        context,
        popup,
      }) => {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: 900 });
        await popup(page);
        await page.evaluate((css) => {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          document.adoptedStyleSheets = [sheet];
        }, TEXT_SPACING);
        await reach(page, state);

        const heading = await page.locator('h1').evaluate((node) => {
          const style = getComputedStyle(node);
          return { spacing: style.letterSpacing, words: style.wordSpacing };
        });
        expect(heading.spacing).not.toBe('normal');
        expect(heading.words).not.toBe('normal');
        expect(await layoutProblems(page, width > 360)).toEqual([]);
        if (state !== 'error') await expectFullExampleText(page);
      });
    }
  }
});
