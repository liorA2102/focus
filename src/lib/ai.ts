import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Extract text from a CV file buffer ── */
export async function extractCVText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    // Use Claude's native PDF reading — handles both text and scanned/image PDFs,
    // and avoids pdf-parse which can block the event loop indefinitely.
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
          },
          { type: "text", text: "Extract all text from this CV/resume document. Return the raw text only, no commentary." },
        ],
      }],
    });
    return (msg.content[0] as { text: string }).text;
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
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
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
  "summaryHe": "same summary translated to Hebrew",
  "employmentHistory": [
    {
      "company": "Company name",
      "title": "Job title",
      "startDate": "YYYY-MM or YYYY or null",
      "endDate": "YYYY-MM or YYYY or null (null if current role)",
      "description": "1 sentence describing responsibilities, or null"
    }
  ]
}

List employmentHistory in reverse chronological order (most recent first). Include all roles found.

CV text:
${text.slice(0, 6000)}`,
    }],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  const json = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json);
}

/* ── Polish imported position text ── */
export async function polishPosition(
  description: string | null,
  requirements: string | null
): Promise<{ description: string; requirements: string }> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are editing a job posting that was copy-pasted from a recruitment system. Fix the formatting and punctuation without changing the meaning. The text is in Hebrew — keep it in Hebrew.

Rules:
- Fix double dots (..) → single dot (.)
- Replace non-breaking spaces and stray whitespace with regular spaces
- Remove the job title if it appears redundantly at the start of the description
- Break the description into 2-4 short readable paragraphs. Each paragraph should be a coherent topic.
- If the description contains an embedded numbered or bulleted list (like "1. ... · ..."), extract those items into the requirements section instead and keep the description as prose only.
- Format requirements as individual bullet lines — one requirement per line, no bullet prefix (the caller adds "• ").
- Split concatenated requirements that are all in one long paragraph into separate lines.
- Fix spacing around slashes where needed (e.g. "מהנדס/ת" is fine, but "חובה / יתרון" should stay natural).
- Remove duplicate information between description and requirements.
- Do not add, invent, or translate any content. Only reformat what exists.

Return ONLY valid JSON, no markdown:
{
  "description": "cleaned description with paragraph breaks using \\n\\n",
  "requirements": "one requirement per line, plain text, using \\n as separator"
}

--- DESCRIPTION ---
${description ?? ""}

--- REQUIREMENTS ---
${requirements ?? ""}`,
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
    model: "claude-haiku-4-5-20251001",
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
