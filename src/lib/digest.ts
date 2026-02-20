import Anthropic from "@anthropic-ai/sdk";
import { Article } from "./feeds";

export interface Citation {
  index: number;
  title: string;
  url: string;
  source: string;
}

export interface DigestSection {
  heading: string;
  body: string; // contains inline [N] citation markers
}

export interface Digest {
  date: string;
  headline: string;
  intro: string; // may contain inline [N] citation markers
  sections: DigestSection[];
  citations: Citation[]; // only articles actually cited
  articleCount: number;
  generatedAt: string;
}

const client = new Anthropic();

export async function generateDigest(
  articles: Article[],
  date: string
): Promise<Digest> {
  if (articles.length === 0) {
    return {
      date,
      headline: "Altadena & Eaton Fire Morning Digest",
      intro:
        "No new articles were found in today's news feeds. Please check back later.",
      sections: [],
      citations: [],
      articleCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] Source: ${a.source}\nTitle: ${a.title}\nDate: ${a.pubDate}\nSummary: ${a.summary || "(no summary)"}\nURL: ${a.link}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are a compassionate, thorough journalist writing a morning news digest for residents of Altadena, California and people affected by the Eaton Fire. Today's date is ${date}.

Below are numbered news articles. Synthesize them into a structured morning digest with FREQUENT inline citations.

CITATION RULES — follow these exactly:
- Every specific fact, statistic, name, date, dollar amount, place, or claim MUST be followed immediately by [N] where N is the article number it came from.
- Aim for at least one [N] citation per sentence. Multiple citations per sentence are encouraged when a claim draws on more than one article (e.g. "Roads are still closed[3][7]").
- Do NOT cite things you made up — only cite article numbers that actually support the statement.
- The "intro" field should also contain inline citations for any specific facts mentioned.

ARTICLES:
${articleList}

Respond ONLY with valid JSON in this exact schema:
{
  "headline": "Short, compelling headline for today's digest (e.g. 'Altadena Morning Digest – Feb 20, 2026')",
  "intro": "2-3 sentence overview of today's biggest themes, with [N] citations after every specific fact.",
  "sections": [
    {
      "heading": "Section heading (choose from: 'Fire & Safety Updates', 'Recovery & Rebuilding', 'Community Resources', 'Insurance & Legal', 'Environment & Air Quality', 'Local Government', 'Notable Stories' — or invent one that fits)",
      "body": "3-6 sentences with [N] inline citations after every specific fact, statistic, name, date, or claim. Be specific and compassionate. Surface deadlines, phone numbers, and resources when present."
    }
  ],
  "citations": [
    {
      "index": 1,
      "title": "Exact article title",
      "url": "https://...",
      "source": "Source name"
    }
  ]
}

Additional guidelines:
- Only include articles in "citations" that you actually referenced with [N] in the text.
- Group articles into 2-6 thematic sections based on what is actually in the news.
- Be specific and factual — no filler or generic statements.
- Use plain, clear language — no jargon.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON (Claude sometimes wraps it in markdown fences)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    headline: string;
    intro: string;
    sections: DigestSection[];
    citations: Citation[];
  };

  return {
    date,
    headline: parsed.headline,
    intro: parsed.intro,
    sections: parsed.sections,
    citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    articleCount: articles.length,
    generatedAt: new Date().toISOString(),
  };
}
