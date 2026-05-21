import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions, candidateMatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncPositionToTurso, removePositionFromTurso } from "@/lib/turso";

export async function GET(
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

    const matches = await db.query.candidateMatches.findMany({
      where: eq(candidateMatches.positionId, Number(id)),
      with: { candidate: true },
    });

    return NextResponse.json({ ...position, matches: matches.filter((m) => m.candidate != null) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch position" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const [updated] = await db
      .update(positions)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(positions.id, Number(id)))
      .returning();

    // Keep Turso in sync: upsert if open, remove otherwise
    if (updated.status === "open") {
      syncPositionToTurso(updated).catch(console.error);
    } else {
      removePositionFromTurso(updated.id).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(positions).where(eq(positions.id, Number(id)));
    removePositionFromTurso(Number(id)).catch(console.error);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
