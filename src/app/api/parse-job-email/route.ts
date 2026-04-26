import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { emailText } = await req.json();
  if (!emailText?.trim()) {
    return NextResponse.json({ error: "No email text provided" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are helping a recruiter extract job position details from an email.

Extract the following fields from the email below. Return ONLY a valid JSON object with these keys:
- title: job title (string, or null if not found)
- client: company or client name (string, or null if not found)
- location: job location, city or remote (string, or null if not found)
- salaryRange: salary or compensation range as a string (string, or null if not found)
- description: a clean summary of the role and responsibilities (string, or null if not found)
- requirements: skills, experience, and qualifications required (string, or null if not found)

For description and requirements, write them in clean paragraph form — don't just copy-paste raw text, make it readable.
If a field cannot be determined, use null.
Return only the JSON object, no explanation.

Email:
---
${emailText}
---`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const json = JSON.parse(raw.trim());
    return NextResponse.json(json);
  } catch {
    // Try to extract JSON from the response if there's surrounding text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return NextResponse.json(JSON.parse(match[0]));
      } catch {}
    }
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
