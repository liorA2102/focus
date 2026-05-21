import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPost } from "@/lib/linkedin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { text, imageFilename } = await req.json();

  const position = await db.query.positions.findFirst({
    where: eq(positions.id, Number(id)),
  });
  if (!position) return NextResponse.json({ error: "Position not found" }, { status: 404 });

  const result = await createPost(text, imageFilename ?? undefined);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  await db
    .update(positions)
    .set({
      postedLinkedin:  true,
      linkedinPostUrl: result.postUrl ?? null,
      linkedinPostedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(positions.id, Number(id)));

  return NextResponse.json({ success: true, postUrl: result.postUrl });
}

// Mark as posted manually (no actual LinkedIn call)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { linkedinPostUrl } = await req.json();

  await db
    .update(positions)
    .set({
      postedLinkedin:  true,
      linkedinPostUrl: linkedinPostUrl ?? null,
      linkedinPostedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(positions.id, Number(id)));

  return NextResponse.json({ success: true });
}
