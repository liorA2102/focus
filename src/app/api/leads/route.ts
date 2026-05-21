import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc } from "drizzle-orm";

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
    const all = await db.select().from(leads).orderBy(desc(leads.createdAt));
    return NextResponse.json(all, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, headline, company, linkedinUrl, profilePictureUrl, postUrl, templateUsed } = body;

    if (!name || !linkedinUrl) {
      return NextResponse.json({ error: "name and linkedinUrl are required" }, { status: 400, headers: CORS });
    }

    const [lead] = await db.insert(leads).values({
      name,
      headline: headline ?? null,
      company: company ?? null,
      linkedinUrl,
      profilePictureUrl: profilePictureUrl ?? null,
      postUrl: postUrl ?? null,
      templateUsed: templateUsed ?? null,
    }).returning();

    return NextResponse.json(lead, { status: 201, headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500, headers: CORS });
  }
}
