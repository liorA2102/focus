import { NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncPositionToTurso, readPositionsFromTurso, purgeStalePositionsFromTurso } from "@/lib/turso";

export async function GET() {
  const rows = await readPositionsFromTurso();
  return NextResponse.json(rows);
}

// One-time backfill: syncs all open positions to Turso
export async function POST() {
  try {
    const openPositions = await db.query.positions.findMany({
      where: eq(positions.status, "open"),
    });

    const openIds = openPositions.map((p) => p.id);
    await purgeStalePositionsFromTurso(openIds);

    const results = await Promise.allSettled(
      openPositions.map((p) => syncPositionToTurso(p))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ synced: succeeded, failed, total: openPositions.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
