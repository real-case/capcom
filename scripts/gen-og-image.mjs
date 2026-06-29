// Generate the static Open Graph card → public/og.png (ADR 0031).
//
// A one-off, DEV-ONLY generator: it rasterizes an on-brand 1200×630 card with the
// already-installed Playwright chromium and commits the PNG, which is the runtime artifact
// (a static asset, NOT a dynamic next/og route — that would be its own ADR per 0031). The
// colors mirror the dark mission-control theme (the oklch values from globals.css); this is
// a build asset, so it is outside the component token gate (ADR 0058) by design.
//
// Run:  node scripts/gen-og-image.mjs   (needs `npx playwright install chromium` if absent)

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "..", "public", "og.png");

const WIDTH = 1200;
const HEIGHT = 630;

// Dark mission-control palette (mirrors globals.css :root .dark + the data-viz scale).
const BG = "oklch(0.141 0.005 285.823)";
const FG = "oklch(0.985 0 0)";
const MUTED = "oklch(0.705 0.015 286.067)";
const ACCENT = "oklch(0.7 0.14 238)";
const VIZ = [
  "oklch(0.7 0.14 238)",
  "oklch(0.76 0.15 62)",
  "oklch(0.78 0.14 158)",
  "oklch(0.86 0.15 100)",
  "oklch(0.64 0.16 286)",
  "oklch(0.66 0.19 28)",
  "oklch(0.7 0.15 330)",
  "oklch(0.82 0.1 200)",
  "oklch(0.74 0.13 128)",
];

// A deterministic little bar-chart motif (the "dense data-viz" the demo is known for).
const HEIGHTS = [38, 64, 52, 88, 120, 96, 140, 110, 72];
const bars = HEIGHTS.map(
  (h, i) =>
    `<span style="display:block;width:34px;height:${h}px;border-radius:6px 6px 0 0;background:${VIZ[i % VIZ.length]}"></span>`,
).join("");

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
      body {
        background: ${BG};
        color: ${FG};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 80px;
      }
      .bars { display: flex; align-items: flex-end; gap: 14px; height: 140px; }
      .eyebrow {
        color: ${MUTED}; font-size: 24px; font-weight: 600;
        letter-spacing: 4px; text-transform: uppercase;
      }
      .wordmark {
        font-size: 132px; font-weight: 800; letter-spacing: -2px; line-height: 1;
        margin-top: 12px;
      }
      .accent { width: 96px; height: 8px; border-radius: 999px; background: ${ACCENT}; margin-top: 28px; }
      .tagline { color: ${FG}; font-size: 34px; font-weight: 500; line-height: 1.3; margin-top: 28px; max-width: 980px; }
      .meta { color: ${MUTED}; font-size: 22px; margin-top: 16px; }
    </style>
  </head>
  <body>
    <div class="bars">${bars}</div>
    <div>
      <div class="eyebrow">Product analytics, built in the open</div>
      <div class="wordmark">CAPCOM</div>
      <div class="accent"></div>
      <div class="tagline">Multitenant product analytics — events, funnels, retention cohorts, and segmentation.</div>
    </div>
    <div class="meta">Real Postgres RLS · in-database SQL aggregation · built on claude-code-nextjs-starter</div>
  </body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: OUT, type: "png" });
  console.log(`[gen-og-image] wrote ${OUT} (${WIDTH}×${HEIGHT})`);
} finally {
  await browser.close();
}
