import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, candidateMatches, positions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractCVText, parseCV, matchCandidateToPosition } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Save file to disk ──
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "uploads", "cvs");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadsDir, safeName);
    await writeFile(filePath, buffer);

    // ── Extract text ──
    const text = await extractCVText(buffer, file.name);
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract text from CV" }, { status: 422 });
    }

    // ── Parse with Claude ──
    const parsed = await parseCV(text);

    // ── Deduplication check ──
    const parsedName = (parsed.fullName ?? "").trim();
    if (parsedName) {
      const existing = await db.query.candidates.findFirst({
        where: eq(candidates.fullName, parsedName),
      });
      if (existing) {
        return NextResponse.json(
          { error: "duplicate", message: `A candidate named "${existing.fullName}" already exists (ID ${existing.id}).` },
          { status: 409 }
        );
      }
    }

    // ── Save candidate ──
    const [candidate] = await db
      .insert(candidates)
      .values({
        fullName:        parsed.fullName        ?? file.name.replace(/\.[^.]+$/, ""),
        email:           parsed.email           ?? null,
        phone:           parsed.phone           ?? null,
        currentTitle:    parsed.currentTitle    ?? null,
        yearsExperience: parsed.yearsExperience ?? null,
        skills:             JSON.stringify(parsed.skills            ?? []),
        industries:         JSON.stringify(parsed.industries         ?? []),
        location:           parsed.location                         ?? null,
        summary:            parsed.summary                          ?? null,
        summaryHe:          parsed.summaryHe                        ?? null,
        employmentHistory:  JSON.stringify(parsed.employmentHistory  ?? []),
        cvPath:             filePath,
        source:          "manual",
      })
      .returning();

    // ── Match against all open/in-progress positions ──
    const openPositions = await db.query.positions.findMany({
      where: inArray(positions.status, ["open"]),
    });

    const matchResults = await Promise.allSettled(
      openPositions.map(async (pos) => {
        const result = await matchCandidateToPosition(
          {
            fullName:        candidate.fullName,
            currentTitle:    candidate.currentTitle,
            yearsExperience: candidate.yearsExperience,
            skills:          candidate.skills,
            summary:         candidate.summary,
          },
          pos
        );
        return db.insert(candidateMatches).values({
          candidateId: candidate.id,
          positionId:  pos.id,
          strength:       result.strength,
          explanation:    result.explanation,
          explanationHe:  result.explanationHe,
        }).onConflictDoNothing();
      })
    );

    const matched = matchResults.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ candidate, matchedPositions: matched }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process CV" }, { status: 500 });
  }
}
