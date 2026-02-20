import { NextResponse } from "next/server";
import { after } from "next/server";
import { fetchArticles } from "@/lib/feeds";
import { generateDigest } from "@/lib/digest";
import { readCache, writeCache, isCacheFresh } from "@/lib/cache";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs in the background after the response is already sent. */
async function regenerateAndCache() {
  const articles = await fetchArticles();
  const date = format(new Date(), "MMMM d, yyyy");
  const digest = await generateDigest(articles, date);
  await writeCache(digest);
}

export async function GET() {
  try {
    const cached = await readCache();

    // Best case: fresh digest in cache — return instantly.
    if (cached && isCacheFresh(cached)) {
      return NextResponse.json(cached);
    }

    // We have yesterday's digest: return it immediately so the user sees
    // something, and kick off today's regeneration in the background.
    if (cached) {
      after(async () => {
        await regenerateAndCache().catch((err) =>
          console.error("Background regeneration failed:", err)
        );
      });
      return NextResponse.json({ ...cached, stale: true });
    }

    // No digest at all (first deploy, or KV was cleared): respond immediately
    // with a "generating" signal and generate in the background.
    after(async () => {
      await regenerateAndCache().catch((err) =>
        console.error("Initial generation failed:", err)
      );
    });
    return NextResponse.json({ generating: true }, { status: 202 });
  } catch (err) {
    console.error("Digest route error:", err);
    return NextResponse.json(
      { error: "Failed to load digest" },
      { status: 500 }
    );
  }
}
