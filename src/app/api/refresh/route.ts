/**
 * Triggered by Vercel Cron at 6 AM Pacific daily to pre-generate the digest.
 * Can also be hit manually in the browser to seed the first digest.
 */

import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/feeds";
import { fetchArticlesViaPerplexity } from "@/lib/perplexity";
import { generateDigest } from "@/lib/digest";
import { writeCache } from "@/lib/cache";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    // Run RSS and Perplexity in parallel; Perplexity failure is non-fatal
    const [rssResult, perplexityResult] = await Promise.allSettled([
      fetchArticles(),
      fetchArticlesViaPerplexity(),
    ]);

    const rssArticles = rssResult.status === "fulfilled" ? rssResult.value : [];
    const perplexityArticles = perplexityResult.status === "fulfilled" ? perplexityResult.value : [];

    // Merge and deduplicate by title (case-insensitive), RSS takes priority
    const seenTitles = new Set(rssArticles.map((a) => a.title.toLowerCase().trim()));
    const newFromPerplexity = perplexityArticles.filter(
      (a) => !seenTitles.has(a.title.toLowerCase().trim())
    );
    const articles = [...rssArticles, ...newFromPerplexity].slice(0, 25);

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
