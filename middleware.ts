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

export default function middleware(request: Request): void {
  try {
    const ua = request.headers.get('user-agent');
    if (!classifyUserAgent(ua)) return; // not an AI bot — do nothing
    const url = new URL(request.url);
    // Fire-and-forget; do not await, do not throw.
    void fetch(`${url.origin}/api/bot-hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: url.hostname.replace(/^www\./, ''),
        path: url.pathname,
        userAgent: ua,
        source: 'middleware',
      }),
    }).catch(() => {});
  } catch {
    // swallow — telemetry must never break a page request
  }
  // return undefined → request continues normally
}
