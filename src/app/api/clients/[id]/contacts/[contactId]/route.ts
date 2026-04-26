import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clientContacts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;

    await db
      .delete(clientContacts)
      .where(and(eq(clientContacts.id, Number(contactId)), eq(clientContacts.clientId, Number(id))));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]/contacts/[contactId]]", err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
