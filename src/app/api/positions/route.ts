import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.query.positions.findMany({
      orderBy: [desc(positions.createdAt)],
    });
    return NextResponse.json(all);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(positions)
      .values({
        title: body.title,
        client: body.client,
        location: body.location ?? null,
        salaryRange: body.salaryRange ?? null,
        description: body.description ?? null,
        requirements: body.requirements ?? null,
        status: "open",
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
