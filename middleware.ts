// WO-3 — AI crawler telemetry: Vercel edge middleware (portfolio dogfood).
//
// Runs server-side on page requests, sees the raw User-Agent (which client-side
// analytics never can for JS-less AI bots), and fires a best-effort beacon to
// /api/bot-hit for classified AI crawlers. It NEVER rewrites/blocks — every code
// path falls through to the normal response, and all work is wrapped so a failure
// here can never take down the site. The reliable ingestion paths for clients are
// the WordPress plugin / edge worker POSTing to /api/bot-hit directly; this just
// captures our own portfolio traffic for live data.

import { classifyUserAgent } from './src/lib/botClassify';

// Only page navigations — skip /api, hashed assets, and any file with an extension.
export const config = {
  matcher: ['/((?!api/|assets/|.*\\.[a-zA-Z0-9]+$).*)'],
};

/** Vercel passes a context with `waitUntil`. Typed loosely so the middleware keeps
 *  working if the platform ever calls it with one argument. */
type EdgeContext = { waitUntil?: (p: Promise<unknown>) => void };

export default function middleware(request: Request, context?: EdgeContext): void {
  try {
    const ua = request.headers.get('user-agent');
    if (!classifyUserAgent(ua)) return; // not an AI bot — do nothing
    const url = new URL(request.url);
    // The beacon MUST be registered with waitUntil. A bare `void fetch(...)` is not
    // guaranteed to complete: the runtime may terminate the invocation as soon as the
    // response is returned, so the POST is dropped in flight. That is what happened here —
    // recording ran at 100+ hits/day through Aug 18, then fell to near zero while the
    // site kept serving crawlers normally. The instrument broke, not the crawling.
    // Diagnosed Sep 7 2026 by firing a GPTBot user-agent at production and confirming
    // no row was written. Never revert this to a bare `void fetch`.
    const beacon = fetch(`${url.origin}/api/bot-hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: url.hostname.replace(/^www\./, ''),
        path: url.pathname,
        userAgent: ua,
        source: 'middleware',
      }),
    }).catch(() => {});
    if (typeof context?.waitUntil === 'function') context.waitUntil(beacon);
    else void beacon; // no context available — best effort, as before
  } catch {
    // swallow — telemetry must never break a page request
  }
  // return undefined → request continues normally
}
