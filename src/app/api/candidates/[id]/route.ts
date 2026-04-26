import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, Number(id)),
      with: {
        matches: {
          with: { position: true },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(candidate);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch candidate" }, { status: 500 });
  }
}
