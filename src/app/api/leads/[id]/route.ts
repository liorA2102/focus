import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const lead = await db.select().from(leads).where(eq(leads.id, Number(id))).get();
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
    return NextResponse.json(lead, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500, headers: CORS });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { notes } = body;

    const [updated] = await db
      .update(leads)
      .set({ notes: notes ?? null, updatedAt: new Date().toISOString() })
      .where(eq(leads.id, Number(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
    return NextResponse.json(updated, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500, headers: CORS });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(leads).where(eq(leads.id, Number(id)));
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500, headers: CORS });
  }
}
