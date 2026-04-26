import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, Number(id)),
    });

    if (!candidate || !candidate.cvPath) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const buffer = await readFile(candidate.cvPath);
    const fileName = path.basename(candidate.cvPath).replace(/^\d+_/, "");
    const ext = path.extname(fileName).toLowerCase();

    const contentType =
      ext === ".pdf"  ? "application/pdf" :
      ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
      ext === ".doc"  ? "application/msword" :
      "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to download CV" }, { status: 500 });
  }
}
