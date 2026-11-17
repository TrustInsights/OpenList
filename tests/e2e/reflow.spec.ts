// E2E tests for reflow: zoom by viewport emulation and the text spacing override

import { expect, test } from '@tests/e2e/fixtures';
import { STATES, expectFullExampleText, layoutProblems, reach } from '@tests/helpers/popup-layout';

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
