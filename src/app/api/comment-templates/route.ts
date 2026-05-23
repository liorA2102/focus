import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commentTemplates } from "@/db/schema";
import { asc } from "drizzle-orm";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const all = await db.select().from(commentTemplates).orderBy(asc(commentTemplates.createdAt));
    return NextResponse.json(all, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: templateBody, imageFilename } = body;

    if (!title || !templateBody) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400, headers: CORS });
    }

    const [template] = await db.insert(commentTemplates).values({
      title,
      body: templateBody,
      imageFilename: imageFilename ?? null,
    }).returning();

    return NextResponse.json(template, { status: 201, headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500, headers: CORS });
  }
}
