/**
 * Digest cache with two backends:
 *
 * 1. Vercel KV (production) — set KV_REST_API_URL + KV_REST_API_TOKEN env vars.
 *    KV is shared across every serverless instance, so the cache is always
 *    consistent regardless of which Lambda handles a given request.
 *
 * 2. /tmp fallback (local dev) — good enough when there's only one process.
 */

import fs from "fs/promises";
import path from "path";
import type { Digest } from "./digest";

const KV_KEY = "altadena:digest";
const KV_TTL_SECONDS = 60 * 60 * 48; // 48 h — well beyond a single day
const TMP_FILE = path.join("/tmp", "firenews-digest.json");

const hasKV = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

export async function readCache(): Promise<Digest | null> {
  if (hasKV) {
    const { kv } = await import("@vercel/kv");
    const data = await kv.get<Digest>(KV_KEY);
    return data ?? null;
  }
  try {
    const raw = await fs.readFile(TMP_FILE, "utf-8");
    return JSON.parse(raw) as Digest;
  } catch {
    return null;
  }
}

export async function writeCache(digest: Digest): Promise<void> {
  if (hasKV) {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, digest, { ex: KV_TTL_SECONDS });
    return;
  }
  await fs.writeFile(TMP_FILE, JSON.stringify(digest), "utf-8");
}

/** Returns true if the cached digest was generated today (Pacific time). */
export function isCacheFresh(digest: Digest): boolean {
  const toDay = (d: Date) =>
    new Date(
      d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    )
      .toISOString()
      .split("T")[0];

  const todayPT = toDay(new Date());
  const generatedPT = toDay(new Date(digest.generatedAt));
  return todayPT === generatedPT;
}
