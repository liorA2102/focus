import { NextResponse } from "next/server";
import { db } from "@/db";
import { positions, clients } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const open = await db.query.positions.findMany({
      where: eq(positions.status, "open"),
      columns: {
        id: true,
        title: true,
        clientId: true,
        location: true,
        salaryRange: true,
        description: true,
        requirements: true,
      },
    });

    // Look up client industries separately to avoid the column/relation name collision
    const clientIds = open.map((p) => p.clientId).filter(Boolean) as number[];
    const clientRows =
      clientIds.length > 0
        ? await db
            .select({ id: clients.id, industry: clients.industry })
            .from(clients)
            .where(inArray(clients.id, clientIds))
        : [];
    const industryMap = Object.fromEntries(clientRows.map((c) => [c.id, c.industry]));

    const result = open.map((pos) => ({
      id: pos.id,
      title: pos.title,
      location: pos.location,
      salaryRange: pos.salaryRange,
      description: pos.description,
      requirements: pos.requirements,
      industry: pos.clientId ? (industryMap[pos.clientId] ?? null) : null,
    }));

    return NextResponse.json(result, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500, headers: CORS });
  }
}
