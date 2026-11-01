// WO-AEO-FIX-IT-PLAYBOOK-015 — every Citation Sweep ends with the customer's own step-by-step plan.
//
// Measure. Act. Record. The plan promises steps, never outcomes. Deterministic and LLM-free: every
// line re-expresses stored data (the sweep's runs, Source coverage, the site's own facts, the AEO
// Score, the Search Console table, the Record). Unknown contact routes print "Fill in:". Vendor
// pages appear only as data rows. Rendered by sweepReport (Markdown -> screen, Word, PDF) and by the
// WO-014 guide, from this one structure, so the order and wording match everywhere.
import { normalizeDomain, type SweepRunResult } from './citationSweep';
import { tierForDomain } from './authorityTiers';
import { answerShape } from './sweepActions';
import { comparesTwoNamed } from './sweepActions';
import { classifyRunFidelity } from './fidelity';
import type { TruthRecord } from './truthRecord';
import { isGroundingRedirect, type SourceCoverage, type CoverageRow } from './sourceCoverage';
import type { OwnerTag, WatchFigure } from './ownerTags';
import type { SearchStanding } from './searchStanding';
import { BAND_LABEL, FAR_LINE, NO_EXPORT_LINE, EXPORT_STEPS } from './searchStanding';
import catalogJson from '../data/directories-catalog.json';

export const FILL = 'Fill in:';
export const VENDOR_LINE = 'Written by a company that sells in your category. It is unlikely to add you; listed so you know where the answer comes from.';
export const SITE_READY_LINE = 'Your site is ready to be cited. Further site work is unlikely to change your recommendation figure.';
export const NO_SOURCE_LINE = 'source not found in cited pages; the engine may be repeating older training data';
export const NOT_CITED_LABEL = 'not cited in your answers this month';

export type Lane = 0 | 1 | 2 | 3 | 4;
export const LANE_TITLE: Record<Lane, string> = {
  0: 'Lane 0 — Where you stand in the searches the engines run',
  1: 'Lane 1 — Do this week (self-serve)',
  2: 'Lane 2 — Publish where the engines read',
  3: 'Lane 3 — Pitch the independent pages',
  4: 'Lane 4 — Your own site',
};

export interface PlanStep {
  key: string; lane: Lane; owner: OwnerTag; title: string; lines: string[];
  minutes: number; doneWhen: string; nextSweepShows: string; watch: WatchFigure;
}
export interface PitchRow { url: string; host: string; title: string | null; timesCited: number; byline: string | null; contact: string; note: string[] }
export interface VendorRow { url: string; host: string; timesCited: number }
export type CoverageKind = 'self-serve' | 'independent' | 'vendor-owned';
export interface ClassifiedRow { url: string; host: string; kind: CoverageKind; rule: string }

export interface FixItPlan {
  diagnosis: { line: string; rule: string };
  oneNextStep: { title: string; why: string } | null;
  lane0: { standing: SearchStanding | null; lines: string[] };
  steps: PlanStep[];
  pitch: PitchRow[];
  vendors: VendorRow[];
  classification: ClassifiedRow[];
  movingFirst: { label: string; then: string; now: string; dir: 'up' | 'down' | 'unchanged' }[];
  differentiator: string[];
}

export interface PlanInput {
  domain: string;
  brand?: string | null;
  runs: SweepRunResult[];
  /** Vendors in the category: entered competitors and every vendor the answers named, with domains. */
  vendors: { name: string; domain?: string }[];
  truth?: TruthRecord | null;
  coverage?: SourceCoverage | null;
  /** The domain's latest AEO Score and its handoff checklist. */
  score?: { score: number; checklist?: { category: string; action: string; priority: string }[] } | null;
  standing?: SearchStanding | null;
  /** Business type for the catalog fallback (WO-014). */
  businessType?: string | null;
  /** Last month's figures, for "Moving first". */
  previous?: { coverageNamed?: number | null; byNameSources?: string[]; standing?: SearchStanding | null; differentiatorRate?: number | null } | null;
  differentiatorRate?: number | null;
  ownedDomains?: string[];
}

// ── classification (WO-015 §2 Lane 3 rule) ─────────────────────────────────────────────────
const reg = (h: string) => { const p = normalizeDomain(h).split('.'); return p.length <= 2 ? p.join('.') : p.slice(-2).join('.'); };
/** Open publishing hosts: the customer can publish there under their own name (Lane 2). */
export const OPEN_PUBLISHING = ['dev.to', 'medium.com', 'substack.com', 'hashnode.com', 'hashnode.dev', 'github.com', 'linkedin.com'];
/** Directories and review sites where a business lists itself (beyond the attainability registry). */
export const SELF_LISTING = ['yelp.com', 'houzz.com', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com', 'bbb.org', 'nextdoor.com', 'yellowpages.com', 'tripadvisor.com', 'facebook.com', 'google.com', 'bing.com', 'apple.com', 'capterra.com', 'getapp.com', 'softwareadvice.com', 'alternativeto.net', 'sourceforge.net', 'slashdot.org', 'producthunt.com', 'trustpilot.com', 'crunchbase.com', 'g2.com'];
export function classifyHost(host: string, vendorDomains: string[], sellsProduct = false, pageRead = false, software = true): { kind: CoverageKind; rule: string } {
  const r = reg(host);
  // A directory or review site where the business lists itself is self-serve, even when the
  // answers name it like a competitor (Houzz and Angi for a pool builder).
  if (SELF_LISTING.includes(r) || OPEN_PUBLISHING.includes(r)) return { kind: 'self-serve', rule: OPEN_PUBLISHING.includes(r) ? `${r} is an open publishing platform` : `${r} is a directory or listing you create yourself` };
  const v = vendorDomains.find((d) => reg(d) === r);
  // Founder ruling (1 Nov 2026): an agency counts as independent unless it sells its own tool. A
  // company named in the answers whose own pages show no self-serve product reads as an agency.
  if (software && v && pageRead && !sellsProduct) return { kind: 'independent', rule: `${r} is named in your answers, but its own site shows no self-serve product (an agency or publisher)` };
  if (v) return { kind: 'vendor-owned', rule: `${r} belongs to a product in your category (named in your answers)` };
  if (OPEN_PUBLISHING.includes(r) || OPEN_PUBLISHING.includes(normalizeDomain(host))) return { kind: 'self-serve', rule: `${r} is an open publishing platform` };
  if (tierForDomain(host).tier === 'now') return { kind: 'self-serve', rule: `${r} is a listing or profile you create yourself` };
  // The software-product signal means "sells in your category" only when your category is software.
  if (software && sellsProduct) return { kind: 'vendor-owned', rule: `${r} sells a self-serve software product (trial, sign-up or app links on the page)` };
  return { kind: 'independent', rule: `${r} is an independent publisher (an editor or author decides)` };
}

/** No price ever appears in the plan, including inside other sites' page titles (WO-015 §4). */
export const noPrice = (t: string) => t.replace(/,?\s*(from\s+)?[$€£]\s?\d[\d,.]*(\s?\/\s?(mo|month|yr|year))?/gi, (m) => (/from/i.test(m) ? '' : ' [a price]')).replace(/\s{2,}/g, ' ').trim();
/** Tracking parameters are not part of a page's address. */
export const cleanUrl = (u: string) => { try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => /^utm_/i.test(k)).forEach((k) => x.searchParams.delete(k)); return x.toString().replace(/\?$/, ''); } catch { return u; } };

// ── helpers ───────────────────────────────────────────────────────────────────────────────
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : null);
const engineLabel: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', grok: 'Grok' };
const hostOf = (u: string) => { try { return normalizeDomain(new URL(u).hostname); } catch { return ''; } };
const usable = (r: SweepRunResult) => !r.truncated && !(r as any).errored && !String(r.transcript || '').startsWith('[error');

/** Hosts cited in the category answers, with counts and engines. */
/** Hosts cited in the category answers (the gate), with category counts, counts across all
 *  answers, and engines. Unresolved search-redirect links are skipped, never counted as a host. */
export function citedHosts(runs: SweepRunResult[], own: string[]): { host: string; times: number; all: number; engines: string[] }[] {
  const m = new Map<string, { times: number; all: number; engines: Set<string> }>();
  for (const r of runs.filter((x) => usable(x))) {
    const seen = new Set<string>();
    for (const s of r.sources || []) {
      if (isGroundingRedirect(s)) continue;
      const h = hostOf(s); if (!h || seen.has(h) || own.some((o) => reg(o) === reg(h))) continue; seen.add(h);
      const e = m.get(h) ?? { times: 0, all: 0, engines: new Set<string>() }; e.all++;
      if (r.queryType === 'category') { e.times++; e.engines.add(r.engine); }
      m.set(h, e);
    }
  }
  return [...m.entries()].filter(([, e]) => e.times > 0).map(([host, e]) => ({ host, times: e.times, all: e.all, engines: [...e.engines].map((x) => engineLabel[x] || x) })).sort((a, b) => b.times - a.times || a.host.localeCompare(b.host));
}
const matchesCatalogHost = (host: string, catHost: string) => { const h = normalizeDomain(host), c = normalizeDomain(catHost); return h === c || h.endsWith('.' + c); };

function figures(inp: PlanInput) {
  const br = inp.runs.filter((r) => r.queryType === 'branded' && usable(r));
  const cat = inp.runs.filter((r) => r.queryType === 'category' && usable(r) && r.grounding !== 'model-prior');
  const found = br.filter((r) => r.domainCited).length;
  let accurate = 0, named = 0;
  if (inp.truth) for (const r of br) { const f = classifyRunFidelity(!!r.cited, r.transcript || '', inp.truth); if (f.state === 'cited-accurate') { accurate++; named++; } else if (f.state === 'cited-drifted') named++; }
  const rec = cat.filter((r) => r.domainCited).length;
  return { foundPct: pct(found, br.length), found, foundN: br.length, accPct: named ? pct(accurate, named) : null, accurate, named, recPct: pct(rec, cat.length), rec, recN: cat.length };
}

/** WO-015 diagnosis rules, in order (extends the 90% rule of the Do-now plan). */
export function diagnose(f: { foundPct: number | null; accPct: number | null; recPct: number | null }): { line: string; rule: string } {
  if (f.foundPct !== null && f.foundPct < 90) return { line: "Engines don't reliably find you yet", rule: `found by name ${f.foundPct}% (below 90%)` };
  if (f.accPct !== null && f.accPct < 90) return { line: 'Engines find you but say things that are wrong', rule: `found by name ${f.foundPct}%, described accurately ${f.accPct}% (below 90%)` };
  if (f.recPct !== null && f.recPct < 10) return { line: "Engines know you but don't recommend you: the next steps are off your site", rule: `found by name ${f.foundPct}% and accurate ${f.accPct ?? '—'}%, recommended ${f.recPct}% (below 10%)` };
  return { line: 'Keep measuring; work the lanes in order.', rule: 'no threshold crossed' };
}

/** The wrong claims, with the engine's exact wording and the likely source: a page (not yours)
 *  cited in EVERY answer that made the claim. Otherwise the plain "source not found" line. */
export function wrongClaims(inp: PlanInput) {
  if (!inp.truth) return [];
  const own = [inp.domain, ...(inp.ownedDomains || [])];
  const byKey = new Map<string, { wrong: string; detail: string; engines: Set<string>; runs: SweepRunResult[] }>();
  for (const r of inp.runs.filter((x) => x.queryType === 'branded' && usable(x))) {
    const f = classifyRunFidelity(!!r.cited, r.transcript || '', inp.truth);
    if (f.state !== 'cited-drifted') continue;
    for (const i of f.issues) {
      if (i.severity !== 'high') continue;
      const k = `${i.type}|${(i.wrong || '').toLowerCase()}`;
      const e = byKey.get(k) ?? { wrong: i.wrong || i.field, detail: i.detail, engines: new Set<string>(), runs: [] };
      e.engines.add(r.engine); e.runs.push(r); byKey.set(k, e);
    }
  }
  return [...byKey.values()].map((e) => {
    const counts = new Map<string, number>();
    for (const r of e.runs) for (const u of new Set((r.sources || []).map((s) => s.split('#')[0]))) { const h = hostOf(u); if (!h || own.some((o) => reg(o) === reg(h))) continue; counts.set(u, (counts.get(u) || 0) + 1); }
    const everywhere = [...counts.entries()].filter(([, n]) => n === e.runs.length).map(([u]) => u);
    const price = /[$€£]\s?\d/.test(e.wrong) || /price/i.test(e.detail);
    return { wrong: price ? 'a price that is no longer on your pricing page' : e.wrong, detail: noPrice(e.detail), times: e.runs.length, engines: [...e.engines].map((x) => engineLabel[x] || x), source: everywhere[0] || null };
  }).reduce((acc, w) => { const x = acc.find((y) => y.wrong === w.wrong); if (x) { x.times = Math.max(x.times, w.times); x.engines = [...new Set([...x.engines, ...w.engines])]; } else acc.push(w); return acc; }, [] as { wrong: string; detail: string; times: number; engines: string[]; source: string | null }[]).sort((a, b) => b.times - a.times);
}

/** A byline that reads as a person's name (two or three capitalized words, not an organization). */
const person = (b?: string | null) => { const t = String(b || '').trim(); return /^[A-Z][a-z'’-]+( [A-Z][a-z'’.-]+){1,2}$/.test(t) && !/\b(Team|Staff|Editors?|Contributors?|Blog|Inc|LLC|Labs)\b/.test(t) ? t.split(' ')[0] : null; };

/** Two short paragraphs offering the writer a fact, built only from the site's own facts. */
function pitchNote(inp: PlanInput, row: CoverageRow): string[] {
  const name = inp.brand || inp.truth?.brandName || inp.domain;
  const desc = (inp.truth?.site?.ldDescription || inp.truth?.site?.metaDescription) || null;
  const title = noPrice(row.title || 'your page');
  return [
    `Hello${person(row.byline) ? ` ${person(row.byline)}` : ''}, I read "${title}". ${desc ? (desc.toLowerCase().startsWith(String(name).toLowerCase()) ? `${desc.replace(/\.$/, '')} (${inp.domain}).` : `${name} (${inp.domain}): ${desc.replace(/\.$/, '')}.`) : `${name} (${inp.domain}): ${FILL} one sentence on what it does, from your own site.`}`,
    `If it is useful for a future update, here is one fact you can check on our site: ${FILL} one dated, verifiable fact from your site (a measurement, a method, a public page). Thank you for the piece either way.`,
  ];
}

const siteName = (inp: PlanInput) => inp.brand || inp.truth?.brandName || inp.domain;

export function buildFixItPlan(inp: PlanInput): FixItPlan {
  const own = [inp.domain, ...(inp.ownedDomains || [])];
  const vendorDomains = inp.vendors.map((v) => v.domain || '').filter(Boolean);
  const vendorNames = inp.vendors.map((v) => v.name);
  const f = figures(inp);
  const diagnosis = diagnose(f);
  const steps: PlanStep[] = [];
  const add = (s: PlanStep) => steps.push(s);

  // ── Lane 0 ──
  const st = inp.standing || null;
  const lane0: string[] = [];
  if (!st) { lane0.push(NO_EXPORT_LINE); EXPORT_STEPS.forEach((s, i) => lane0.push(`${i + 1}. ${s}`)); }
  else {
    for (const c of st.classes) if (c.queries) lane0.push(`- **${c.cls === 'brand' ? 'Your name' : c.cls === 'category' ? 'Category searches' : 'Specific questions'}**: ${c.queries} searches, ${c.impressions} impressions, ${c.clicks} clicks, average position ${c.position} — ${c.band ? BAND_LABEL[c.band] : ''}. ${c.sentence}`);
    if (st.categoryPage) lane0.push(`- The page search shows most for your non-brand searches: ${st.categoryPage.url}, average position ${st.categoryPage.position}.`);
    if (st.winnable.length) lane0.push(`- **Winnable** (already on page 1): ${st.winnable.slice(0, 8).map((q) => `"${q.key}" (${q.position})`).join(', ')}. Proposed for your differentiator questions and as answer-first pages.`);
    if (st.close.length) lane0.push(`- **Close** (11–30), first targets for a title and description fix and a dedicated page: ${st.close.slice(0, 6).map((q) => `"${q.key}" (${q.position})`).join(', ')}.`);
    if (st.far.length) lane0.push(`- **Far** (31+), most-seen: ${st.far.slice(0, 6).map((q) => `"${q.key}" (${Math.round(q.position)})`).join(', ')}. ${FAR_LINE} Lanes 1 to 3 are the work for these.`);
  }

  // ── Lane 1: self-serve listings on hosts the engines cited ──
  const hosts = citedHosts(inp.runs, own);
  const catalog = (catalogJson as any).entries as { id: string; name: string; hosts: string[]; start_url: string; minutes: number; types: string[] }[];
  const cited1 = catalog.map((e) => ({ e, h: hosts.filter((h) => e.hosts.some((x) => matchesCatalogHost(h.host, x))) })).filter((x) => x.h.length)
    .map((x) => ({ e: x.e, times: x.h.reduce((a, h) => a + h.times, 0), all: x.h.reduce((a, h) => a + h.all, 0), engines: [...new Set(x.h.flatMap((h) => h.engines))] }))
    .sort((a, b) => b.times - a.times);
  // Open-publishing hosts that are also profile hosts (GitHub) count as listings too.
  const gh = hosts.find((h) => reg(h.host) === 'github.com');
  const slug = String(siteName(inp)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slug2 = slug.replace(/-/g, '');
  const ownListing = (e: { hosts: string[] }) => inp.runs.some((r) => (r.sources || []).some((u) => e.hosts.some((x) => matchesCatalogHost(hostOf(u), x)) && (u.toLowerCase().includes(slug) || u.toLowerCase().includes(slug2))));
  for (const c of cited1.filter((x) => ownListing(x.e))) add({ key: `lane1:keep:${c.e.id}`, lane: 1, owner: 'Outreach', title: `${c.e.name}: your listing is already cited (${c.all} times in your answers). Keep it current.`, lines: ['Check that the name, description and link match your site word for word.'], minutes: 5, doneWhen: 'The listing matches your site.', nextSweepShows: 'Whether answers keep citing it.', watch: 'coverage' });
  for (const c of cited1.filter((x) => !ownListing(x.e))) add({ key: `lane1:${c.e.id}`, lane: 1, owner: 'Outreach', title: `${c.e.name}: cited ${c.all} times in your answers, ${c.times} in category answers (${c.engines.join(', ')})`, lines: [`Create or claim your listing: ${c.e.start_url}. Paste text and every field: your step-by-step guide, section "${c.e.name}".`], minutes: c.e.minutes, doneWhen: `Your ${c.e.name} listing is live and its address is in your Record.`, nextSweepShows: 'Whether answers cite your listing, and Source coverage.', watch: 'coverage' });
  // Directories and review sites outside the catalog, cited in the category answers (Houzz, Angi...).
  const catHosts = catalog.flatMap((e) => e.hosts.map(reg));
  for (const h of hosts.filter((x) => SELF_LISTING.includes(reg(x.host)) && !catHosts.includes(reg(x.host)) && !['google.com', 'bing.com', 'apple.com', 'facebook.com'].includes(reg(x.host)))) {
    const name = reg(h.host);
    add({ key: `lane1:dir:${name}`, lane: 1, owner: 'Outreach', title: `${name}: cited ${h.all} times in your answers, ${h.times} in category answers (${h.engines.join(', ')})`, lines: [`Create or claim your business profile on ${name} (https://${name}), with the same name, description and link as your site.`], minutes: 20, doneWhen: `Your ${name} profile is live and its address is in your Record.`, nextSweepShows: 'Whether answers cite your profile, and Source coverage.', watch: 'coverage' });
  }
  if (gh) add({ key: 'lane1:github', lane: 1, owner: 'Outreach', title: `GitHub: cited ${gh.all} times in your answers, ${gh.times} in category answers (${gh.engines.join(', ')})`, lines: ['A public repository or organization profile under your own name, with a README that states plainly what you do and links to your site.'], minutes: 30, doneWhen: 'The repository or profile is public and its address is in your Record.', nextSweepShows: 'Whether answers cite it, and Source coverage.', watch: 'coverage' });
  if (!cited1.length && !gh) {
    const bt = inp.businessType || 'software';
    for (const e of catalog.filter((x) => x.types.includes(bt) || x.types.includes('all')).slice(0, 2)) add({ key: `lane1:${e.id}`, lane: 1, owner: 'Outreach', title: `${e.name} (${NOT_CITED_LABEL})`, lines: [`Start here: ${e.start_url}. Paste text: your step-by-step guide, section "${e.name}".`], minutes: e.minutes, doneWhen: `Your ${e.name} listing is live and its address is in your Record.`, nextSweepShows: 'Whether answers begin to cite it.', watch: 'coverage' });
  }

  // ── Lane 2: publish where the engines read (open publishing hosts cited) ──
  const openCited = hosts.filter((h) => OPEN_PUBLISHING.includes(reg(h.host)) && reg(h.host) !== 'github.com');
  const procedure = [...new Set(inp.runs.filter((r) => r.queryType === 'category').map((r) => r.query))].filter((q) => answerShape(q) === 'advice' && !comparesTwoNamed(q, vendorNames));
  if (openCited.length && procedure.length) {
    const q = procedure[0]; const host = openCited[0];
    add({ key: 'lane2:howto', lane: 2, owner: 'Content', title: `Publish a how-to on ${host.host} answering "${q}" (cited ${host.times} times in your category answers)`, lines: [
      `Canonical version first, on your own site; then the copy on ${host.host} with its canonical link set to your page. Built only from your own site's facts:`,
      `- Title: ${q.charAt(0).toUpperCase() + q.slice(1)}`,
      `- Opening: ${FILL} the short answer, in three sentences.`,
      `- What ${siteName(inp)} does: ${(inp.truth?.site?.ldDescription || inp.truth?.site?.metaDescription) || `${FILL} one sentence from your site`}`,
      `- The steps: ${FILL} the method, numbered, as you actually do it.`,
      `- Closing: a link to your canonical page.`,
      'Publish where your buyers read, never purely to borrow a platform\'s ranking.',
    ], minutes: 90, doneWhen: `The canonical page is live on ${inp.domain} and the ${host.host} copy is live with its canonical link set.`, nextSweepShows: `Whether answers cite your ${host.host} page or your canonical page.`, watch: 'citation' });
  }

  // ── Lane 3: Source coverage, classified ──
  const classification: ClassifiedRow[] = []; const pitch: PitchRow[] = []; const vendorRows: VendorRow[] = [];
  const seenUrl = new Set<string>();
  for (const row0 of (inp.coverage?.rows || []).filter((r) => r.verdict !== 'yes')) {
    const row = { ...row0, url: cleanUrl(row0.url) };
    if (seenUrl.has(row.url)) continue; seenUrl.add(row.url);
    const c = classifyHost(row.host, vendorDomains, !!row.sellsProduct, row.verdict !== 'unreadable' && row.sellsProduct !== undefined, (inp.businessType || 'software') === 'software');
    classification.push({ url: row.url, host: row.host, kind: c.kind, rule: c.rule });
    if (c.kind === 'vendor-owned') vendorRows.push({ url: row.url, host: row.host, timesCited: row.timesCited });
    else if (c.kind === 'independent' && reg(row.host) === 'wikipedia.org') continue; // never edit or create Wikipedia articles about yourself
    else if (c.kind === 'independent') pitch.push({ url: row.url, host: row.host, title: row.title ? noPrice(row.title) : null, timesCited: row.timesCited, byline: row.byline || null,
      contact: row.contact ? `${row.contact.kind === 'author' ? 'Author page' : row.contact.kind === 'email' ? 'Published email' : 'Contact page'}: ${row.contact.value}` : `${FILL} a contact route from ${row.host} (author page, contact page or published email)`,
      note: pitchNote(inp, row) });
  }
  pitch.sort((a, b) => b.timesCited - a.timesCited);
  vendorRows.sort((a, b) => b.timesCited - a.timesCited);
  if (pitch.length) add({ key: 'lane3:pitch', lane: 3, owner: 'Outreach', title: `Pitch the ${pitch.length} independent page${pitch.length === 1 ? '' : 's'} the engines read for your category, most-cited first`, lines: ['One new email per page, two short paragraphs, offering a fact the writer can use. Never ask to be ranked.'], minutes: 20 * Math.min(pitch.length, 5), doneWhen: 'Each pitch sent is logged in your Record with its date.', nextSweepShows: 'Source coverage: named on X of N recurring pages.', watch: 'coverage' });

  // ── Lane 4: your own site ──
  for (const w of wrongClaims(inp)) add({ key: `lane4:fix:${w.wrong.toLowerCase().slice(0, 60)}`, lane: 4, owner: 'Site', title: `Correct "${w.wrong}" (${w.times} answer${w.times === 1 ? '' : 's'}, ${w.engines.join(', ')})`, lines: [`What the engine said: ${w.detail}`, `Likely source: ${w.source ? `${w.source} (cited in every answer that made this claim)` : NO_SOURCE_LINE}.`], minutes: 20, doneWhen: 'The wording is corrected on every page you control, including the likely source if it is yours.', nextSweepShows: 'Described accurately when named.', watch: 'accuracy' });
  const pageQs = [...new Set(inp.runs.filter((r) => r.queryType === 'category' && !r.domainCited).map((r) => r.query))].filter((q) => !comparesTwoNamed(q, vendorNames) && !/\b(alternatives?|alternative to|best|top|leading|cheapest|affordable)\b/i.test(q) && (answerShape(q) === 'advice' || /\b(what is|difference|differences|vs\.?)\b/i.test(q)));
  for (const q of pageQs.slice(0, 4)) add({ key: `lane4:page:${q.slice(0, 60)}`, lane: 4, owner: 'Content', title: `Answer-first page: "${q}"`, lines: ['Open with the short answer in three sentences, then the method, then questions people ask. Re-express only facts on your own site.'], minutes: 120, doneWhen: 'The page is live and listed in your sitemap and llms.txt.', nextSweepShows: 'Recommended to buyers on this question.', watch: 'citation' });
  if (inp.score) {
    if (inp.score.score < 85) for (const c of (inp.score.checklist || []).slice(0, 4)) add({ key: `lane4:site:${c.action.slice(0, 60)}`, lane: 4, owner: 'Site', title: c.action, lines: ['From your AEO Score handoff.'], minutes: 30, doneWhen: 'The fix is live; re-run the AEO Score.', nextSweepShows: 'Found by name, and your AEO Score.', watch: 'readiness' });
    else add({ key: 'lane4:ready', lane: 4, owner: 'Site', title: SITE_READY_LINE, lines: [`AEO Score ${inp.score.score}.`], minutes: 0, doneWhen: 'Nothing to do here this month.', nextSweepShows: 'Your AEO Score stays where it is.', watch: 'readiness' });
  }

  // ── The one next step (§2B) ──
  let one: FixItPlan['oneNextStep'] = null;
  const winnableUnrec = (st?.winnable || []).filter((q) => q.cls === 'specific');
  const brandClass = st?.classes.find((c) => c.cls === 'brand');
  const ss10 = cited1.find((c) => c.times >= 10) || (gh && gh.times >= 10 ? { e: { name: 'GitHub' }, times: gh.times } as any : null) || ((): any => { const d = hosts.find((x) => SELF_LISTING.includes(reg(x.host)) && x.times >= 10); return d ? { e: { name: reg(d.host) }, times: d.times } : null; })();
  if (winnableUnrec.length && (f.recPct ?? 0) === 0) one = { title: 'Measure it: add your page-1 questions to your differentiator questions and run a sweep', why: `${winnableUnrec.length} specific question${winnableUnrec.length === 1 ? '' : 's'} already rank on page 1 in search (for example "${winnableUnrec[0].key}" at ${winnableUnrec[0].position}), and this sweep recommended you in ${f.rec} of ${f.recN} category answers. A first recommendation is most likely where you already rank.` };
  else if (brandClass && brandClass.position !== null && brandClass.position > 10 && brandClass.position <= 30) one = { title: 'Fix your homepage title and description', why: `Searches for your name average position ${brandClass.position}, on page 2. Engines read roughly the top 10.` };
  else if (ss10) one = { title: `List on ${ss10.e.name}`, why: `${ss10.e.name} was cited ${ss10.times} times in your category answers and does not list you yet.` };
  else if (pitch[0]) one = { title: `Pitch ${pitch[0].host}`, why: `It is the independent page the engines cited most for your category (${pitch[0].timesCited} times).` };

  // ── Moving first (§2C) ──
  const moving: FixItPlan['movingFirst'] = [];
  const dir = (a: number, b: number, lowerIsBetter = false) => (a === b ? 'unchanged' : (lowerIsBetter ? b < a : b > a) ? 'up' : 'down') as 'up' | 'down' | 'unchanged';
  const covNow = inp.coverage ? inp.coverage.rows.filter((r) => r.verdict === 'yes').length : null;
  if (covNow !== null && inp.previous?.coverageNamed != null) moving.push({ label: 'Source coverage: named on recurring pages', then: String(inp.previous.coverageNamed), now: `${covNow} of ${inp.coverage!.rows.length}`, dir: dir(inp.previous.coverageNamed, covNow) });
  const nowSources = [...new Set(inp.runs.filter((r) => r.queryType === 'branded' && r.domainCited).flatMap((r) => (r.sources || []).map(hostOf)).filter((h) => h && !own.some((o) => reg(o) === reg(h))))];
  if (inp.previous?.byNameSources) { const prev = new Set(inp.previous.byNameSources); const fresh = nowSources.filter((h) => !prev.has(h)); moving.push({ label: 'Third-party sources cited in by-name answers', then: String(prev.size), now: `${nowSources.length}${fresh.length ? ` (new: ${fresh.slice(0, 4).join(', ')})` : ''}`, dir: dir(prev.size, nowSources.length) }); }
  for (const cls of ['category', 'specific'] as const) {
    const a = inp.previous?.standing?.classes.find((c) => c.cls === cls)?.position; const b = st?.classes.find((c) => c.cls === cls)?.position;
    if (a != null && b != null) moving.push({ label: `Search position, ${cls === 'category' ? 'category searches' : 'specific questions'}`, then: String(a), now: String(b), dir: dir(a, b, true) });
  }
  if (inp.previous?.differentiatorRate != null && inp.differentiatorRate != null) moving.push({ label: 'Differentiator questions: recommended', then: `${inp.previous.differentiatorRate}%`, now: `${inp.differentiatorRate}%`, dir: dir(inp.previous.differentiatorRate, inp.differentiatorRate) });

  // ── Differentiator suggestions: page-1 questions first, then the site's own description ──
  const diff: string[] = [];
  for (const q of (st?.winnable || [])) if (diff.length < 6 && !diff.includes(q.key)) diff.push(q.key);
  const desc = (inp.truth?.site?.ldDescription || inp.truth?.site?.metaDescription);
  if (diff.length < 6 && desc) diff.push(`Which tool ${desc.replace(/^[^ ]+ (is|are) (a |an |the )?/i, '').replace(/\.$/, '')}?`.replace(/\s+/g, ' '));

  // Lane order is part of the contract: 1, 2, 3, 4 (lane 0 renders above the steps).
  steps.sort((a, b) => a.lane - b.lane);
  return { diagnosis, oneNextStep: one, lane0: { standing: st, lines: lane0 }, steps, pitch, vendors: vendorRows, classification, movingFirst: moving, differentiator: diff.slice(0, 6) };
}

/** Markdown for the report (screen, Word and PDF render this). */
export function fixItPlanMarkdown(p: FixItPlan, opts: { gated?: boolean } = {}): string[] {
  const out: string[] = ['## Your next steps', ''];
  if (opts.gated) { out.push('_Your step-by-step plan is included on Pro and Business, and with a Day Pass for its own sweep._', ''); return out; }
  out.push(`**${p.diagnosis.line}.** _(${p.diagnosis.rule})_`, '');
  if (p.oneNextStep) out.push('### If you do one thing this month', '', `**${p.oneNextStep.title}.** ${p.oneNextStep.why}`, '');
  if (p.movingFirst.length) { out.push('### Moving first (compared with last month)', ''); for (const m of p.movingFirst) out.push(`- ${m.label}: ${m.then} → ${m.now} (${m.dir})`); out.push(''); }
  out.push(`### ${LANE_TITLE[0]}`, '', ...p.lane0.lines, '');
  for (const lane of [1, 2, 3, 4] as Lane[]) {
    const ls = p.steps.filter((s) => s.lane === lane);
    out.push(`### ${LANE_TITLE[lane]}`, '');
    if (!ls.length && lane !== 3) { out.push('_Nothing in this lane this month._', ''); continue; }
    for (const s of ls) {
      out.push(`**${s.title}** _(Owner: ${s.owner} · about ${s.minutes} minutes)_`, '');
      out.push(...s.lines, '');
      out.push(`- Done when: ${s.doneWhen}`, `- What the next sweep shows: ${s.nextSweepShows}`, '');
    }
    if (lane === 3) {
      for (const r of p.pitch) {
        out.push(`- **${r.title || r.url}** — ${r.url} (cited ${r.timesCited} times)${r.byline ? `, by ${r.byline}` : ''}. ${r.contact}`);
        out.push(`  - Draft note: ${r.note.join(' / ')}`);
      }
      if (p.vendors.length) { out.push('', `<details><summary>${p.vendors.length} vendor-owned page${p.vendors.length === 1 ? '' : 's'} (unlikely to add you)</summary>`, '', `_${VENDOR_LINE}_`, ''); for (const v of p.vendors) out.push(`- ${v.url} (cited ${v.timesCited} times)`); out.push('', '</details>'); }
      out.push('');
    }
  }
  if (p.differentiator.length) {
    out.push('### A second set of questions where you are different', '', 'Optional, and a separate series: never mixed into the questions above. Nothing runs until you confirm.', '');
    p.differentiator.forEach((q, i) => out.push(`${i + 1}. ${q}`));
    out.push('');
  }
  return out;
}
