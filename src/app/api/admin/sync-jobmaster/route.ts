import { NextResponse } from "next/server";
import { syncJobsFromJobMaster } from "@/lib/jobmasterSync";

export async function POST() {
  try {
    const result = await syncJobsFromJobMaster();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
