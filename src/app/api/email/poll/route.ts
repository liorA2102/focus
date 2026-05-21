import { NextResponse } from "next/server";
import { pollEmailInbox } from "@/lib/emailInbox";

const g = global as typeof globalThis & { __emailPollRunning?: boolean };

export async function POST() {
  if (g.__emailPollRunning) {
    return NextResponse.json({ error: "Poll already running" }, { status: 409 });
  }
  g.__emailPollRunning = true;
  try {
    const result = await pollEmailInbox();
    return NextResponse.json(result);
  } catch (err) {
    const e = err as Record<string, unknown>;
    const message = (typeof e?.responseText === "string" && e.responseText)
      ? e.responseText
      : err instanceof Error ? err.message : String(err);
    const status = e?.authenticationFailed ? 401 : 500;
    return NextResponse.json({ error: message, authFailed: !!e?.authenticationFailed }, { status });
  } finally {
    g.__emailPollRunning = false;
  }
}
