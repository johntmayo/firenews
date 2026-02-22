"use client";

import { useEffect, useState, useCallback } from "react";
import type { Digest } from "@/lib/digest";

type ApiResponse =
  | (Digest & { stale?: boolean; pending?: never })
  | { pending: true };

function isPending(r: ApiResponse): r is { pending: true } {
  return (r as { pending?: boolean }).pending === true;
}

function FireIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 inline-block align-middle mr-1"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.545 3.75 3.75 0 0 1 3.255 3.717Z"
        clipRule="evenodd"
      />
    </svg>
  );
}


function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 mt-8">
      <div className="h-7 bg-amber-100 rounded w-3/4" />
      <div className="h-4 bg-amber-50 rounded w-full" />
      <div className="h-4 bg-amber-50 rounded w-5/6" />
      <div className="h-4 bg-amber-50 rounded w-4/6" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 pt-4">
          <div className="h-4 bg-amber-100 rounded w-1/3" />
          <div className="h-4 bg-amber-50 rounded w-full" />
          <div className="h-4 bg-amber-50 rounded w-5/6" />
          <div className="h-4 bg-amber-50 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/digest")
      .then((res) => {
        if (!res.ok && res.status !== 202)
          throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        if (isPending(data)) {
          setPending(true);
          setDigest(null);
        } else {
          setDigest(data);
          setStale(!!data.stale);
          setPending(false);
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const generatedTime = digest?.generatedAt
    ? new Date(digest.generatedAt).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  const citations = digest?.citations ?? [];

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      {/* Masthead */}
      <header className="border-b-4 border-amber-800 pt-10 pb-6 px-4">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-widest text-amber-700 mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Altadena, California
          </p>
          <h1
            className="text-5xl font-bold leading-tight text-stone-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Morning Digest
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Daily news on the Eaton Fire &amp; Altadena community
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Initial loading */}
        {loading && <Skeleton />}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Error:</strong> {error}.{" "}
            <button onClick={fetchDigest} className="underline">
              Try again
            </button>
          </div>
        )}

        {/* No digest yet — cron hasn't run since first deploy */}
        {pending && !loading && (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 font-sans space-y-1">
            <p className="font-semibold">Today&rsquo;s digest isn&rsquo;t ready yet.</p>
            <p className="text-amber-700">
              The digest is generated automatically at 5–6 AM Pacific time.
              Check back then, or{" "}
              <button onClick={fetchDigest} className="underline font-medium">
                refresh
              </button>{" "}
              if you think it should be ready.
            </p>
          </div>
        )}

        {/* Digest */}
        {digest && !loading && (
          <article style={{ fontFamily: "Georgia, serif" }}>
            {/* Stale banner — cron hasn't run yet today */}
            {stale && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 font-sans">
                <span>
                  Showing yesterday&rsquo;s digest — today&rsquo;s will be
                  ready after 6 AM PT.
                </span>
                <button
                  onClick={fetchDigest}
                  className="shrink-0 font-semibold underline hover:text-amber-900"
                >
                  Check now
                </button>
              </div>
            )}

            {/* Dateline */}
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">
              {digest.date}
              {generatedTime && (
                <span className="normal-case ml-2 text-stone-300">
                  &mdash; updated {generatedTime} PT
                </span>
              )}
            </p>

            {/* Headline */}
            <h2 className="text-2xl font-bold text-stone-900 mb-5 leading-snug">
              {digest.headline}
            </h2>

            {/* Lede */}
            <p className="text-lg leading-relaxed text-stone-700 mb-8 border-l-4 border-amber-500 pl-4 italic">
              {digest.intro}
            </p>

            <div className="border-t-2 border-stone-200 mb-8" />

            {/* Sections */}
            {digest.sections.length > 0 ? (
              <div className="space-y-9">
                {digest.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">
                      <FireIcon />
                      {section.heading}
                    </h3>
                    <div className="w-10 h-0.5 bg-amber-300 mb-3" />
                    <p className="text-base leading-relaxed text-stone-700">
                      {section.body}
                    </p>
                  </section>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm">
                No sections available for today.
              </p>
            )}

            {/* Sources */}
            {citations.length > 0 && (
              <section className="mt-12 pt-6 border-t-2 border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-4 font-sans">
                  Sources
                </h3>
                <ul className="space-y-2">
                  {citations.map((c) => (
                    <li
                      key={c.index}
                      className="text-xs text-stone-500 font-sans leading-snug"
                    >
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700 underline hover:text-amber-900 break-words"
                      >
                        {c.title}
                      </a>
                      <span className="text-stone-400 ml-1">— {c.source}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Footer */}
            <footer className="mt-10 pt-6 border-t border-stone-200 text-xs text-stone-400 font-sans space-y-2">
              <p>
                Digest synthesized from {digest.articleCount} article
                {digest.articleCount !== 1 ? "s" : ""} using Claude AI.
                Always verify critical safety information directly with
                official sources.
              </p>
              <p className="pt-1">
                <strong className="text-stone-500">Emergency Resources:</strong>{" "}
                <a
                  href="https://www.disasterassistance.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline"
                >
                  FEMA Disaster Assistance
                </a>{" "}
                &middot;{" "}
                <a
                  href="https://www.211la.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline"
                >
                  211 LA
                </a>{" "}
                &middot;{" "}
                <a
                  href="https://lacounty.gov/emergency/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline"
                >
                  LA County Emergency
                </a>
              </p>
            </footer>
          </article>
        )}
      </div>
    </main>
  );
}
