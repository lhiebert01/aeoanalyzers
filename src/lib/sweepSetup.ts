// Sweep setup (Nov 22 2026, from the usesignalatlas.com sweep): build the suggested category,
// competitors and questions from what makes the site different, and check the setup in plain
// English before a customer pays for a sweep with the wrong questions.
//
// Import-free: the browser (SweepDashboard), the free name check (api/name-check) and the tests use it.
// Deterministic. The two model calls that draft the category and questions live in the dashboard;
// this module prepares their input and checks their output.

// ─── Branded questions ───────────────────────────────────────────────────────────────────────────

/** "What is Signal Atlas (usesignalatlas.com)?" — the brand name with the domain in brackets, so an
 *  engine looks up THIS product, not the first thing with the name. Never "who is example.com". */
export function brandedQuestions(brand: string, domain: string): string[] {
  const b = String(brand || '').trim();
  const d = String(domain || '').trim();
  if (!b && !d) return [];
  const name = b && d ? `${b} (${d})` : b || d;
  return [`What is ${name}?`, `Who makes ${name}?`];
}

/** A branded question that treats the website as a person or omits the brand name. */
export function weakBrandedQuestion(q: string, brand: string, domain: string): string | null {
  const s = String(q || '').trim();
  const d = String(domain || '').toLowerCase();
  if (d && new RegExp(`^who\\s+(?:is|are|owns|runs)\\s+${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s)) return 'asks who a website is';
  if (brand && !s.toLowerCase().includes(brand.toLowerCase()) && d && s.toLowerCase().includes(d)) return 'uses the website address without the brand name';
  return null;
}

// ─── Words the site must say first ───────────────────────────────────────────────────────────────

export const BUDGET_WORDS = ['affordable', 'cheaper', 'cheapest', 'cheap', 'budget', 'low-cost', 'low cost', 'inexpensive', 'free'];
export const AUDIENCE_WORDS = ['startups', 'startup', 'agencies', 'agency', 'small business', 'small businesses', 'small teams', 'small team', 'enterprises', 'enterprise', 'freelancers', 'smbs', 'smb', 'solopreneurs'];

const wordRx = (w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]+')}(?=$|[^a-z])`, 'i');

/** Budget or audience words in a question that the site itself never uses. */
export function unsupportedWords(question: string, siteText: string): { word: string; kind: 'budget' | 'audience' }[] {
  const site = String(siteText || '').toLowerCase();
  const out: { word: string; kind: 'budget' | 'audience' }[] = [];
  for (const [kind, list] of [['budget', BUDGET_WORDS], ['audience', AUDIENCE_WORDS]] as const) {
    for (const w of list) {
      if (!wordRx(w).test(question) || wordRx(w).test(site)) continue;
      if (out.some((o) => o.word.includes(w) || w.includes(o.word))) continue;
      out.push({ word: w, kind });
    }
  }
  return out;
}

/** The question with an unsupported word taken out (and the phrase it hung on, e.g. "for startups"). */
export function removeWord(question: string, word: string): string {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]+');
  return String(question)
    .replace(new RegExp(`\\s+(?:for|to|aimed at|built for)\\s+(?:a\\s+|an\\s+)?${w}(?:\\s+(?:teams?|owners?|companies))?\\b`, 'i'), '')
    .replace(new RegExp(`\\b(?:an?\\s+)?${w}\\s+`, 'i'), (m) => (/^an?\s/i.test(m) ? 'a ' : ''))
    .replace(new RegExp(`\\b${w}\\b`, 'i'), '')
    .replace(/\s{2,}/g, ' ').replace(/\s+([,?.])/g, '$1').trim();
}

// ─── Procedure questions ─────────────────────────────────────────────────────────────────────────

const PROCEDURE = /^(?:how\s+(?:to|do\s+i|do\s+you|can\s+i|should\s+i)|what(?:'s| is)\s+the\s+best\s+way\s+to|steps\s+to)\s+/i;

/** "how to …" questions: engines usually answer with steps and name no product. */
export function isProcedureQuestion(q: string): boolean {
  return PROCEDURE.test(String(q || '').trim());
}

/** The same need, asked as a recommendation: "how to find X" → "best tool to find X". */
export function rephraseProcedure(q: string): string {
  return String(q || '').trim().replace(PROCEDURE, 'best tool to ');
}

// ─── What the site says about itself ─────────────────────────────────────────────────────────────

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const strip = (html: string) => decode(String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const hostOf = (u: string) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const NOT_A_SOURCE = /(^|\.)(facebook|twitter|x|linkedin|instagram|youtube|tiktok|github|google|apple|stripe|vercel|cloudflare|gstatic|googleapis|pinterest|reddit|medium|substack|wikipedia|w3|schema)\.(com|org|net|io|app)$|(^|\.)x\.com$/;

/** Section headings that carry what makes a site different: who it serves, what sets it apart,
 *  how it works, its features and its sources. */
const KEY_SECTION = /\b(who|built for|for (?:teams|people|analysts|developers)|use cases?|what makes|different|why|how it works|features?|benefits|sources|directory|integrations?|data|pricing|about)\b/i;

export interface SiteDigest {
  /** Everything the pages say, as plain text (for "does the site itself say it?" checks). */
  text: string;
  /** A compact digest for the model: title, description, headings and the key sections. */
  digest: string;
  /** Names and hosts of the external sources the site links to (never suggested as competitors). */
  usedSources: string[];
}

/** Read one or more of the site's own pages into a digest. `ownDomain` and `parentDomains` are
 *  excluded from the sources (a link to the parent company is not a data source). */
export function siteDigest(pages: { url: string; html: string }[], ownDomain: string, parentDomains: string[] = []): SiteDigest {
  const own = String(ownDomain || '').toLowerCase().replace(/^www\./, '');
  const skip = new Set([own, ...parentDomains.map((d) => d.toLowerCase())]);
  const texts: string[] = [];
  const parts: string[] = [];
  const sources = new Map<string, string>();
  for (const { url, html } of pages) {
    const h = String(html || '');
    const text = strip(h);
    texts.push(text);
    const title = decode((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
    const desc = decode((h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] || '').trim();
    parts.push(`PAGE ${url}`);
    if (title) parts.push(`Title: ${title}`);
    if (desc) parts.push(`Description: ${desc}`);
    // Each heading with the text that follows it, up to the next heading. The sections that say who
    // the product serves, what sets it apart and how it works come first, so they survive the cut.
    const blocks = h.split(/(?=<h[1-3][\s>])/i).slice(1);
    const key: string[] = [], rest: string[] = [];
    for (const b of blocks) {
      const head = strip((b.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) || [])[1] || '');
      if (!head) continue;
      const isKey = KEY_SECTION.test(head);
      const body = strip(b.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/i, '')).slice(0, isKey ? 700 : 160);
      (isKey ? key : rest).push(`## ${head}${body ? `\n${body}` : ''}`);
    }
    parts.push(...key, ...rest);
    // External links: the sources a product names and links to.
    for (const m of h.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const host = hostOf(m[1]);
      if (!host || skip.has(host) || [...skip].some((s) => s && host.endsWith(`.${s}`)) || NOT_A_SOURCE.test(host)) continue;
      // A link's own text names the source unless it is a call to action or a live item ("M 4.9 · …").
      const label = strip(m[2]).replace(/\s*↗\s*$/, '');
      const ok = label && label.split(' ').length <= 5 && !/\d|·/.test(label) && !/^(open|see|visit|link|here|more|view|read)\b/i.test(label);
      if (!sources.has(host) || (!sources.get(host) && ok)) sources.set(host, ok ? label : '');
    }
  }
  // Card-style listings: "World Bank Open Data data.worldbank.org" (name followed by its host).
  const all = texts.join(' ');
  for (const host of sources.keys()) {
    if (sources.get(host)) continue;
    const m = all.match(new RegExp(`([A-Z][\\w&|'.-]*(?:\\s+(?:[A-Z&|][\\w&|'.-]*|in|of|and|the|for|de|du)){0,5})\\s+\\(?(?:www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    if (m) sources.set(host, m[1]);
  }
  const usedSources = [...sources.entries()].flatMap(([h, n]) => (n ? [n, h] : [h]));
  return { text: all, digest: parts.join('\n').slice(0, 9000), usedSources };
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]/g, '');

/** Is this suggested competitor one of the sources the product itself uses? */
export function isUsedSource(competitor: string, usedSources: string[]): boolean {
  const c = norm(String(competitor).split(',')[0]);
  if (c.length < 3) return false;
  return usedSources.some((s) => {
    const n = norm(s);
    const stem = n.replace(/(com|org|net|io|gov|edu|app|co|ai)$/, '');
    return n === c || stem === c || (c.length >= 5 && (n.startsWith(c) || c.startsWith(stem) && stem.length >= 5));
  });
}

// ─── The setup check ─────────────────────────────────────────────────────────────────────────────

export type SetupFix =
  | { kind: 'replaceBranded'; questions: string[] }
  | { kind: 'replaceQuestion'; index: number; question: string }
  | { kind: 'removeCompetitor'; name: string };

export interface SetupIssue {
  id: string;
  level: 'fix' | 'warn' | 'note';
  title: string;
  detail: string;
  fix?: SetupFix;
  fixLabel?: string;
}

export interface NameCollision { name: string; where: string; kind: 'domain' | 'repository' | 'common-words' }

export interface SetupInput {
  brand: string;
  domain: string;
  category: string;
  competitors: string[];
  brandedQuestions: string[];
  buyerQuestions: string[];
  siteText: string;
  usedSources: string[];
  collisions?: NameCollision[];
}

/** Plain-English problems with a sweep setup, each with a suggested fix. Free: no model call. */
export function setupCheck(inp: SetupInput): SetupIssue[] {
  const out: SetupIssue[] = [];
  const brand = inp.brand.trim();
  const domain = inp.domain.trim();

  if (inp.collisions?.length) {
    const list = inp.collisions.slice(0, 5).map((c) => c.where).join(', ');
    out.push({ id: 'collision', level: 'warn', title: `Other products are also called ${brand || 'this name'}`,
      detail: `We found ${list}. When buyers ask about ${brand}, engines may describe one of these instead of you, and a sweep will measure that confusion. Before you run, help engines tell you apart: ask about "${brand} (${domain})" (we do this below), describe what ${brand} is in one sentence at the top of your homepage, add that sentence and links to your official profiles to your homepage's structured data (disambiguatingDescription and sameAs), and list ${brand} on the directories engines read (our free guides: Directory listings and Wikidata).` });
  }

  const weak = inp.brandedQuestions.map((q) => weakBrandedQuestion(q, brand, domain)).filter(Boolean);
  if ((weak.length || !inp.brandedQuestions.length) && (brand || domain)) {
    const fixed = brandedQuestions(brand, domain);
    out.push({ id: 'branded', level: 'fix', title: 'Ask about your company by name',
      detail: inp.brandedQuestions.length ? `A question ${weak[0]}. Engines answer more reliably when the question names your brand with your website in brackets.` : 'There are no questions about your company.',
      fix: { kind: 'replaceBranded', questions: fixed }, fixLabel: `Use "${fixed[0]}"` });
  }

  inp.buyerQuestions.forEach((q, index) => {
    const words = unsupportedWords(q, inp.siteText);
    let fixedQ = q;
    if (words.length) {
      for (const u of words) fixedQ = removeWord(fixedQ, u.word);
      const budget = words.filter((u) => u.kind === 'budget').map((u) => `"${u.word}"`);
      const aud = words.filter((u) => u.kind === 'audience').map((u) => `"${u.word}"`);
      const said = [...budget, ...aud].join(' and ');
      out.push({ id: `word-${index}`, level: 'fix',
        title: `Your site does not say ${said}`,
        detail: `"${q}" ${budget.length ? 'competes on price' : ''}${budget.length && aud.length ? ' and ' : ''}${aud.length ? `is aimed at ${aud.join(' and ')}` : ''}, but your own pages never say so. Engines will answer for that buyer, not yours.`,
        fix: { kind: 'replaceQuestion', index, question: fixedQ }, fixLabel: `Change to "${fixedQ}"` });
    }
    if (isProcedureQuestion(fixedQ)) {
      const fixed = rephraseProcedure(fixedQ);
      out.push({ id: `procedure-${index}`, level: 'warn', title: 'A "how to" question rarely names a product',
        detail: `"${q}" is a procedure question. Engines usually answer it with steps and name no product, so it almost always scores zero for everyone. Keep it only if you want to see the steps engines give.`,
        fix: { kind: 'replaceQuestion', index, question: fixed }, fixLabel: `Ask "${fixed}" instead` });
    }
  });

  for (const c of inp.competitors) {
    const name = String(c).split(',')[0].trim();
    if (name && isUsedSource(name, inp.usedSources)) {
      out.push({ id: `source-${name}`, level: 'fix', title: `${name} is one of your sources`,
        detail: `Your site lists ${name} as a source it uses. A source you build on is not a competitor buyers choose instead of you.`,
        fix: { kind: 'removeCompetitor', name }, fixLabel: `Remove ${name}` });
    }
  }
  if (!inp.competitors.length) {
    out.push({ id: 'no-competitors', level: 'note', title: 'No competitors yet',
      detail: 'Without competitors the sweep still shows who engines name instead of you, but it cannot ask "alternatives to …" questions. Add two or three products buyers compare you with.' });
  }
  if (!inp.category.trim()) {
    out.push({ id: 'no-category', level: 'warn', title: 'Say what you are in a few words',
      detail: 'The category is how we check that engines describe your product and not another with the same name. Use the words your own site uses.' });
  }
  return out;
}

// ─── Model prompts (input built from the site's own pages) ───────────────────────────────────────

export const EXTRACT_PROMPT = (digest: string) => `From this website's own pages, extract what makes this product different. Use the site's own words; do not invent anything the pages do not say.
Return JSON:
{"brand": "the product name",
 "core_category": "what it is, 3 to 8 words, in the site's own terms (not a generic segment)",
 "differentiators": ["up to 5 short phrases: features, sources, or proof points the site states"],
 "audiences": ["only the customer types the site itself names; empty if it names none"],
 "competitors": ["up to 5 products an AI answer engine would most often recommend to the same buyer for this exact need, names only; never a data source or tool the site says it uses or links to; empty rather than a guess"]}

WEBSITE PAGES:
"""
${digest}
"""`;

export const QUESTIONS_PROMPT = (p: { category: string; differentiators: string[]; audiences: string[]; competitors: string[]; sources: string[] }) => `Write 10 questions a buyer would type into an AI assistant when looking for a product like this one. Do NOT use the product's name.

What it is: ${p.category}
What makes it different (the site's own words): ${p.differentiators.join('; ') || '(not stated)'}
Customer types the site names: ${p.audiences.join(', ') || '(none named)'}
Products buyers compare it with: ${p.competitors.join(', ') || '(none)'}
Sources it uses (topics a buyer may ask about, never competitors): ${p.sources.slice(0, 12).join(', ') || '(none listed)'}

Rules:
- Build every question from what makes it different, not from a generic segment.
- Ask for recommendations ("best tool that …", "which research tools …", "alternatives to X that …"). Do not write "how to …" questions: engines answer those with steps and name no product.
- Never use budget words (affordable, cheaper, cheap, budget, free, low-cost) or customer types (startups, agencies, small business, enterprise, freelancers) unless they appear above as words the site itself uses.
- Up to 3 "alternatives to {competitor}" questions, only for the competitors listed.
- Plain buyer language, no internal jargon. No location.
Return JSON: {"sweep_queries":[{"intent_type":"Discovery|Problem|Comparative","query":"..."}]}`;
