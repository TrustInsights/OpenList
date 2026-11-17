// Helpers for the store image test: PNG checks, popup pictures, and the image layout

import { execFileSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

/** One output image: the file name and its size. */
export interface Shot {
  file: string;
  width: number;
  height: number;
}

/**
 * Reads the size and color type from a PNG header.
 * @param file - The PNG path.
 * @returns The width, the height, and the PNG color type (2 is RGB, 6 is RGB with alpha).
 */
export async function pngInfo(
  file: string
): Promise<{ width: number; height: number; colorType: number }> {
  const bytes = await readFile(file);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25] ?? -1,
  };
}

/**
 * Writes a PNG without an alpha channel, as the Web Store requires.
 * @param bytes - PNG bytes from a screenshot.
 * @param file - The target path.
 * @returns A promise that resolves when the file is written.
 */
async function writeOpaquePng(bytes: Buffer, file: string): Promise<void> {
  const temp = file.replace(/\.png$/, '.raw.png');
  await writeFile(temp, bytes);
  execFileSync('magick', [temp, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', file]);
  await rm(temp);
}

/**
 * Builds the HTML of a store image: a headline on the left and the popup picture on the right.
 * @param popup - The popup picture as a data address.
 * @param logo - The logo as a data address.
 * @param headline - The headline text.
 * @param sub - The line under the headline.
 * @param big - True for the 1280x800 size, false for the 440x280 tile.
 * @returns The HTML text.
 */
function composeHtml(
  popup: string,
  logo: string,
  headline: string,
  sub: string,
  big: boolean
): string {
  const left = big ? 80 : 24;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0}
body{width:${big ? 1280 : 440}px;height:${big ? 800 : 280}px;overflow:hidden;position:relative;
  background:linear-gradient(135deg,#f4f7f8,#d0d9de);color:#414042;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.text{position:absolute;left:${left}px;top:0;bottom:0;width:${big ? 520 : 200}px;display:flex;flex-direction:column;justify-content:center}
.bar{width:${big ? 72 : 36}px;height:${big ? 8 : 5}px;background:#f05662;border-radius:4px;margin-bottom:${big ? 28 : 12}px}
h1{margin:0;font-size:${big ? 56 : 25}px;line-height:1.1;font-weight:750;letter-spacing:-0.02em}
p{margin:${big ? 24 : 10}px 0 0;font-size:${big ? 26 : 13}px;line-height:1.35}
.logo{position:absolute;left:${left}px;bottom:${big ? 56 : 18}px;height:${big ? 46 : 22}px}
.shot{position:absolute;top:50%;transform:translateY(-50%);overflow:hidden;background:#eee;border-radius:${big ? 18 : 10}px;
  box-shadow:0 ${big ? 28 : 12}px ${big ? 70 : 30}px rgba(65,64,66,.38);
  ${big ? 'right:80px;width:600px' : 'right:-10px;width:236px'}}
.shot img{display:block;width:100%}
</style></head><body>
<div class="text"><div class="bar"></div><h1>${headline}</h1><p>${sub}</p></div>
<img class="logo" src="${logo}" alt="">
<div class="shot"><img src="${popup}" alt=""></div>
</body></html>`;
}

/**
 * Photographs the popup page.
 * @param page - The popup page.
 * @param scheme - The color scheme to emulate.
 * @returns The picture as a data address.
 */
export async function popupPicture(page: Page, scheme: 'light' | 'dark'): Promise<string> {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    const box = document.querySelector<HTMLTextAreaElement>('#list');
    if (box) box.scrollTop = 0;
  });
  await page.setViewportSize({ width: 450, height: 900 });
  const bytes = await page.locator('body').screenshot({ scale: 'css' });
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

/**
 * Renders a store image from the popup picture.
 * @param context - The browser context.
 * @param popup - The popup picture as a data address.
 * @param logo - The logo as a data address.
 * @param headline - The headline text.
 * @param sub - The sub line.
 * @param shot - The output file and size.
 * @param outDir - The folder for the image.
 * @returns A promise that resolves when the file is written.
 */
export async function renderImage(
  context: BrowserContext,
  popup: string,
  logo: string,
  headline: string,
  sub: string,
  shot: Shot,
  outDir: string
): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize({ width: shot.width, height: shot.height });
  await page.setContent(composeHtml(popup, logo, headline, sub, shot.width > 600));
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  const bytes = await page.screenshot({
    scale: 'css',
    clip: { x: 0, y: 0, width: shot.width, height: shot.height },
  });
  await writeOpaquePng(bytes, path.join(outDir, shot.file));
  await page.close();
}
