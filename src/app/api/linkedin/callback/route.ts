import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/linkedin";

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/positions?linkedin_error=${encodeURIComponent(error ?? "no_code")}`, req.url)
    );
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(new URL("/positions?linkedin_connected=1", req.url));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/positions?linkedin_error=${encodeURIComponent((e as Error).message)}`, req.url)
    );
  }
}
