import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions, candidateMatches, clientContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { CANDIDATE_EMAIL_SKILL } from "@/lib/skills/candidateEmail";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { matchId } = await req.json();

  const position = await db.query.positions.findFirst({
    where: eq(positions.id, Number(id)),
  });
  if (!position) return NextResponse.json({ error: "Position not found" }, { status: 404 });

  const match = await db.query.candidateMatches.findFirst({
    where: eq(candidateMatches.id, matchId),
    with: { candidate: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const c = match.candidate;

  const contacts = position.clientId
    ? await db.query.clientContacts.findMany({
        where: eq(clientContacts.clientId, position.clientId),
      })
    : [];

  const toContacts = contacts
    .filter((ct) => ct.email)
    .map((ct) => ({ name: ct.name, email: ct.email! }));

  const primaryContact = contacts[0] ?? null;

  const lines = [
    `Recipient: ${primaryContact?.name ?? "the client"}${primaryContact?.title ? ` (${primaryContact.title})` : ""}`,
    `Company: ${position.client}`,
    `Role: ${position.title}${position.location ? ` — ${position.location}` : ""}`,
    "",
    `Candidate: ${c.fullName}`,
    c.currentTitle        ? `Title: ${c.currentTitle}` : null,
    c.yearsExperience != null ? `Experience: ${c.yearsExperience} years` : null,
    c.location            ? `Location: ${c.location}` : null,
    "",
    `Why they fit this role:`,
    match.explanationHe ?? match.explanation ?? "No explanation available.",
  ].filter((l) => l !== null).join("\n");

  const msg = await ai.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: CANDIDATE_EMAIL_SKILL,
    messages: [{
      role: "user",
      content: lines,
    }],
  });

  const body = (msg.content[0] as { text: string }).text.trim();
  const subject = `מועמד לתפקיד ${position.title} - ${c.fullName}`;
  const cvFilename = c.cvPath ? path.basename(c.cvPath) : null;

  return NextResponse.json({ subject, body, toContacts, cvFilename });
}
