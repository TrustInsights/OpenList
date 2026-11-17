// E2E accessibility tests: axe scans in light and dark, the tab order, and the focus ring

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type Scheme = 'light' | 'dark';

/**
 * Scans the page with the WCAG 2.1 A and AA rules of axe.
 * @param page - The popup page.
 * @returns The rule ids of the violations, with the failing selectors.
 */
async function violationsOf(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`
  );
}

/**
 * Names the focused element by its role in the popup, so the order is easy to read.
 * @param page - The popup page.
 * @returns The name of the focused control, its outline, and the accent color the outline must use.
 */
async function focusStop(page: Page): Promise<{
  name: string;
  outlineWidth: number;
  outlineStyle: string;
  outlineOffset: string;
  outlineColor: string;
  accent: string;
}> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    const names: Record<string, string> = {
      list: 'list',
      source: 'From',
      format: 'Copy as',
    };
    const name =
      names[element.id] ??
      (element.classList.contains('btn-open') ? 'Open' : null) ??
      (element.classList.contains('btn-copy') ? 'Copy' : null) ??
      (element.tagName === 'SUMMARY' ? 'Details summary' : null) ??
      (element.tagName === 'A' ? 'footer link' : null) ??
      (element.textContent ?? '').trim();
    // The token resolves to the same rgb() text as the outline color when a probe takes its color.
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      name,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      outlineOffset: style.outlineOffset,
      outlineColor: style.outlineColor,
      accent,
    };
  });
}

/**
 * Presses Tab from the list and records each focus stop until the focus leaves the page controls.
 * @param page - The popup page.
 * @param count - How many Tab presses to make after the list.
 * @returns The focus stops, the list first.
 */
async function tabThrough(
  page: Page,
  count: number
): Promise<Awaited<ReturnType<typeof focusStop>>[]> {
  await page.locator('#list').focus();
  const stops = [await focusStop(page)];
  for (let step = 0; step < count; step++) {
    await page.keyboard.press('Tab');
    stops.push(await focusStop(page));
  }
  return stops;
}

for (const scheme of ['light', 'dark'] as Scheme[]) {
  test.describe(`axe in ${scheme} mode`, () => {
    test.beforeEach(async ({ context, popup }, testInfo) => {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: scheme });
      await popup(page);
      testInfo.annotations.push({ type: 'scheme', description: scheme });
    });

    test('the default state has no violations', async ({ context }) => {
      const page = context.pages().at(-1) as Page;
      await expect(page.getByRole('button', { name: 'Turn on clipboard detection' })).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
    });

    test('the error state has no violations', async ({ context }) => {
      const page = context.pages().at(-1) as Page;
      await page.locator('#list').fill('');
      await page.getByRole('button', { name: /^Open / }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
    });

    test('the state with Details open has no violations', async ({ context }) => {
      const page = context.pages().at(-1) as Page;
      await page.getByText('Details', { exact: true }).click();
      await expect(page.getByText('Tabs opened')).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
    });

    test('the state with a status message has no violations', async ({ context }) => {
      const page = context.pages().at(-1) as Page;
      await page.getByRole('button', { name: /^Copy / }).click();
      await expect(page.getByRole('status')).not.toBeEmpty();
      expect(await violationsOf(page)).toEqual([]);
    });
  });
}

test.describe('keyboard', () => {
  test('Tab visits the list, From, Open, Copy, Copy as, Details, and the footer link in this order', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0);

    const stops = await tabThrough(page, 6);

    expect(stops.map((stop) => stop.name)).toEqual([
      'list',
      'From',
      'Open',
      'Copy',
      'Copy as',
      'Details summary',
      'footer link',
    ]);
  });

  test('the clipboard buttons sit between Copy as and Details while the prompt shows', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);

    const stops = await tabThrough(page, 8);

    expect(stops.map((stop) => stop.name)).toEqual([
      'list',
      'From',
      'Open',
      'Copy',
      'Copy as',
      'Turn on clipboard detection',
      'Not now',
      'Details summary',
      'footer link',
    ]);
  });

  const ACCENT: Record<Scheme, string> = {
    light: 'rgb(11, 87, 208)',
    dark: 'rgb(138, 180, 248)',
  };
  for (const scheme of ['light', 'dark'] as Scheme[]) {
    test(`every focused control shows a solid 2 px accent outline with a 2 px offset in ${scheme} mode`, async ({
      context,
      popup,
    }) => {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: scheme });
      await popup(page);
      await page.getByText('Details', { exact: true }).click();
      await expect(
        page.locator('details').getByRole('button', { name: 'Turn on clipboard detection' })
      ).toBeVisible();

      const stops = await tabThrough(page, 8);

      // With Details open the clipboard button sits in the Details row, after Refresh.
      expect(stops.map((stop) => stop.name)).toEqual([
        'list',
        'From',
        'Open',
        'Copy',
        'Copy as',
        'Details summary',
        'Refresh',
        'Turn on clipboard detection',
        'footer link',
      ]);
      for (const stop of stops) {
        expect(stop.outlineStyle, stop.name).toBe('solid');
        expect(stop.outlineWidth, stop.name).toBeGreaterThanOrEqual(2);
        expect(stop.outlineOffset, stop.name).toBe('2px');
        expect(stop.outlineColor, stop.name).toBe(stop.accent);
        expect(stop.accent, stop.name).toBe(ACCENT[scheme]);
      }
    });
  }
});
