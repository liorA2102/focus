import { NextResponse } from "next/server";
import { getMsAuthUrl } from "@/lib/graphEmail";

export async function GET() {
  const url = getMsAuthUrl();
  return NextResponse.redirect(url);
}
