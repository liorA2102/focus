import { NextResponse } from "next/server";
import { getGmailConnectionStatus } from "@/lib/emailInbox";

export async function GET() {
  const status = await getGmailConnectionStatus();
  return NextResponse.json(status);
}
