import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const APPROX_COST_USD = 0.08;

async function expandPrompt(
  userPrompt: string,
  colorMode: string,
  textLanguage: string,
  imageType: string,
): Promise<string> {
  const isHebrew = textLanguage === "he";
  const isMono = colorMode === "mono";
  const textLangInstruction = isHebrew ? "Any text in the image must be in Hebrew." : "Any text in the image must be in English.";
  const colorInstruction = isMono ? "The image must be black and white monochrome with deep contrast — no color at all." : "";

  let systemInstructions: string;

  if (imageType === "poster") {
    systemInstructions = `You are a world-class art director creating a premium LinkedIn post graphic for Focus Group, an Israeli executive recruitment company with 33 years of experience.

A recruiter's idea: "${userPrompt}"

Write a vivid image generation prompt (3–5 sentences) for a bold, creative poster. Pick one of the following visual directions — whichever fits the idea best:
- **Bold type on light**: Giant heavyweight typography as the hero, clean white or off-white background, a single small accent image or abstract shape. Stark, confident, editorial.
- **Duotone**: A striking photograph treated in two colors, text integrated into the composition with strong weight contrast between headline and any supporting line.
- **Dark cinematic**: One dramatic, moody visual — a landscape, object, or abstract form — with the text floating in a clear zone. Premium and atmospheric.
- **Flat geometric**: Bold graphic shapes, strong color blocks, Swiss/Bauhaus-inspired. Text is part of the geometry.
- **Typographic split**: The composition is split — half strong visual, half pure typography. Clean, modern, editorial-magazine feel.

Typography rule: use weight contrast — the primary message in ultra-bold or black weight, any secondary line in thin or light weight. Size contrast is NOT the goal — a secondary line should still be large and readable, just lighter. Both lines must be legible at a glance while scrolling a LinkedIn feed on mobile.

Non-negotiable rules:
- Every line of text must be large enough to read instantly while scrolling a LinkedIn feed on mobile. No small text anywhere — if it's worth including, it must be huge.
- Generous negative space — the composition breathes.
- A single strong visual element or concept. No busy collages, no icon grids.
- Keep the bottom-left corner area dark and clear — a company logo will be placed there.
- No clichés: no handshakes, no suits pointing at charts, no generic stock imagery.
- No logos or watermarks in the image itself.
- ${textLangInstruction}${colorInstruction ? " " + colorInstruction : ""}

Return only the prompt text, nothing else.`;
  } else {
    systemInstructions = `You are a world-class editorial photographer and art director creating a LinkedIn post image for Focus Group, an Israeli executive recruitment company with 33 years of experience.

A recruiter's idea: "${userPrompt}"

Write a vivid image generation prompt (3–5 sentences) for a high-quality photo or lightly stylized image. Be inventive — choose whatever visual direction, lighting, setting, and mood best brings this idea to life. No text in the image.

Rules:
- No logos or watermarks.
- No clichés: no handshakes, no suits pointing at charts, no generic stock imagery.
- ${textLangInstruction}${colorInstruction ? " " + colorInstruction : ""}

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
  const { prompt, colorMode, textLanguage, imageType = "image", rawPrompt, mode } = await request.json();

  if (!prompt?.trim() && !rawPrompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const expandedPrompt = rawPrompt?.trim()
      ? rawPrompt.trim()
      : await expandPrompt(prompt.trim(), colorMode, textLanguage, imageType);

    if (mode === "expand") {
      return NextResponse.json({ expandedPrompt });
    }

    console.log("[generate-image] calling gpt-image-2…");

    console.log("[generate-image] calling gpt-image-2…");
    const response = await openai.images.generate({
      model: "gpt-image-2" as string,
      prompt: expandedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
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
    return NextResponse.json({ dataUrl, cost: APPROX_COST_USD, expandedPrompt });
  } catch (err) {
    console.error("[generate-image] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
