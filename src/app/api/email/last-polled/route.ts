import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "email_last_polled"),
  });
  return NextResponse.json({ lastPolled: row?.value ?? null });
}
