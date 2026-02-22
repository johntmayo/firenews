import Parser from "rss-parser";

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  source: string;
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; AltadenaDigest/1.0; +https://github.com/johntmayo/firenews)",
  },
});

// Google News RSS - reliable for local queries
const RSS_FEEDS: Array<{ name: string; url: string }> = [
  {
    name: "Google News – Eaton Fire",
    url: "https://news.google.com/rss/search?q=Eaton+Fire+California&hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "Google News – Altadena",
    url: "https://news.google.com/rss/search?q=Altadena+California&hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "Google News – Altadena Fire Recovery",
    url: "https://news.google.com/rss/search?q=Altadena+fire+recovery+rebuild&hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "Pasadena Star-News",
    url: "https://www.pasadenastarnews.com/feed",
  },
  {
    name: "LAist",
    url: "https://laist.com/feeds/news.xml",
  },
];

const KEYWORDS = [
  "altadena",
  "eaton fire",
  "eaton canyon fire",
  "pasadena fire",
  "altadena rebuild",
  "altadena recovery",
  "san gabriel valley fire",
  "la county fire",
];

function isRelevant(item: { title?: string; content?: string; summary?: string }): boolean {
  const text = `${item.title ?? ""} ${item.content ?? ""} ${item.summary ?? ""}`.toLowerCase();
  return KEYWORDS.some((kw) => text.includes(kw));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchArticles(): Promise<Article[]> {
  const allArticles: Article[] = [];
  const seenTitles = new Set<string>();

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return { feedName: feed.name, items: parsed.items ?? [] };
      } catch {
        console.warn(`Failed to fetch ${feed.name}`);
        return { feedName: feed.name, items: [] };
      }
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { feedName, items } = result.value;

    for (const item of items) {
      if (!item.title || !item.link) continue;

      // Skip duplicates by title
      const titleKey = item.title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) continue;

      // For Google News feeds, all results are relevant by query construction.
      // For general feeds (Pasadena Star-News, LAist), filter by keyword.
      const isGoogleFeed = feedName.startsWith("Google News");
      if (!isGoogleFeed && !isRelevant(item)) continue;

      seenTitles.add(titleKey);
      allArticles.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        summary: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ""),
        source: feedName,
      });
    }
  }

  // Sort newest first
  allArticles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  // Return at most 20 articles for digest generation
  return allArticles.slice(0, 20);
}
