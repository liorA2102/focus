import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

export async function GET() {
  let version = "unknown";
  let gitCommit = "—";
  let gitDate: string | null = null;

  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    version = pkg.version ?? "unknown";
  } catch {}

  try {
    const { stdout } = await execAsync("git log -1 --format=%h");
    gitCommit = stdout.trim();
  } catch {}

  try {
    const { stdout } = await execAsync("git log -1 --format=%ai");
    gitDate = stdout.trim() || null;
  } catch {}

  return NextResponse.json({ version, gitCommit, gitDate });
}
