import { NextRequest, NextResponse } from "next/server";
import { scrapeLinkedInCompany } from "@/lib/scrapeLinkedIn";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || !String(url).includes("linkedin.com/company/")) {
      return NextResponse.json({ error: "Invalid LinkedIn company URL" }, { status: 400 });
    }
    // Normalize to base company URL — strip trailing paths like /posts/?feedView=all
    const match = String(url).match(/(https?:\/\/(?:www\.)?linkedin\.com\/company\/[^/?#]+)/);
    const cleanUrl = match ? match[1] + "/" : String(url);
    const data = await scrapeLinkedInCompany(cleanUrl);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error("[scrape]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
