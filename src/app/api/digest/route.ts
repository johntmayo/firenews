import { NextResponse } from "next/server";
import { readCache, isCacheFresh } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Pure read endpoint — never generates anything.
 * All generation is handled exclusively by /api/refresh (cron at 5–6 AM PT).
 * Visiting this page 1000 times costs zero API calls.
 */
export async function GET() {
  try {
    const cached = await readCache();

    if (!cached) {
      // No digest exists yet — cron hasn't run since deploy.
      return NextResponse.json({ pending: true }, { status: 202 });
    }

    if (!isCacheFresh(cached)) {
      // Yesterday's digest — cron hasn't run yet today.
      return NextResponse.json({ ...cached, stale: true });
    }

    return NextResponse.json(cached);
  } catch (err) {
    console.error("Digest read error:", err);
    return NextResponse.json(
      { error: "Failed to load digest" },
      { status: 500 }
    );
  }
}
