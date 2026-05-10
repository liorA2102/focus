import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, candidateMatches, positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractCVText, parseCV, matchCandidateToPosition } from "@/lib/ai";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

// Magic byte signatures — verified against actual file content, not the filename
const MAGIC: { bytes: number[]; offset?: number }[] = [
  { bytes: [0x25, 0x50, 0x44, 0x46] },             // PDF  (%PDF)
  { bytes: [0x50, 0x4B, 0x03, 0x04] },             // DOCX (ZIP/PK)
  { bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1] }, // DOC  (OLE2)
];

function hasValidMagicBytes(buf: Buffer): boolean {
  return MAGIC.some(({ bytes, offset = 0 }) =>
    bytes.every((b, i) => buf[offset + i] === b)
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    const applicantName = (formData.get("name") as string | null)?.trim() || null;
    const applicantEmail = (formData.get("email") as string | null)?.trim() || null;
    const applicantPhone = (formData.get("phone") as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: "No CV file provided" }, { status: 400, headers: CORS });
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Only PDF and Word documents are accepted" }, { status: 400, headers: CORS });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400, headers: CORS });
    }

    // ── Save file to disk ──
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!hasValidMagicBytes(buffer)) {
      return NextResponse.json({ error: "File content does not match a supported document type" }, { status: 400, headers: CORS });
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "cvs");
    await mkdir(uploadsDir, { recursive: true });
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadsDir, safeName);
    await writeFile(filePath, buffer);

    // ── Extract text ──
    const text = await extractCVText(buffer, file.name);
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract text from CV" }, { status: 422, headers: CORS });
    }

    // ── Parse with Claude ──
    const parsed = await parseCV(text);

    // ── Save candidate — prefer form-provided name/email/phone over parsed ──
    const [candidate] = await db
      .insert(candidates)
      .values({
        fullName:        applicantName        ?? parsed.fullName        ?? file.name.replace(/\.[^.]+$/, ""),
        email:           applicantEmail       ?? parsed.email           ?? null,
        phone:           applicantPhone       ?? parsed.phone           ?? null,
        currentTitle:    parsed.currentTitle  ?? null,
        yearsExperience: parsed.yearsExperience ?? null,
        skills:          JSON.stringify(parsed.skills    ?? []),
        industries:      JSON.stringify(parsed.industries ?? []),
        location:        parsed.location      ?? null,
        summary:         parsed.summary       ?? null,
        summaryHe:       parsed.summaryHe     ?? null,
        cvPath:          filePath,
        source:          "website",
      })
      .returning();

    // ── Match against all open positions (background — don't block the response) ──
    const openPositions = await db.query.positions.findMany({
      where: eq(positions.status, "open"),
    });

    Promise.allSettled(
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
        return db
          .insert(candidateMatches)
          .values({
            candidateId:   candidate.id,
            positionId:    pos.id,
            strength:      result.strength,
            explanation:   result.explanation,
            explanationHe: result.explanationHe,
          })
          .onConflictDoNothing();
      })
    ); // intentionally not awaited

    return NextResponse.json({ success: true }, { status: 201, headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process application" }, { status: 500, headers: CORS });
  }
}
