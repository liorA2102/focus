import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinImages } from "@/db/schema";
import fs from "fs";
import path from "path";

const GALLERY_DIR = path.join(process.cwd(), "public", "linkedin-images");

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file  = form.get("file") as File | null;
  const label = (form.get("label") as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dest     = path.join(GALLERY_DIR, filename);

  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buf);

  const [row] = await db.insert(linkedinImages).values({ filename, label }).returning();
  return NextResponse.json(row, { status: 201 });
}
