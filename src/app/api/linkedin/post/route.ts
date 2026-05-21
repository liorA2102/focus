import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/lib/linkedin";

export async function POST(req: NextRequest) {
  const { text, imageFilename } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const result = await createPost(text, imageFilename ?? undefined);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, postUrl: result.postUrl });
}
