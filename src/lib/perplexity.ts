import type { Article } from "./feeds";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

/**
 * Parses Perplexity's prose response into Article objects.
 * Perplexity returns numbered items like:
 *   "1. **Headline** [1] — Source: One-sentence summary."
 * and a parallel citations[] array of URLs.
 */
function parsePerplexityContent(content: string, citations: string[]): Article[] {
  const articles: Article[] = [];
  const lines = content.split("\n").filter((line) => /^\d+[\.\)]/.test(line.trim()));

  for (const line of lines) {
    // Extract citation index: first [N] in the line
    const citationMatch = line.match(/\[(\d+)\]/);
    const citationIndex = citationMatch ? parseInt(citationMatch[1], 10) - 1 : -1;
    const url = citationIndex >= 0 && citationIndex < citations.length
      ? citations[citationIndex]
      : "";

    if (!url) continue;

    // Strip leading "N. " and citation markers like [1]
    const stripped = line
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\*\*/g, "")
      .trim();

    // Split on em-dash or " - " to separate headline from summary
    const separatorMatch = stripped.match(/^(.+?)\s*(?:—|-{1,2})\s*(.+)$/);
    const headline = separatorMatch ? separatorMatch[1].trim() : stripped;
    const summary = separatorMatch ? separatorMatch[2].trim() : "";

    if (!headline) continue;

    let source = "Perplexity";
    try {
      source = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // keep default
    }

    articles.push({
      title: headline,
      link: url,
      pubDate: new Date().toISOString(),
      summary,
      source,
    });
  }

  return articles;
}

/**
 * Fetches recent Altadena/Eaton Fire news via Perplexity Sonar.
 * Returns [] if PERPLEXITY_API_KEY is not set or if the call fails.
 * Safe to run in parallel with fetchArticles() — failures are silenced.
 */
export async function fetchArticlesViaPerplexity(): Promise<Article[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        search_recency_filter: "day",
        messages: [
          {
            role: "system",
            content:
              "You are a news researcher. Find factual recent news only. Do not editorialize. Return a plain numbered list of news items.",
          },
          {
            role: "user",
            content:
              "Find all news articles from the past 24 hours about: Altadena California fire recovery, Eaton Fire damage or insurance claims, Altadena rebuild permits or debris removal, LA County fire recovery resources, air quality in Pasadena or Altadena after the Eaton Fire. For each item give: the headline, then a dash, then the publication name and a one-sentence summary. Number each item.",
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.warn(`Perplexity API error: ${response.status}`);
      return [];
    }

    const data: PerplexityResponse = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];

    const articles = parsePerplexityContent(content, citations);
    console.log(`Perplexity returned ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.warn("Perplexity fetch failed (non-fatal):", err);
    return [];
  }
}
