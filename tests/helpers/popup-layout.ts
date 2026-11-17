// Helpers for the layout checks: reach a popup state, list layout problems, and check the example text

import { type Page, expect } from '@playwright/test';

/** A state of the popup that the layout checks visit. */
export type PopupState = 'default' | 'details open' | 'error' | 'status message';

/** Every state that the layout checks visit. */
export const STATES: PopupState[] = ['default', 'details open', 'error', 'status message'];

/**
 * Brings the popup into one of the states that the layout checks visit.
 * @param page - The popup page.
 * @param state - The state to reach.
 * @returns A promise that resolves when the state shows.
 */
export async function reach(page: Page, state: PopupState): Promise<void> {
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
export async function layoutProblems(page: Page, ellipsisAllowed: boolean): Promise<string[]> {
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
export async function expectFullExampleText(page: Page): Promise<void> {
  const first = (await page.locator('#list').inputValue()).split('\n')[0];
  await expect(page.locator('#format-example')).toHaveText(`Example: ${first}`);
}
