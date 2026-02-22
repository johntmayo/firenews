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

Call the create_digest tool with:
- headline: Short, compelling headline for today's digest (e.g. 'Altadena Morning Digest – Feb 20, 2026')
- intro: 2-3 sentence overview of today's biggest themes, with [N] citations after every specific fact
- sections: 2-6 thematic sections, each with a heading and a body of 3-6 sentences with [N] inline citations
  - Choose headings from: 'Fire & Safety Updates', 'Recovery & Rebuilding', 'Community Resources', 'Insurance & Legal', 'Environment & Air Quality', 'Local Government', 'Notable Stories' — or invent one that fits
  - Surface deadlines, phone numbers, and resources when present
- citations: only the articles you actually cited with [N] in the text, each with index, title, url, source

Additional guidelines:
- Only include articles in "citations" that you actually referenced with [N] in the text.
- Group articles into 2-6 thematic sections based on what is actually in the news.
- Be specific and factual — no filler or generic statements.
- Use plain, clear language — no jargon.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    tools: [
      {
        name: "create_digest",
        description: "Create a structured morning news digest",
        input_schema: {
          type: "object" as const,
          properties: {
            headline: { type: "string" },
            intro: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  body: { type: "string" },
                },
                required: ["heading", "body"],
              },
            },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  title: { type: "string" },
                  url: { type: "string" },
                  source: { type: "string" },
                },
                required: ["index", "title", "url", "source"],
              },
            },
          },
          required: ["headline", "intro", "sections", "citations"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "create_digest" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUseBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = toolUseBlock.input as {
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
