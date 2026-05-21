import { NextRequest, NextResponse } from "next/server";
import { getEmailSettings, saveEmailSettings } from "@/lib/emailInbox";

export async function GET() {
  const settings = await getEmailSettings();
  // Never expose the password
  return NextResponse.json({ ...settings, pass: settings.pass ? "••••••••" : "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { host, port, user, pass, tls } = body;

  if (!host || !user) {
    return NextResponse.json({ error: "host and user are required" }, { status: 400 });
  }

  // If the client sent back the masked placeholder, keep existing password
  const current = await getEmailSettings();
  const resolvedPass = pass === "••••••••" ? current.pass : (pass ?? "");

  await saveEmailSettings({
    host:  String(host),
    port:  Number(port) || 993,
    user:  String(user),
    pass:  resolvedPass.replace(/\s+/g, ""),  // Google shows app passwords with spaces
    tls:   tls !== false,
  });

  return NextResponse.json({ ok: true });
}
