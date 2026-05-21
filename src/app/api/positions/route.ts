import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions, candidateMatches, candidates } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { matchCandidateToPosition } from "@/lib/ai";
import { syncPositionToTurso } from "@/lib/turso";

export async function GET() {
  try {
    const all = await db.query.positions.findMany({
      orderBy: [desc(positions.createdAt)],
      with: { matches: true },
    });

    // Compute pipeline stats per position
    const withStats = all.map((p) => {
      const matches = p.matches ?? [];
      return {
        ...p,
        matches: undefined, // don't send full match list to the board
        stats: {
          total:         matches.length,
          open:          matches.filter((m) => m.candidateStatus === "open" && m.strength !== "weak").length,
          relevant:      matches.filter((m) => m.candidateStatus === "relevant").length,
          clientReview:  matches.filter((m) => m.candidateStatus === "client_review").length,
          interview:     matches.filter((m) => m.candidateStatus === "interview").length,
          hired:         matches.filter((m) => m.candidateStatus === "hired").length,
          rejected:      matches.filter((m) => m.candidateStatus === "rejected").length,
        },
      };
    });

    return NextResponse.json(withStats);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(positions)
      .values({
        title:        body.title,
        client:       body.client,
        clientId:     body.clientId     ?? null,
        location:     body.location     ?? null,
        salaryRange:  body.salaryRange  ?? null,
        description:  body.description  ?? null,
        requirements: body.requirements ?? null,
        status: "open",
      })
      .returning();
    // ── Match all existing candidates against this new position (background) ──
    const allCandidates = await db.query.candidates.findMany();
    Promise.allSettled(
      allCandidates.map(async (c) => {
        const result = await matchCandidateToPosition(
          {
            fullName:        c.fullName,
            currentTitle:    c.currentTitle,
            yearsExperience: c.yearsExperience,
            skills:          c.skills,
            summary:         c.summary,
          },
          created
        );
        return db.insert(candidateMatches).values({
          candidateId: c.id,
          positionId:  created.id,
          strength:      result.strength,
          explanation:   result.explanation,
          explanationHe: result.explanationHe,
        }).onConflictDoNothing();
      })
    ); // intentionally not awaited — runs in background

    // Sync new open position to Turso (background)
    syncPositionToTurso(created).catch(console.error);

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
