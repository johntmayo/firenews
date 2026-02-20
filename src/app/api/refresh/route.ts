/**
 * Triggered by Vercel Cron at 6 AM Pacific daily to pre-generate the digest.
 * Secured with CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchArticles } from "@/lib/feeds";
import { generateDigest } from "@/lib/digest";
import { writeCache } from "@/lib/cache";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
