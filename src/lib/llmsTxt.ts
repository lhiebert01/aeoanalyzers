// WO-QA-003 E3 — llms.txt / llms-full.txt generator + spec validator + drift-diff.
//
// Companion to the existing llms.txt work. The llmstxt.org format is an H1 entity
// title, a blockquote summary, then H2-grouped prioritized Markdown links with
// short context lines; llms-full.txt is the concatenated full text of the priority
// pages. AI-native buyers and coding agents increasingly check for both.
//
// Deterministic + self-contained. Generation, spec validation, and a drift-diff
// against the LIVE-served file (audit what is served, not repo config — ADDENDUM-002).

export interface LlmsLink { name: string; url: string; context?: string }
export interface LlmsSection { heading: string; links: LlmsLink[] }
export interface LlmsDoc { title: string; summary: string; sections: LlmsSection[] }

/** Render a spec-compliant llms.txt from a structured doc. */
export function renderLlmsTxt(doc: LlmsDoc): string {
  const out: string[] = [`# ${doc.title.trim()}`, '', `> ${doc.summary.trim()}`, ''];
  for (const s of doc.sections) {
    if (!s.links.length) continue;
    out.push(`## ${s.heading.trim()}`);
    for (const l of s.links) out.push(`- [${l.name.trim()}](${l.url.trim()})${l.context ? `: ${l.context.trim()}` : ''}`);
    out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Render llms-full.txt: the concatenated full text of the priority pages. */
export function renderLlmsFullTxt(title: string, pages: { title: string; url: string; text: string }[]): string {
  const out: string[] = [`# ${title.trim()}`, ''];
  for (const p of pages) {
    out.push(`## ${p.title.trim()}`, `Source: ${p.url.trim()}`, '', p.text.trim(), '', '---', '');
  }
  return out.join('\n').trim() + '\n';
}

export interface LlmsValidation { valid: boolean; issues: string[] }

/** Validate text against the llmstxt.org structure: an H1 first, a blockquote
 *  summary, and at least one H2 section carrying at least one Markdown link. */
export function validateLlmsTxt(text: string): LlmsValidation {
  const lines = String(text || '').split('\n');
  const issues: string[] = [];
  const firstContent = lines.find((l) => l.trim());
  if (!firstContent || !/^#\s+\S/.test(firstContent)) issues.push('Must start with an H1 title ("# Name").');
  if (!lines.some((l) => /^>\s+\S/.test(l))) issues.push('Missing the blockquote summary ("> …") after the title.');
  const hasH2 = lines.some((l) => /^##\s+\S/.test(l));
  if (!hasH2) issues.push('No H2 sections ("## …").');
  const hasLink = lines.some((l) => /^-\s+\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(l));
  if (!hasLink) issues.push('No Markdown links ("- [Name](https://…)").');
  return { valid: issues.length === 0, issues };
}

/** Extract the link URLs and H2 headings from an llms.txt for diffing. */
function keysOf(text: string): { headings: Set<string>; urls: Set<string> } {
  const headings = new Set<string>();
  const urls = new Set<string>();
  for (const l of String(text || '').split('\n')) {
    const h = l.match(/^##\s+(.+)$/);
    if (h) headings.add(h[1].trim().toLowerCase());
    const u = l.match(/\((https?:\/\/[^)]+)\)/);
    if (u) urls.add(u[1].trim().replace(/\/$/, '').toLowerCase());
  }
  return { headings, urls };
}

export interface LlmsDiff {
  identical: boolean;
  urlsOnlyInGenerated: string[]; // links you'd add
  urlsOnlyInLive: string[];      // links the live file has that the generated doesn't
  headingsChanged: boolean;
}

/** Drift-diff the generated llms.txt against the LIVE-served file. `live` null/empty
 *  means the site serves no llms.txt (everything is "only in generated"). */
export function diffLlmsTxt(generated: string, live: string | null | undefined): LlmsDiff {
  const g = keysOf(generated);
  const l = keysOf(live || '');
  const urlsOnlyInGenerated = [...g.urls].filter((u) => !l.urls.has(u));
  const urlsOnlyInLive = [...l.urls].filter((u) => !g.urls.has(u));
  const headingsChanged = [...g.headings].some((h) => !l.headings.has(h)) || [...l.headings].some((h) => !g.headings.has(h));
  return {
    identical: urlsOnlyInGenerated.length === 0 && urlsOnlyInLive.length === 0 && !headingsChanged,
    urlsOnlyInGenerated, urlsOnlyInLive, headingsChanged,
  };
}

// ── Best-effort extraction of an llms.txt doc from a crawled homepage ─────────

/** Decode the handful of HTML entities that show up in titles/descriptions. */
function decodeEntities(s: string): string {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, '’').replace(/&nbsp;/g, ' ');
}

function metaContent(html: string, key: string): string | null {
  const m = String(html || '').match(new RegExp(`<meta[^>]+(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i'));
  const raw = m ? (m[0].match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? null) : null;
  return raw === null ? null : decodeEntities(raw);
}

/** Build a first-pass LlmsDoc from a homepage's HTML: title from og:site_name /
 *  <title>, summary from the meta description, and internal links as one section.
 *  A starting point a human refines — not authoritative. */
export function extractLlmsDoc(html: string, domain: string): LlmsDoc {
  const h = String(html || '');
  const title = metaContent(h, 'og:site_name') || h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/[|–—·:]/)[0]?.trim() || domain;
  const summary = metaContent(h, 'description') || metaContent(h, 'og:description') || `Key pages for ${domain}.`;
  const origin = `https://${domain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
  const seen = new Set<string>();
  const links: LlmsLink[] = [];
  for (const m of h.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1].trim();
    const name = decodeEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!name || name.length > 60) continue;
    if (href.startsWith('/')) href = origin + href;
    if (!/^https?:\/\//.test(href)) continue;
    const host = href.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!host.includes(domain.replace(/^www\./, '').split('/')[0])) continue; // internal only
    const key = href.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ name, url: href });
    if (links.length >= 20) break;
  }
  return { title, summary, sections: [{ heading: 'Pages', links }] };
}
