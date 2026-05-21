import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncPositionToTurso } from "./turso";
import { polishPosition } from "./ai";

const COMPANY_PAGE = "https://www.jobmaster.co.il/jobs/checkhevra.asp?cs=LIFSDCPSLUOEVHKQLLQMJTIQA";
const JOB_BASE     = "https://www.jobmaster.co.il/jobs/checknum.asp?key=";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── HTML helpers ── */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g,  "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function extractBetween(html: string, startPattern: RegExp, endTag: string): string {
  const m = startPattern.exec(html);
  if (!m) return "";
  const start = m.index + m[0].length;
  const end   = html.indexOf(endTag, start);
  if (end === -1) return "";
  return stripTags(decodeEntities(html.slice(start, end))).trim();
}

/* ── Scrape the company page → list of job keys + titles ── */
async function fetchJobList(): Promise<{ key: string; title: string; location: string }[]> {
  const res  = await fetch(COMPANY_PAGE, { headers: { "Accept-Language": "he-IL,he;q=0.9" } });
  const html = await res.text();

  const jobs: { key: string; title: string; location: string }[] = [];
  const articleRe = /<article[^>]+id="misra(\d+)"[^>]*>([\s\S]*?)<\/article>/gi;
  let m: RegExpExecArray | null;

  while ((m = articleRe.exec(html)) !== null) {
    const key     = m[1];
    const block   = m[2];

    // Title from CardHeader anchor
    const titleM  = /class="CardHeader[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/i.exec(block);
    const title   = titleM ? decodeEntities(stripTags(titleM[1])).replace(/\.\.$|…$/, "").trim() : "";

    // Location
    const locM    = /class="jobLocation"[^>]*><span>([\s\S]*?)<\/span>/i.exec(block);
    const location = locM ? decodeEntities(locM[1]).trim() : "";

    if (key && title) jobs.push({ key, title, location });
  }

  return jobs;
}

/* ── Scrape a single job detail page ── */
async function fetchJobDetail(key: string): Promise<{ description: string; requirements: string }> {
  const res  = await fetch(`${JOB_BASE}${key}`, { headers: { "Accept-Language": "he-IL,he;q=0.9" } });
  const html = await res.text();

  const description  = extractBetween(html, /id="jobDescriptionContent"[^>]*>/,  "</div>");
  const requirements = extractBetween(html, /id="jobRequirementsContent"[^>]*>/, "</div>");

  return { description, requirements };
}

/* ── Use Claude to extract clean title + client from raw job data ── */
async function parseJobMeta(rawTitle: string, description: string): Promise<{ title: string; client: string }> {
  const msg = await ai.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [{
      role: "user",
      content: `Extract the job title and the hiring company (the company Jacob is recruiting FOR, not "פוקוס כח אדם") from this Israeli job posting.

Raw title: ${rawTitle}
Description (first 300 chars): ${description.slice(0, 300)}

Return ONLY valid JSON: {"title": "...", "client": "..."}
If the client company is unclear, use "לא צוין" for client.
Keep the title in the same language as the input (Hebrew).`,
    }],
  });

  try {
    const raw = (msg.content[0] as { text: string }).text.trim()
      .replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(raw);
    return {
      title:  String(parsed.title  || rawTitle),
      client: String(parsed.client || "לא צוין"),
    };
  } catch {
    return { title: rawTitle, client: "לא צוין" };
  }
}

/* ── Public: sync all jobs ── */
export type SyncResult = {
  found:    number;
  imported: number;
  skipped:  number;
  errors:   string[];
};

export async function syncJobsFromJobMaster(): Promise<SyncResult> {
  const result: SyncResult = { found: 0, imported: 0, skipped: 0, errors: [] };

  const jobList = await fetchJobList();
  result.found  = jobList.length;

  for (const job of jobList) {
    const jobUrl = `${JOB_BASE}${job.key}`;

    try {
      // Skip if already imported
      const existing = await db.query.positions.findFirst({
        where: eq(positions.jobMasterUrl, jobUrl),
        columns: { id: true },
      });
      if (existing) { result.skipped++; continue; }

      const { description, requirements } = await fetchJobDetail(job.key);
      const { title, client }             = await parseJobMeta(job.title, description);

      const [created] = await db.insert(positions).values({
        title,
        client,
        location:          job.location || null,
        description:       description  || null,
        requirements:      requirements || null,
        status:            "open",
        postedJobMaster:   true,
        jobMasterUrl:      jobUrl,
        jobMasterPostedAt: new Date().toISOString(),
      }).returning();

      // Auto-polish the raw scraped text before syncing to the website
      const polished = await polishPosition(created.description, created.requirements);
      const formattedRequirements = polished.requirements
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (l.startsWith("•") ? l : `• ${l}`))
        .join("\n");

      const [final] = await db.update(positions)
        .set({ description: polished.description, requirements: formattedRequirements })
        .where(eq(positions.id, created.id))
        .returning();

      syncPositionToTurso(final).catch(() => {});
      result.imported++;
    } catch (err) {
      result.errors.push(`Job ${job.key}: ${String(err)}`);
    }
  }

  return result;
}
