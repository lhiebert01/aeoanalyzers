// Index-coverage & entity-disambiguation audit (WO-8).
//
// The crawler-access gate (crawlerAccess.ts) answers "are AI bots ALLOWED to
// read this page?". This module answers the next three questions, all of which
// silently sink AEO even when robots.txt is wide open:
//
//   1. Bing Webmaster verification — Bing feeds BOTH Perplexity and ChatGPT
//      search. An unverified site is the single most neglected, highest-leverage
//      miss in AEO. We can only observe the on-page verification meta tag, so we
//      report the on-page signal honestly (DNS/XML verification is invisible to
//      a page read — see the recommendation wording).
//   2. The non-JS fetch test — AI bots DO NOT execute JavaScript. `api/fetch-site`
//      already returns the raw, server-rendered HTML (no JS run), so the text we
//      can see here IS exactly what a bot sees. A custom-coded SPA that ships a
//      near-empty `<div id="root">` shell is invisible to answer engines no
//      matter how good its (client-rendered) content is.
//   3. Entity disambiguation & third-party authority thinness — sparse `sameAs`
//      profiles leave an LLM unable to resolve the brand to ONE knowledge-graph
//      entity, and an entity cited only on its own properties reads as low
//      authority. The live, search-backed version of this (which colliding
//      entities actually rank, which directories cite you) arrives with the
//      citation sweeps (WO-1/WO-7); here we ground the ADVICE in on-page signals
//      only and never fabricate a specific collision or citation.
//
// 100% deterministic. The LLM is not involved. Its only input from the model
// layer is `entityGraphAudit.sameAsUrls`, which is itself already grounded to
// URLs that literally appear on the page (see applyAccuracyGuards).

/** Below this many visible (non-JS) characters, a custom-coded page is treated
 *  as a client-rendered shell that AI bots effectively see as empty. Real
 *  content pages carry thousands of characters; an empty SPA shell carries a
 *  nav label and a "loading" string at most. Deliberately conservative to avoid
 *  false positives. */
export const THIN_TEXT_THRESHOLD = 600;

export interface IndexCoverageResult {
  // --- Bing Webmaster (measured: on-page signal only) ---
  /** A `<meta name="msvalidate.01">` Bing site-verification tag is present. */
  bingVerificationMetaFound: boolean;

  // --- Non-JS / server-render test (measured) ---
  /** Visible text length of the RAW server HTML — what a JS-less bot actually sees. */
  renderedTextLength: number;
  /** The page is a custom-coded framework build (not a server-rendered CMS). */
  isCustomCoded: boolean;
  /** Custom-coded AND thin server HTML → answer engines see a near-empty page. */
  clientRenderedShell: boolean;

  // --- Entity disambiguation (grounded in on-page sameAs) ---
  brandNameCandidate: string | null;
  /** Count of on-page `sameAs` profile URLs (already grounded to the page). */
  sameAsCount: number;

  /** 0–100 index-coverage sub-score, for the report card. */
  score: number;
  status: 'ok' | 'warn' | 'critical';
  summary: string;
  recommendations: string[];
}

/** Strip scripts/styles/noscript/comments/tags → collapse to visible text.
 *  `<noscript>` is removed because its "enable JavaScript" message is NOT real
 *  content and would otherwise mask an empty SPA shell. */
export function extractVisibleText(html: string): string {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Read a `<meta name|property="key" content="...">` value, order-tolerant on
 *  the name/property side (standard authoring puts it before `content`). */
function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i');
  const tag = html.match(rx);
  if (!tag) return null;
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].trim() : null;
}

/** Best-effort brand name from the page's own signals, then the domain.
 *  Used only to phrase disambiguation advice — never asserted as a fact. */
function extractBrandName(html: string, url: string): string | null {
  const h = String(html || '');
  const og = metaContent(h, 'og:site_name');
  if (og) return og;
  const appName = metaContent(h, 'application-name');
  if (appName) return appName;
  const title = h.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) {
    // Take the segment before a common title separator ("Brand | Tagline").
    const t = title[1].split(/[|–—·:]|\s-\s/)[0].trim();
    if (t) return t;
  }
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0];
    return label || null;
  } catch {
    return null;
  }
}

/**
 * Produce the index-coverage audit from a page's raw (non-JS) HTML plus the
 * already-computed platform + entity-graph signals.
 */
export function evaluateIndexCoverage(input: {
  html: string;
  url: string;
  /** From detectPlatform(html). */
  isCustomCoded?: boolean;
  /** On-page sameAs profile URLs, already grounded (from entityGraphAudit). */
  sameAsUrls?: string[];
}): IndexCoverageResult {
  const html = String(input.html || '');
  const isCustomCoded = !!input.isCustomCoded;
  const sameAsUrls = Array.isArray(input.sameAsUrls) ? input.sameAsUrls : [];
  const sameAsCount = sameAsUrls.length;

  const bingVerificationMetaFound = /<meta[^>]+name=["']msvalidate\.01["']/i.test(html);
  const renderedTextLength = extractVisibleText(html).length;
  const clientRenderedShell = isCustomCoded && renderedTextLength < THIN_TEXT_THRESHOLD;
  const brandNameCandidate = extractBrandName(html, input.url);

  let score = 100;
  const recommendations: string[] = [];
  const summaryParts: string[] = [];

  // --- 1. Non-JS render test (the fatal one) -------------------------------
  if (clientRenderedShell) {
    score = Math.min(score, 15);
    recommendations.push(
      `CRITICAL: AI answer engines do not run JavaScript, and your server returns only ~${renderedTextLength} characters of visible text — the content is client-rendered, so ChatGPT, Claude, Perplexity, and Gemini see a near-empty page. Server-render (SSR) or prerender this page so the full content is in the initial HTML. (This is exactly what a curl / bot user-agent fetch returns.)`
    );
    summaryParts.push('AI bots receive a near-empty page — the content is rendered client-side (JavaScript), which answer engines do not execute.');
  } else if (renderedTextLength < THIN_TEXT_THRESHOLD) {
    // Not obviously a custom SPA, but still thin — worth a softer flag.
    score = Math.min(score, 60);
    recommendations.push(
      `The server-rendered HTML carries only ~${renderedTextLength} characters of visible text. Confirm a JS-less fetch (curl as a bot user-agent) returns your full content — if it does not, answer engines cannot read it.`
    );
    summaryParts.push('The server HTML is unusually thin; verify a non-JS fetch returns full content.');
  }

  // --- 2. Bing Webmaster verification --------------------------------------
  if (!bingVerificationMetaFound) {
    score = Math.max(0, score - 15);
    recommendations.push(
      'No on-page Bing site-verification signal (`msvalidate.01`) was found. Bing indexes feed BOTH Perplexity and ChatGPT search, making Bing Webmaster Tools verification the highest-leverage, most-neglected AEO action. If you have not verified this site in Bing Webmaster Tools (bing.com/webmasters), do so — it is free. (Note: verification via DNS or an XML file is not visible from the page, so disregard this if already verified.)'
    );
    summaryParts.push('No on-page Bing verification signal detected.');
  }

  // --- 3. Entity disambiguation & third-party authority --------------------
  const brandLabel = brandNameCandidate ? `"${brandNameCandidate}"` : 'your brand';
  if (sameAsCount === 0) {
    score = Math.max(0, score - 15);
    recommendations.push(
      `No \`sameAs\` profile links were found on the page, so an AI engine cannot resolve ${brandLabel} to a single authoritative entity (it may collide with similarly-named entities). Add \`sameAs\` links in your Organization/Person schema to every controlled profile you own (LinkedIn, X, GitHub, Crunchbase, Wikipedia if present), and use the full disambiguated name in structured data (e.g. "Brand by Publisher").`
    );
    recommendations.push(
      `Third-party authority: answer engines weight INDEPENDENT citations, not just your own pages. Aim for 2–3 listings on independent sources in your category (industry directories, podcasts, guest posts). The live, search-backed version of this gap report — which independent domains engines actually cite for your queries — ships with the citation sweeps.`
    );
    summaryParts.push('No controlled-profile sameAs links found — entity disambiguation is weak.');
  } else if (sameAsCount < 3) {
    score = Math.max(0, score - 6);
    recommendations.push(
      `Only ${sameAsCount} \`sameAs\` profile link${sameAsCount === 1 ? '' : 's'} found. Add the remaining controlled profiles (LinkedIn, X, GitHub, Crunchbase) so engines can cross-confirm ${brandLabel} as one entity, and pursue 2–3 INDEPENDENT third-party citations for category-query authority.`
    );
    summaryParts.push(`${sameAsCount} sameAs profile link(s) present — entity graph could be stronger.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status: IndexCoverageResult['status'] = clientRenderedShell
    ? 'critical'
    : recommendations.length > 0
      ? 'warn'
      : 'ok';

  if (summaryParts.length === 0) {
    summaryParts.push('Index-coverage checks passed: content is in the server HTML, a Bing verification signal is present, and the entity has controlled-profile links.');
  }

  return {
    bingVerificationMetaFound,
    renderedTextLength,
    isCustomCoded,
    clientRenderedShell,
    brandNameCandidate,
    sameAsCount,
    score,
    status,
    summary: summaryParts.join(' '),
    recommendations,
  };
}
