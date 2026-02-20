import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/feeds";
import { generateDigest } from "@/lib/digest";
import { readCache, writeCache, isCacheFresh } from "@/lib/cache";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    // Return cached digest if fresh
    const cached = await readCache();
    if (cached && isCacheFresh(cached)) {
      return NextResponse.json(cached);
    }

    // Fetch articles and generate a new digest
    const articles = await fetchArticles();
    const date = format(new Date(), "MMMM d, yyyy");
    const digest = await generateDigest(articles, date);

    await writeCache(digest);

    return NextResponse.json(digest);
  } catch (err) {
    console.error("Digest generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}
