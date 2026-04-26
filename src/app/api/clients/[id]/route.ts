import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function downloadLogo(remoteUrl: string, clientId: number): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "logos");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${clientId}.png`), buffer);
    return `/logos/${clientId}.png`;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, Number(id)),
      with: {
        contacts: true,
        positions: {
          with: { matches: true },
        },
      },
    });

    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ...client,
      positions: client.positions.map((p) => ({
        id:             p.id,
        title:          p.title,
        status:         p.status,
        candidateCount: p.matches.filter((m) => m.strength !== "weak").length,
      })),
    });
  } catch (err) {
    console.error("[GET /api/clients/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(clients).where(eq(clients.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]]", err);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, tagline, industry, website, linkedinUrl, logoUrl } = body;

    const updates: Partial<typeof clients.$inferInsert> = {};
    if (name      !== undefined) updates.name        = name;
    if (tagline   !== undefined) updates.tagline      = tagline;
    if (industry  !== undefined) updates.industry     = industry;
    if (website   !== undefined) updates.website      = website;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;

    if (logoUrl) {
      const logoPath = await downloadLogo(logoUrl, Number(id));
      if (logoPath) updates.logoPath = logoPath;
    }

    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, Number(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/clients/[id]]", err);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
