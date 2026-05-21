import { chromium } from "playwright";

const POST_URL = "https://cv.jobmaster.co.il/code/misrot/misra-add.asp";
// After submitting, JobMaster redirects back to misra-add.asp with jobnum= in the query string
const SUCCESS_URL_PATTERN = /misra-add\.asp.*jobnum=/;

// How long Jacob has to complete & submit the form manually (5 minutes)
const MANUAL_TIMEOUT_MS = 5 * 60 * 1_000;

export interface PublishResult {
  success: boolean;
  jobUrl?: string;
  error?: string;
}

export async function publishToJobMaster(position: {
  title: string;
  description: string | null;
  requirements: string | null;
  salaryRange: string | null;
  location: string | null;
}): Promise<PublishResult> {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // ── 1. Login ──────────────────────────────────────────────────────────
    await page.goto(POST_URL, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/account\.jobmaster\.co\.il/, { timeout: 10_000 });

    await page.fill('input[type="email"]', process.env.JOBMASTER_EMAIL!);
    await page.fill('input[type="password"]', process.env.JOBMASTER_PASSWORD!);
    await page.click('input[type="submit"]');
    await page.waitForURL(/misra-add\.asp/, { timeout: 15_000 });
    await page.waitForTimeout(2_000);

    // ── 2. Job title ──────────────────────────────────────────────────────
    await page.fill("#jobTitle", position.title);
    await page.press("#jobTitle", "Tab");

    // ── 3. Categories ─────────────────────────────────────────────────────
    try {
      await page.waitForSelector("text=קטגוריות מומלצות", { timeout: 15_000 });
      await page.waitForTimeout(1_000);
      const result = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll("*"));
        const heading = all.find((el) => el.textContent?.trim() === "קטגוריות מומלצות");
        if (!heading) return "heading not found";
        const ul = heading.nextElementSibling;
        if (!ul) return "no ul sibling";
        const items = Array.from(ul.querySelectorAll("li[role='button']")) as HTMLElement[];
        if (items.length === 0) return "no li items found";
        items[0].click();
        if (items[1]) items[1].click();
        return `clicked ${Math.min(items.length, 2)} of ${items.length} items`;
      });
      console.log("[jobmaster] Categories:", result);
      await page.waitForTimeout(500);
    } catch (e) {
      console.warn("[jobmaster] Categories failed:", e);
    }

    // ── 4. Seniority ──────────────────────────────────────────────────────
    try {
      await page.selectOption("#seniorityLevelId", { value: "1" });
      console.log("[jobmaster] Seniority set");
    } catch (e) {
      console.warn("[jobmaster] Seniority failed:", e);
    }

    // ── 5. Description & requirements ─────────────────────────────────────
    if (position.description) await page.fill("#teur", position.description);
    if (position.requirements) await page.fill("#drishot", position.requirements);

    // ── 6. Hand off to Jacob ──────────────────────────────────────────────
    // Bot has pre-filled what it can. Jacob handles location + submit.
    // We watch for the success URL and update the DB when it lands there.
    console.log("[jobmaster] Pre-fill done — waiting for Jacob to complete and submit (up to 5 min)…");

    await page.waitForURL(SUCCESS_URL_PATTERN, { timeout: MANUAL_TIMEOUT_MS });

    const redirectUrl = page.url();
    const jobNum = new URL(redirectUrl).searchParams.get("jobnum");
    const jobUrl = jobNum
      ? `https://cv.jobmaster.co.il/code/misrot/misrot-list.asp?jobNum=${jobNum}`
      : redirectUrl;
    console.log("[jobmaster] Published! Job URL:", jobUrl);
    return { success: true, jobUrl };
  } catch (err) {
    if (SUCCESS_URL_PATTERN.test(page.url())) {
      const jobNum = new URL(page.url()).searchParams.get("jobnum");
      const jobUrl = jobNum
        ? `https://cv.jobmaster.co.il/code/misrot/misrot-list.asp?jobNum=${jobNum}`
        : page.url();
      return { success: true, jobUrl };
    }
    console.error("[jobmaster] Failed:", String(err));
    return { success: false, error: String(err) };
  } finally {
    await browser.close();
  }
}
