import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { polishPosition } from "@/lib/ai";
import { syncPositionToTurso } from "@/lib/turso";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const position = await db.query.positions.findFirst({
      where: eq(positions.id, Number(id)),
    });
    if (!position) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const polished = await polishPosition(position.description, position.requirements);

    // Store requirements with "• " prefix per line, matching the existing convention
    const formattedRequirements = polished.requirements
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("•") ? l : `• ${l}`))
      .join("\n");

    const [updated] = await db
      .update(positions)
      .set({
        description:  polished.description,
        requirements: formattedRequirements,
        updatedAt:    new Date().toISOString(),
      })
      .where(eq(positions.id, Number(id)))
      .returning();

    if (updated.status === "open") {
      syncPositionToTurso(updated).catch(console.error);
    }

    return NextResponse.json({
      description:  updated.description,
      requirements: updated.requirements,
    });
  } catch (err) {
    console.error("[polish]", err);
    return NextResponse.json({ error: "Failed to polish position" }, { status: 500 });
  }
}
