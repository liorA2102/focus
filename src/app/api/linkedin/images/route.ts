import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  const images = await db.query.linkedinImages.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return NextResponse.json(images);
}
