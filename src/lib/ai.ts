import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Extract text from a CV file buffer ── */
export async function extractCVText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = ((await import("pdf-parse")) as any).default ?? (await import("pdf-parse"));
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Fallback: treat as plain text
  return buffer.toString("utf-8");
}

/* ── Parse CV text → structured candidate data ── */
export async function parseCV(text: string) {
  const msg = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are parsing a CV/resume. Extract information and return ONLY valid JSON, no markdown.

Return this exact shape:
{
  "fullName": "string",
  "email": "string or null",
  "phone": "string or null",
  "currentTitle": "string or null",
  "yearsExperience": number or null,
  "skills": ["array of technical and soft skills"],
  "industries": ["array of industries the person has worked in"],
  "location": "city/country or null",
  "summary": "2-3 sentence professional summary highlighting strengths (in English)",
  "summaryHe": "same summary translated to Hebrew"
}

CV text:
${text.slice(0, 6000)}`,
    }],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  const json = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json);
}

/* ── Match a candidate against a position ── */
export async function matchCandidateToPosition(
  candidate: {
    fullName: string;
    currentTitle: string | null;
    yearsExperience: number | null;
    skills: string | null;
    summary: string | null;
  },
  position: {
    title: string;
    client: string;
    description: string | null;
    requirements: string | null;
  }
): Promise<{ strength: "strong" | "possible" | "weak"; explanation: string; explanationHe: string }> {
  const msg = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `You are a senior recruiter evaluating a candidate for a role. Return ONLY valid JSON, no markdown.

POSITION: ${position.title} at ${position.client}
${position.description ? `Description: ${position.description.slice(0, 500)}` : ""}
${position.requirements ? `Requirements: ${position.requirements.slice(0, 500)}` : ""}

CANDIDATE: ${candidate.fullName}
Title: ${candidate.currentTitle ?? "Unknown"}
Experience: ${candidate.yearsExperience ?? "Unknown"} years
Skills: ${candidate.skills ?? "Not specified"}
Summary: ${candidate.summary ?? "Not available"}

Rate the match:
- "strong": clearly meets most requirements, would shortlist immediately
- "possible": some relevant connection — similar field, related industry, or transferable skills — worth a look even if not a direct fit
- "weak": no meaningful connection to the role — different field, irrelevant background, very unlikely to be useful

Return: {"strength": "strong"|"possible"|"weak", "explanation": "one concise sentence in English", "explanationHe": "same sentence translated to Hebrew"}`,
    }],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  const json = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json);
}
