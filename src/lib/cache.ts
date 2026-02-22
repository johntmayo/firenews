/**
 * Digest cache with two backends:
 *
 * 1. Vercel Blob (production) — set BLOB_READ_WRITE_TOKEN env var by adding a
 *    Blob store in the Vercel dashboard and connecting it to this project.
 *    Blob is shared across every serverless instance, so the cache is always
 *    consistent regardless of which Lambda handles a given request.
 *
 * 2. /tmp fallback (local dev) — fine when there's only one process.
 */

import fs from "fs/promises";
import path from "path";
import type { Digest } from "./digest";

const BLOB_PATHNAME = "altadena-digest.json";
const TMP_FILE = path.join("/tmp", "firenews-digest.json");

const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function readCache(): Promise<Digest | null> {
  if (hasBlob) {
    const { list, head } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PATHNAME });
    const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (!blob) return null;
    // For private blobs, list() returns an empty downloadUrl.
    // head() generates a fresh signed downloadUrl that actually works.
    const meta = await head(blob.url);
    const res = await fetch(meta.downloadUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<Digest>;
  }
  try {
    const raw = await fs.readFile(TMP_FILE, "utf-8");
    return JSON.parse(raw) as Digest;
  } catch {
    return null;
  }
}

export async function writeCache(digest: Digest): Promise<void> {
  if (hasBlob) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATHNAME, JSON.stringify(digest), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  await fs.writeFile(TMP_FILE, JSON.stringify(digest), "utf-8");
}

/** Returns true if the cached digest was generated today (Pacific time). */
export function isCacheFresh(digest: Digest): boolean {
  const toDay = (d: Date) =>
    new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))
      .toISOString()
      .split("T")[0];

  return toDay(new Date()) === toDay(new Date(digest.generatedAt));
}
