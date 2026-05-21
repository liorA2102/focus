import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commentTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { title, body: templateBody, imageFilename } = body;

    const [updated] = await db
      .update(commentTemplates)
      .set({
        ...(title !== undefined && { title }),
        ...(templateBody !== undefined && { body: templateBody }),
        ...(imageFilename !== undefined && { imageFilename }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(commentTemplates.id, Number(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
    return NextResponse.json(updated, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500, headers: CORS });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(commentTemplates).where(eq(commentTemplates.id, Number(id)));
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500, headers: CORS });
  }
}
