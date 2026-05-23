import { NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { db } from "@/db";
import { linkedinImages } from "@/db/schema";

type Corner = "tl" | "tr" | "bl" | "br";

const LOGO_H = 72;
const PADDING = 28;
const LOGO_SVG = path.join(process.cwd(), "public/logos/text-logo.svg");

async function buildLogo(): Promise<Buffer> {
  const svg = await fs.readFile(LOGO_SVG, "utf-8");
  return sharp(Buffer.from(svg)).resize({ height: LOGO_H }).png().toBuffer();
}

function buildGradientStrip(w: number, h: number): Buffer {
  const stripH = Math.round(h * 0.28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${stripH}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.62"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${stripH}" fill="url(#g)"/>
  </svg>`;
  return Buffer.from(svg);
}

export async function POST(request: Request) {
  const { dataUrl, label, corner: cornerParam = "br", imageType = "image" } = await request.json();
  const corner = imageType === "poster" ? "bl" : cornerParam;

  if (!dataUrl) {
    return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
  }

  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(b64, "base64");
  const { width: imgW = 1024, height: imgH = 1024 } = await sharp(imageBuffer).metadata();

  const logo = await buildLogo();
  const { width: logoW = 500, height: logoH = LOGO_H } = await sharp(logo).metadata();

  const c = corner as Corner;
  const left = c === "tr" || c === "br" ? imgW - logoW - PADDING : PADDING;
  const top  = c === "bl" || c === "br" ? imgH - logoH - PADDING : PADDING;

  const layers: sharp.OverlayOptions[] = [];

  if (imageType === "poster") {
    const stripH = Math.round(imgH * 0.28);
    layers.push({
      input: buildGradientStrip(imgW, imgH),
      top: imgH - stripH,
      left: 0,
    });
  }

  layers.push({ input: logo, left, top });

  const composited = await sharp(imageBuffer)
    .composite(layers)
    .png()
    .toBuffer();

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  await fs.writeFile(path.join(process.cwd(), "public/linkedin-images", filename), composited);

  const [record] = await db
    .insert(linkedinImages)
    .values({ filename, label: label?.trim() || null })
    .returning();

  return NextResponse.json(record);
}
