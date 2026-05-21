import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/graphEmail";

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(req.nextUrl.searchParams.get("error_description") ?? error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/email?error=No+code+returned", req.url));
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/email?connected=1", req.url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(String(err))}`, req.url)
    );
  }
}
