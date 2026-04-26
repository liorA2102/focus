import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publishToJobMaster } from "@/lib/jobmaster";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const position = await db.query.positions.findFirst({
    where: eq(positions.id, Number(id)),
  });

  if (!position) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  if (position.postedJobMaster) {
    return NextResponse.json({ error: "Already posted to JobMaster" }, { status: 409 });
  }

  const result = await publishToJobMaster({
    title: position.title,
    description: position.description,
    requirements: position.requirements,
    salaryRange: position.salaryRange,
    location: position.location,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await db
    .update(positions)
    .set({
      postedJobMaster: true,
      jobMasterUrl: result.jobUrl ?? null,
      jobMasterPostedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(positions.id, Number(id)));

  return NextResponse.json({ success: true, jobUrl: result.jobUrl });
}
