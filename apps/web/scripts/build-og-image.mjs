/**
 * Renders `scripts/og-card.html` to `public/og-image.png` at exactly 1200×630 —
 * the site-wide Open Graph / X share card.
 *
 * Run after editing the card:  node scripts/build-og-image.mjs
 *
 * The output is committed, so this is not part of the build. A share card that
 * only exists after a successful render step is a card that eventually ships as
 * a 404, which is how `/og-image.jpg` and `/twitter-card.jpg` came to be
 * referenced in the root layout for months without existing at all.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = pathToFileURL(path.join(here, 'og-card.html')).href;
const OUT = path.join(here, '..', 'public', 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch({
  channel: 'chrome',
  // On Windows, Chrome renders text with DirectWrite ClearType subpixel
  // antialiasing, which bakes coloured fringes into the PNG — subtle on screen,
  // obvious once a scraper rescales the card. `-webkit-font-smoothing` does not
  // help; it is macOS-only.
  args: ['--disable-lcd-text', '--force-color-profile=srgb'],
});

try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.goto(SRC, { waitUntil: 'load', timeout: 30_000 });
  // The card is set in Outfit, fetched from Google Fonts. Screenshotting before
  // it lands silently ships the fallback stack.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log(`Wrote ${OUT} (${WIDTH}×${HEIGHT})`);
} finally {
  await browser.close();
}
