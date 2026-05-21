import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinImages } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await db.query.linkedinImages.findFirst({
    where: eq(linkedinImages.id, Number(id)),
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filepath = path.join(process.cwd(), "public", "linkedin-images", row.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  await db.delete(linkedinImages).where(eq(linkedinImages.id, Number(id)));
  return NextResponse.json({ success: true });
}
