// E2E tests for Windows forced colors, by emulation: a border on every control and a 2 px focus ring

import { expect, test } from '@tests/e2e/fixtures';

test.describe('Windows forced colors by emulation', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`in ${scheme} mode every control has a border and every focus stop has a 2 px ring`, async ({
      context,
      popup,
    }) => {
      const page = await context.newPage();
      await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
      await popup(page);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

      const borders = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('#list, select, button')).map(
          (element) => {
            const style = getComputedStyle(element);
            return {
              name: element.id || element.className || element.tagName,
              style: style.borderTopStyle,
              width: Number.parseFloat(style.borderTopWidth),
            };
          }
        )
      );
      expect(borders.length).toBeGreaterThanOrEqual(5);
      for (const border of borders) {
        expect(border.style, border.name).toBe('solid');
        expect(border.width, border.name).toBeGreaterThanOrEqual(1);
      }

      await page.locator('#list').focus();
      for (let stop = 0; stop < 8; stop++) {
        const ring = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement;
          const style = getComputedStyle(element);
          return {
            name: element.id || element.textContent?.trim() || element.tagName,
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
            color: style.outlineColor,
            ground: getComputedStyle(document.body).backgroundColor,
          };
        });
        expect(ring.style, ring.name).toBe('solid');
        expect(ring.width, ring.name).toBeGreaterThanOrEqual(2);
        expect(ring.color, ring.name).not.toBe(ring.ground);
        await page.keyboard.press('Tab');
      }
    });
  }
});
