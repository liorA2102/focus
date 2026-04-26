import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export type ScrapedCompany = {
  name:     string | null;
  tagline:  string | null;
  industry: string | null;
  website:  string | null;
  logoUrl:  string | null;
};

export async function scrapeLinkedInCompany(url: string): Promise<ScrapedCompany> {
  const scriptPath = path.join(process.cwd(), "scripts", "scrape-linkedin.js");
  const { stdout } = await execFileAsync("node", [scriptPath, url], { timeout: 60_000 });
  return JSON.parse(stdout) as ScrapedCompany;
}
