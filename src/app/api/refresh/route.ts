/**
 * Triggered by Vercel Cron at 6 AM Pacific daily to pre-generate the digest.
 * Can also be hit manually in the browser to seed the first digest.
 */

import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/feeds";
import { generateDigest } from "@/lib/digest";
import { writeCache } from "@/lib/cache";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const articles = await fetchArticles();
    const date = format(new Date(), "MMMM d, yyyy");
    const digest = await generateDigest(articles, date);
    await writeCache(digest);

    return NextResponse.json({
      ok: true,
      articleCount: digest.articleCount,
      sections: digest.sections.length,
      generatedAt: digest.generatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Refresh failed", detail: message }, { status: 500 });
  }
}
