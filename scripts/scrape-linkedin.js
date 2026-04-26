#!/usr/bin/env node
/**
 * Standalone Playwright scraper — runs as a child process so it never
 * enters the Next.js/Turbopack module graph.
 * Usage: node scripts/scrape-linkedin.js <linkedinUrl>
 * Output: JSON to stdout
 */

const { chromium } = require("playwright");

const url = process.argv[2];
if (!url) { console.error("No URL provided"); process.exit(1); }

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 300 });
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (page.url().includes("authwall") || page.url().includes("login")) {
      throw new Error("LinkedIn requires login to view this page.");
    }

    await page.waitForSelector("h1", { timeout: 10000 }).catch(() => null);

    const result = await page.evaluate(() => {
      const getText = (sel) =>
        document.querySelector(sel)?.textContent?.trim() ?? null;

      const name    = getText("h1") ?? getText(".org-top-card-summary__title");
      const tagline = getText(".org-top-card-summary__tagline") ?? getText(".top-card-layout__headline");
      const industry = getText(".org-top-card-summary-info-list__info-item") ?? getText(".top-card-layout__first-subline");

      const websiteAnchor = document.querySelector(
        'a[data-control-name="visit_company_website"], .org-about-us-company-module__website a'
      );
      const website = websiteAnchor?.href ?? null;

      const logoImg = document.querySelector(
        ".org-top-card-primary-content__logo, .top-card-layout__entity-image"
      );
      const logoUrl = logoImg?.src ?? null;

      return { name, tagline, industry, website, logoUrl };
    });

    process.stdout.write(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((err) => {
  process.stderr.write(err.message);
  process.exit(1);
});
