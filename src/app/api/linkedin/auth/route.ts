import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/linkedin";

export async function GET() {
  return NextResponse.redirect(getAuthUrl());
}
