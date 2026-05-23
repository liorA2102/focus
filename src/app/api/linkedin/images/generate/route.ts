import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Approximate cost per image — update when actual gpt-image-2 pricing is known
const APPROX_COST_USD = 0.04;

async function expandPrompt(
  userPrompt: string,
  colorMode: string,
  textLanguage: string,
  imageType: string,
): Promise<string> {
  const isHebrew = textLanguage === "he";
  const isMono = colorMode === "mono";
  const textLangInstruction = isHebrew ? "any text in the image must be in Hebrew" : "any text in the image must be in English";
  const colorInstruction = isMono ? "black and white monochrome, deep contrast" : "rich color palette with deep navy or dark charcoal backgrounds and warm accent tones";

  let systemInstructions: string;

  if (imageType === "poster") {
    systemInstructions = `You are an expert at writing image generation prompts for premium LinkedIn post graphics for Focus Group, an Israeli executive recruitment company with 33 years of experience.

A recruiter described an idea in a few words: "${userPrompt}"

Write a detailed image generation prompt (3-5 sentences) for a POSTER — not a photo. Strict rules:
- ONE headline only, maximum 4–5 words, large and bold, placed prominently. No sub-headings, no body text, no bullets, no stats, no captions.
- Text must be large enough to be readable at a glance on a phone screen — no small text.
- Huge amounts of negative space — the image should feel open, breathable, and uncluttered.
- A single dramatic visual concept or abstract 3D element (not multiple icons or graphic elements). Think cinematic, editorial, museum-quality.
- Dark, premium background (deep navy, rich charcoal, midnight blue, or similar). No white or light backgrounds.
- The composition must leave the bottom-left corner area completely dark and unobstructed — the company logo will be placed there.
- Modern, conceptual thinking — no clichés like handshakes, pie charts, or generic stock-photo scenes.
- ${textLangInstruction}. Style: ${colorInstruction}.
- Do NOT include any logos, watermarks, or small decorative text in the image.

Return only the prompt text, nothing else.`;
  } else {
    systemInstructions = `You are an expert at writing image generation prompts for professional LinkedIn post photos for Focus Group, an Israeli executive recruitment company with 33 years of experience.

A recruiter described what they want in a few words: "${userPrompt}"

Write a detailed image generation prompt (3-5 sentences) for a high-quality, photo-realistic or lightly stylized LinkedIn post image — cinematic lighting, sharp focus, premium feel. No text in the image unless it's environmental (e.g. a sign in the background). Think editorial photography: professional setting, warm confident tones, aspirational but grounded. ${textLangInstruction}. Style: ${colorInstruction}. Do not include any logos or watermarks. The overall feel should be premium and suitable for a senior executive audience.

Return only the prompt text, nothing else.`;
  }

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: systemInstructions }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

export async function POST(request: Request) {
  const { prompt, colorMode, textLanguage, imageType = "image" } = await request.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    console.log("[generate-image] expanding prompt…");
    const expandedPrompt = await expandPrompt(prompt.trim(), colorMode, textLanguage, imageType);
    console.log("[generate-image] expanded:", expandedPrompt.slice(0, 80));

    console.log("[generate-image] calling gpt-image-2…");
    const response = await openai.images.generate({
      model: "gpt-image-2" as string,
      prompt: expandedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
    } as Parameters<typeof openai.images.generate>[0]);
    console.log("[generate-image] got response");

    const imgData = response.data[0] as { b64_json?: string; url?: string };
    let imageBuffer: Buffer;

    if (imgData.b64_json) {
      imageBuffer = Buffer.from(imgData.b64_json, "base64");
    } else if (imgData.url) {
      console.log("[generate-image] fetching image from URL…");
      const fetched = await fetch(imgData.url);
      imageBuffer = Buffer.from(await fetched.arrayBuffer());
    } else {
      return NextResponse.json({ error: "No image data returned" }, { status: 500 });
    }

    const dataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    console.log("[generate-image] done, returning dataUrl");
    return NextResponse.json({ dataUrl, cost: APPROX_COST_USD });
  } catch (err) {
    console.error("[generate-image] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
