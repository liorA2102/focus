/**
 * JobMaster Recon Script
 * Logs in and dumps the job posting form structure so we can map fields.
 * Run with: ./node_modules/.bin/tsx scripts/jobmaster-recon.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";

const EMAIL = "jacob@focusgroup.co.il";
const PASSWORD = "Focus322025";
const POST_URL = "https://cv.jobmaster.co.il/code/misrot/misra-add.asp";

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log("→ Navigating to posting page...");
    await page.goto(POST_URL, { waitUntil: "domcontentloaded" });

    // Wait for login redirect
    await page.waitForURL(/account\.jobmaster\.co\.il/, { timeout: 10000 });
    console.log("→ On login page:", page.url());
    await page.screenshot({ path: "scripts/screenshot-login.png" });
    console.log("  (screenshot saved: scripts/screenshot-login.png)");

    // Wait for the form to appear
    await page.waitForTimeout(2000);

    // Dump all inputs on login page for debugging
    const loginInputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input")).map((el) => ({
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        className: el.className,
      }))
    );
    console.log("  Login page inputs:", JSON.stringify(loginInputs, null, 2));

    // Try to fill email — attempt multiple selectors
    const emailSelectors = [
      'input[placeholder="אימייל"]',
      'input[placeholder*="אימייל"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[name="Email"]',
      'input[name="username"]',
    ];
    let filled = false;
    for (const sel of emailSelectors) {
      if (await page.locator(sel).count() > 0) {
        await page.fill(sel, EMAIL);
        console.log(`→ Filled email with selector: ${sel}`);
        filled = true;
        break;
      }
    }
    if (!filled) console.warn("⚠ Could not find email input");

    await page.fill('input[type="password"]', PASSWORD);
    console.log("→ Filled password");

    await page.screenshot({ path: "scripts/screenshot-before-submit.png" });
    console.log("  (screenshot saved: scripts/screenshot-before-submit.png)");

    // Submit
    const submitSelectors = [
      'button:has-text("התחברות")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("התחבר")',
      'button:has-text("כניסה")',
    ];
    let submitted = false;
    for (const sel of submitSelectors) {
      if (await page.locator(sel).count() > 0) {
        await page.click(sel);
        console.log(`→ Clicked submit with selector: ${sel}`);
        submitted = true;
        break;
      }
    }
    if (!submitted) console.warn("⚠ Could not find submit button");

    // Wait for navigation
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    console.log("→ After login, URL:", page.url());
    await page.screenshot({ path: "scripts/screenshot-after-login.png" });
    console.log("  (screenshot saved: scripts/screenshot-after-login.png)");

    // Navigate to posting page if not already there
    if (!page.url().includes("misra-add")) {
      console.log("→ Navigating to posting page...");
      await page.goto(POST_URL, { waitUntil: "networkidle" });
      console.log("→ Now at:", page.url());
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: "scripts/screenshot-form.png" });
    console.log("  (screenshot saved: scripts/screenshot-form.png)");

    // Dump all form fields
    const fields = await page.evaluate(() => {
      const results: Array<{
        tag: string;
        type: string | null;
        name: string | null;
        id: string | null;
        placeholder: string | null;
        label: string | null;
        options: string[] | null;
      }> = [];

      document.querySelectorAll("input, select, textarea").forEach((el) => {
        const htmlEl = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

        let label: string | null = null;
        if (htmlEl.id) {
          const labelEl = document.querySelector(`label[for="${htmlEl.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() ?? null;
        }
        if (!label) {
          const parent = htmlEl.closest("td, div, li, p, tr");
          if (parent) {
            const labelEl = parent.querySelector("label") ?? parent.previousElementSibling;
            if (labelEl) label = labelEl.textContent?.trim().slice(0, 80) ?? null;
          }
        }

        let options: string[] | null = null;
        if (htmlEl.tagName === "SELECT") {
          options = Array.from((htmlEl as HTMLSelectElement).options).map(
            (o) => `${o.value}: ${o.text.trim()}`
          );
        }

        results.push({
          tag: htmlEl.tagName.toLowerCase(),
          type: (htmlEl as HTMLInputElement).type ?? null,
          name: htmlEl.name ?? null,
          id: htmlEl.id ?? null,
          placeholder: (htmlEl as HTMLInputElement).placeholder ?? null,
          label,
          options,
        });
      });

      return results;
    });

    const buttons = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('button, input[type="submit"], input[type="button"]')
      ).map((el) => {
        const htmlEl = el as HTMLButtonElement | HTMLInputElement;
        return {
          tag: htmlEl.tagName.toLowerCase(),
          type: (htmlEl as HTMLInputElement).type ?? "button",
          text: htmlEl.textContent?.trim() || (htmlEl as HTMLInputElement).value || "",
          name: htmlEl.name ?? null,
          id: htmlEl.id ?? null,
        };
      });
    });

    const output = { fields, buttons };
    fs.writeFileSync("scripts/jobmaster-fields.json", JSON.stringify(output, null, 2));
    console.log("\n✓ Field data saved to: scripts/jobmaster-fields.json");

    console.log("\n=== FORM FIELDS ===\n");
    fields.forEach((f, i) => {
      console.log(`[${i + 1}] <${f.tag}> type=${f.type} name="${f.name}" id="${f.id}"`);
      if (f.label) console.log(`     label: ${f.label}`);
      if (f.placeholder) console.log(`     placeholder: ${f.placeholder}`);
      if (f.options) {
        console.log(`     options (${f.options.length}):`);
        f.options.slice(0, 15).forEach((o) => console.log(`       - ${o}`));
        if (f.options.length > 15) console.log(`       ... and ${f.options.length - 15} more`);
      }
      console.log();
    });

    console.log("=== BUTTONS ===\n");
    buttons.forEach((b) =>
      console.log(`  <${b.tag}> type=${b.type} id="${b.id}" name="${b.name}" text="${b.text}"`)
    );

    console.log("\n→ Staying open 90s for manual inspection...");
    await page.waitForTimeout(90000);
  } catch (err) {
    console.error("✗ Error:", err);
    await page.screenshot({ path: "scripts/screenshot-error.png" });
    console.log("  (error screenshot saved: scripts/screenshot-error.png)");
    await page.waitForTimeout(30000);
  }

  await browser.close();
})();
