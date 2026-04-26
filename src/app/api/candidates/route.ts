import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, candidateMatches } from "@/db/schema";
import { desc, like, or, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const all = await db.query.candidates.findMany({
      orderBy: [desc(candidates.createdAt)],
      with: { matches: { with: { position: true } } },
    });

    // Free-text filter (name, title, skills, location)
    const filtered = q
      ? all.filter((c) => {
          const haystack = [
            c.fullName,
            c.currentTitle,
            c.skills,
            c.location,
            c.industries,
            c.summary,
          ]
            .join(" ")
            .toLowerCase();
          return q.toLowerCase().split(" ").every((word) => haystack.includes(word));
        })
      : all;

    return NextResponse.json(filtered);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
