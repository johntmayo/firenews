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

  const prompt = `You are a compassionate journalist writing a morning news digest for Altadena, California residents affected by the Eaton Fire. Today is ${date}.

Below are numbered news articles. Write a CONCISE digest — keep each section to 2-3 sentences, total output must be brief.

CITATION RULES:
- Add [N] after specific facts, statistics, names, dollar amounts, or dates (e.g. "Roads reopened[3]").
- Only cite article numbers that actually support the statement. Do not cite things you made up.

ARTICLES:
${articleList}

Call the create_digest tool with:
- headline: Short headline (e.g. 'Altadena Morning Digest – Feb 20, 2026')
- intro: 1-2 sentences summarizing today's biggest themes, with [N] citations for any specific facts
- sections: 3-5 thematic sections, each with a heading and 2-3 sentences with [N] citations
  - Headings: 'Fire & Safety Updates', 'Recovery & Rebuilding', 'Community Resources', 'Insurance & Legal', 'Environment & Air Quality', 'Local Government', 'Notable Stories'
  - Surface deadlines, phone numbers, and resources when present
- citations: only articles you actually cited with [N], each with index, title, url, source`;

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
