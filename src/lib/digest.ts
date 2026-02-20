import Anthropic from "@anthropic-ai/sdk";
import { Article } from "./feeds";

export interface DigestSection {
  heading: string;
  body: string;
}

export interface Digest {
  date: string;
  headline: string;
  intro: string;
  sections: DigestSection[];
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

Below are the most recent news articles gathered from various sources. Your job is to synthesize them into a clear, helpful morning digest.

ARTICLES:
${articleList}

Please write a morning digest in the following JSON format:
{
  "headline": "A short, compelling headline for today's digest (e.g. 'Altadena Morning Digest – Feb 20, 2026')",
  "intro": "A 2-3 sentence overview of today's biggest themes across all articles",
  "sections": [
    {
      "heading": "Section heading (e.g. 'Fire & Safety Updates', 'Recovery & Rebuilding', 'Community Resources', 'Insurance & Legal', 'Environment & Air Quality', 'Local Government', 'Notable Stories')",
      "body": "3-6 sentences summarizing the articles in this category. Be specific: mention dates, names, numbers, and locations when available. Be compassionate and practical for people whose lives have been upended."
    }
  ]
}

Guidelines:
- Group articles into 2-6 thematic sections based on what's actually in the news
- Only include sections where you have real content from the articles
- Be specific and factual — no filler or generic statements
- Surface actionable information (hotlines, deadlines, resources) when present
- Use plain, clear language — no jargon
- Keep each section body to 3-6 sentences
- Respond ONLY with valid JSON matching the schema above`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from the response (Claude sometimes wraps in markdown)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    headline: string;
    intro: string;
    sections: DigestSection[];
  };

  return {
    date,
    headline: parsed.headline,
    intro: parsed.intro,
    sections: parsed.sections,
    articleCount: articles.length,
    generatedAt: new Date().toISOString(),
  };
}
