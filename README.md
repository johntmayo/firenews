# Altadena Morning Digest

A daily morning news digest covering the **Eaton Fire** and **Altadena, California** community. Built with Next.js and powered by Claude AI.

## How it works

1. **News fetching** – On each request, the app pulls the latest articles from Google News RSS feeds (queried for "Eaton Fire", "Altadena California", etc.), the Pasadena Star-News, and LAist.
2. **AI digest** – The articles are sent to Claude, which synthesizes them into a structured morning digest with thematic sections (Fire & Safety, Recovery & Rebuilding, Community Resources, etc.).
3. **Caching** – The generated digest is cached for the day so Claude isn't called on every page visit. A Vercel cron job fires at 6 AM Pacific to pre-generate each morning's digest.

## Getting started

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### Local development

```bash
# Install dependencies
npm install

# Set your API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first load will fetch news and generate the digest (takes ~20–30 seconds). Subsequent loads within the same day use the cache.

## Deployment (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add environment variables:
   - `ANTHROPIC_API_KEY` – required
   - `CRON_SECRET` – optional, any random string (Vercel will send this automatically with cron requests)
3. Deploy. Vercel will automatically pick up the cron schedule in `vercel.json` (runs daily at 6 AM Pacific / 1 PM UTC).

## Project structure

```
src/
  app/
    page.tsx              # Main digest UI
    api/
      digest/route.ts     # GET /api/digest — returns digest (cached or fresh)
      refresh/route.ts    # GET /api/refresh — cron endpoint to regenerate
  lib/
    feeds.ts              # RSS feed fetching & filtering
    digest.ts             # Claude API digest generation
    cache.ts              # /tmp file-based day cache
vercel.json               # Cron schedule (daily 6 AM PT)
```

## Emergency Resources

- [FEMA Disaster Assistance](https://www.disasterassistance.gov)
- [211 LA (local resources)](https://www.211la.org)
- [LA County Emergency](https://lacounty.gov/emergency/)
