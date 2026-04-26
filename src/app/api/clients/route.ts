import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, clientContacts, positions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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

export async function GET() {
  try {
    const all = await db.query.clients.findMany({
      orderBy: [desc(clients.createdAt)],
      with: { contacts: true, positions: true },
    });

    return NextResponse.json(
      all.map((c) => ({
        id:           c.id,
        name:         c.name,
        tagline:      c.tagline,
        industry:     c.industry,
        website:      c.website,
        linkedinUrl:  c.linkedinUrl,
        logoPath:     c.logoPath,
        createdAt:    c.createdAt,
        openPositions: c.positions.filter((p) => p.status === "open").length,
        contactCount:  c.contacts.length,
      }))
    );
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, tagline, industry, website, linkedinUrl, logoUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(clients)
      .values({ name: name.trim(), tagline, industry, website, linkedinUrl })
      .returning();

    // Download logo after we have the client ID
    if (logoUrl) {
      const logoPath = await downloadLogo(logoUrl, created.id);
      if (logoPath) {
        await db.update(clients).set({ logoPath }).where(eq(clients.id, created.id));
        created.logoPath = logoPath;
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
