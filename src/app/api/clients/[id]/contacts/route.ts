import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clientContacts } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, title, email, phone } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
    }

    const [contact] = await db
      .insert(clientContacts)
      .values({ clientId: Number(id), name: name.trim(), title, email, phone })
      .returning();

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients/[id]/contacts]", err);
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
}
