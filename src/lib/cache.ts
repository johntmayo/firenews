/**
 * Simple file-based cache for the digest, so we don't call Claude on every page load.
 * On Vercel, the /tmp directory is writable and persists across warm invocations.
 */

import fs from "fs/promises";
import path from "path";
import type { Digest } from "./digest";

const CACHE_DIR = path.join("/tmp", "firenews-cache");
const CACHE_FILE = path.join(CACHE_DIR, "digest.json");

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function readCache(): Promise<Digest | null> {
  try {
    await ensureCacheDir();
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as Digest;
    return data;
  } catch {
    return null;
  }
}

export async function writeCache(digest: Digest): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE, JSON.stringify(digest, null, 2), "utf-8");
}

/** Returns true if the cached digest is still fresh (generated today, Pacific time). */
export function isCacheFresh(digest: Digest): boolean {
  const now = new Date();
  const pacificNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  const todayPacific = pacificNow.toISOString().split("T")[0];

  const generated = new Date(digest.generatedAt);
  const pacificGenerated = new Date(
    generated.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  const generatedDay = pacificGenerated.toISOString().split("T")[0];

  return todayPacific === generatedDay;
}
