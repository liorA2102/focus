import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidateMatches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { matchId, ...updates } = await req.json();
    const [updated] = await db
      .update(candidateMatches)
      .set(updates)
      .where(
        and(
          eq(candidateMatches.id, Number(matchId)),
          eq(candidateMatches.positionId, Number(id))
        )
      )
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}
