import { useState } from 'react';
import { Type } from '@google/genai';
import { Play, Loader2, Bot, Trophy, AlertTriangle, ChevronDown, ChevronRight, DollarSign, Search, Download, ChevronsUpDown, Sparkles, RotateCcw, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { aggregateAuthorityGap, type AuthorityGapReport } from '../lib/authorityGap';
import { tierForDomain, TIER_LABEL } from '../lib/authorityTiers';
import { segmentBreakdown, winnableSegment, largestLosingSegment, segmentSummaryNote, SEGMENT_LABEL } from '../lib/querySegment';
import { sanitizeCompetitors, lintDefunctNames } from '../lib/sweepConfig';
import { buildSweepActionAgenda } from '../lib/sweepActions';
import { SCORE_VS_SWEEP } from '../content/scoreVsSweep';
import { ScoreVsSweepCard, CrossLink, AgendaBlock } from './ScoreVsSweepCard';
import { avgPawc } from '../lib/pawc';
import { auditFactDensity, type FactDensityAudit } from '../lib/factDensity';
import { sweepScorecard, confidenceLevel } from '../lib/citationSweep';
import type { SweepSummary, SweepRunResult, SweepScorecard } from '../lib/citationSweep';
import { extractTruthRecord, type TruthRecord } from '../lib/truthRecord';
import { summarizeFidelity, classifyRunFidelity, type FidelitySummary } from '../lib/fidelity';
import { detectEntityLinkingFailures, type EntityLinkingReport } from '../lib/entityLinking';
import { getAccessToken } from '../supabase';
import { safeJsonParse } from '../services/geminiService';

// --- URL-first auto-extract (UX-PRINCIPLES §1–2 / SWEEP-UX-REDESIGN commit a) ---
// One required input: the domain. We crawl it, then the AI infers Brand, Core
// Category, and likely competitors (shown EDITABLE + labeled "verify" — inferred
// values are never silently trusted, per grounded-output rule) and drafts the
// ~10 non-branded buyer questions. All calls go through /api/llm-generate, which
// holds the key server-side and runs the gemini-3.6-flash chain (never a dated
// snapshot). No new API cost beyond one extract + one query-gen call.

const normDomain = (s: string) =>
  s.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

const htmlToText = (html: string) =>
  String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// POST {prompt, schema} -> text (a JSON string). Mirrors geminiService's private
// generateWithFallback: attaches the Supabase token so signed-in users aren't
// treated as guests (llm-generate returns 401 to logged-out callers).
async function llmJson(prompt: string, schema: any): Promise<string> {
  const token = getAccessToken();
  const resp = await fetch('/api/llm-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt, schema }),
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.error || ''; } catch { /* non-JSON error body */ }
    throw new Error(detail || `The AI service is unavailable (${resp.status}). Try again shortly.`);
  }
  const data = await resp.json().catch(() => null);
  if (!data?.text) throw new Error('The AI service returned an empty response. Try again.');
  return data.text as string;
}

const EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    brand: { type: Type.STRING },
    core_category: { type: Type.STRING },
    competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['brand', 'core_category'],
};

const extractPrompt = (siteText: string) => `Extract the following from this website text:
1. Brand Name.
2. A 3-to-5 word Core Category describing what they sell.
3. Three to five DIRECT competitors — real, named products a buyer would cross-shop
   AGAINST this company in the SAME sub-category. Apply this test: "would the same
   buyer evaluating this product also put the competitor on their shortlist?" If not,
   exclude it. An adjacent-but-different tool (e.g. a security, data-governance, or
   infrastructure vendor for a marketing/analytics product) is NOT a competitor.
   Only include a name you are confident competes head-to-head; return an EMPTY list
   rather than guessing a wrong-category name. (Names only.)
Return as JSON: {"brand":"...","core_category":"...","competitors":["...","...","..."]}

WEBSITE TEXT:
"""
${siteText}
"""`;

const QUERY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sweep_queries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          intent_type: { type: Type.STRING },
          query: { type: Type.STRING },
        },
        required: ['intent_type', 'query'],
      },
    },
  },
  required: ['sweep_queries'],
};

const queryPrompt = (brand: string, domain: string, category: string, competitors: string[]) =>
  `You are an Answer Engine Optimization (AEO) Query Generator. Generate a fixed set of 10 test queries a prospective buyer would type into an AI search engine when researching a solution in the provided category. Do NOT use the Brand Name in these queries (test organic recommendation).

INPUTS:
- Brand Name: ${brand || '(unknown)'}
- Domain: ${domain}
- Core Category: ${category}
- Competitors: ${competitors.length ? competitors.join(', ') : '(none provided)'}

Generate exactly 10 queries by intent:
- Category Discovery (3): broad "best solutions in this category" questions
- Problem/Solution (3): a problem this category solves, asking for recommendations
- Comparative (4): "vs" / "alternative to {competitor}" questions

PHRASING: write each query the way a real buyer TYPES it — plain, natural language,
not internal category jargon. At most 2 of the 10 may use the category's technical
term; the rest should read like a non-expert ("how do I show up in AI answers", "why
isn't my site recommended by ChatGPT"). Never reference DISCONTINUED product names
(SearchGPT, Bard, Bing Chat, Google SGE) — use current names (ChatGPT search, Gemini,
Copilot, Google AI Overviews).

SEGMENT SPREAD so results aren't one blended number — include:
- at least ONE small-business/affordable-framed question ("affordable ... for
  startups", "free ... checker");
- at least ONE "affordable alternative to {a specific competitor}" question;
- if this category is commonly bought through agencies/resellers, ONE agency-framed
  question ("best ... for agencies managing multiple clients").
Favor questions this brand can realistically win given its positioning and price
point — not only enterprise-framed ones. Drop pure "{competitorA} vs {competitorB}"
questions that structurally exclude this brand; every comparative should be one this
brand could plausibly be named in.

OUTPUT: valid JSON
{"sweep_queries":[{"intent_type":"Discovery|Problem|Comparative","query":"..."}]}`;

type GeneratedQuery = { intent_type: string; query: string };

// WO-1 (+WO-3/WO-7) client dashboard: run a tested citation sweep, then show
// branded retrievability, category citation-rate, competitor displacement,
// transcript drill-down, per-sweep cost, AI-bot hits, and the authority gap.

interface SweepResponse {
  domain: string; brand: string | null; runsPerQuery: number;
  engines: string[]; skippedEngines: string[]; configured: string[];
  summary: SweepSummary; runs: SweepRunResult[]; persisted: boolean;
  quickCheck?: boolean; tier?: string;
  provisional?: { score: number; label: string; message: string } | null;
  upgrade?: string | null;
}

const ENGINE_LABEL: Record<string, string> = {
  claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini',
};

export default function SweepDashboard({ onUpgrade, isAdmin, onOpenAnalyzer }: { onUpgrade?: () => void; isAdmin?: boolean; onOpenAnalyzer?: () => void }) {
  const [domain, setDomain] = useState('');
  const [brand, setBrand] = useState('');
  const [coreCategory, setCoreCategory] = useState('');
  const [branded, setBranded] = useState('who is {domain}\nwhat is {domain}');
  const [categoryQueries, setCategoryQueries] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SweepResponse | null>(null);
  const [authority, setAuthority] = useState<AuthorityGapReport | null>(null);
  const [fidelity, setFidelity] = useState<FidelitySummary | null>(null);
  const [entityLinking, setEntityLinking] = useState<EntityLinkingReport | null>(null);
  const [pageFactDensity, setPageFactDensity] = useState<FactDensityAudit | null>(null);
  const [truth, setTruth] = useState<TruthRecord | null>(null);
  const [bots, setBots] = useState<any | null>(null);
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);

  // URL-first flow: 'input' (just the domain) → 'confirm' (verify auto-extracted
  // brand/category/competitors + review the drafted questions) → run.
  const [phase, setPhase] = useState<'input' | 'confirm'>('input');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [editQueries, setEditQueries] = useState(false);

  // Robust query parse. Strips box-drawing / table-border characters (U+2500–U+259F and the
  // ASCII pipe) and rejoins a line that STARTS with one — a wrapped table-cell continuation
  // from a pasted markdown table. This is how "most reliable small SUV" once split into
  // "most reliable small" + "│ │ SUV" (a bogus extra query). De-dupes identical lines.
  const BORDER = /[─-▟|]/g;
  const parseLines = (s: string) => {
    const out: string[] = [];
    for (const raw of s.split('\n')) {
      const isContinuation = /^\s*[─-▟|]/.test(raw);
      const cleaned = raw.replace(BORDER, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) continue;
      if (isContinuation && out.length) out[out.length - 1] = `${out[out.length - 1]} ${cleaned}`.trim();
      else out.push(cleaned);
    }
    return [...new Set(out)];
  };
  const parseCompetitors = (s: string) =>
    parseLines(s).map((l) => {
      const [name, dom] = l.split(',').map((x) => x.trim());
      return { name, domain: dom || undefined };
    });

  // Step 1: user enters only the domain → crawl it, infer the basics, draft the
  // buyer questions, then surface them for confirmation (nothing runs/costs a
  // sweep yet). Falls back to the manual confirm panel if the site can't be read.
  async function analyze() {
    const d = normDomain(domain);
    if (!d) return;
    setAnalyzing(true); setExtractError(null);
    try {
      const site = await fetch('/api/fetch-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: d }),
      }).then((r) => r.json()).catch(() => null);
      if (!site?.html) throw new Error(site?.error || `Couldn't read ${d}. Enter the details yourself below.`);
      const text = htmlToText(site.html).slice(0, 6000);

      // Infer brand / category / competitors from the crawled page text.
      const ext = safeJsonParse(await llmJson(extractPrompt(text), EXTRACT_SCHEMA)) || {};
      const guessedBrand = String(ext.brand || '').trim();
      const guessedCategory = String(ext.core_category || '').trim();
      const guessedComp: string[] = Array.isArray(ext.competitors)
        ? sanitizeCompetitors(
            ext.competitors.map((c: any) => String(c || '').trim()),
            { brand: guessedBrand, ownDomain: d }
          ).slice(0, 3)
        : [];
      setBrand(guessedBrand);
      setCoreCategory(guessedCategory);
      setCompetitors(guessedComp.join('\n'));

      // Draft the 10 non-branded buyer questions from those (guessed) values.
      const q = safeJsonParse(await llmJson(queryPrompt(guessedBrand, d, guessedCategory, guessedComp), QUERY_SCHEMA)) || {};
      const gq: GeneratedQuery[] = Array.isArray(q.sweep_queries)
        ? q.sweep_queries.filter((x: any) => x?.query).map((x: any) => ({ intent_type: String(x.intent_type || 'Discovery'), query: lintDefunctNames(String(x.query).trim()) }))
        : [];
      setGeneratedQueries(gq);
      setCategoryQueries(gq.map((x) => x.query).join('\n'));
      setPhase('confirm');
    } catch (e: any) {
      // Non-fatal: drop the user into the confirm panel to fill in fields manually.
      setExtractError(e?.message || 'Could not analyze that site — enter the details manually below.');
      setPhase('confirm');
    } finally {
      setAnalyzing(false);
    }
  }

  function startOver() {
    setPhase('input'); setExtractError(null); setGeneratedQueries([]);
    setBrand(''); setCoreCategory(''); setCategoryQueries(''); setCompetitors('');
    setResult(null); setAuthority(null); setError(null); setEditQueries(false);
  }

  async function run() {
    setError(null); setResult(null); setAuthority(null); setFidelity(null); setEntityLinking(null); setPageFactDensity(null); setTruth(null); setRunning(true);
    try {
      const d = normDomain(domain);
      const expand = (q: string) => q.replace(/\{domain\}/g, d);
      const token = getAccessToken();
      const res = await fetch('/api/run-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          domain: d, brand: brand.trim() || undefined,
          brandedQueries: parseLines(branded).map(expand),
          categoryQueries: parseLines(categoryQueries).map(expand),
          competitors: parseCompetitors(competitors),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `sweep failed (${res.status})`);
      setResult(json);
      setAuthority(aggregateAuthorityGap(json.runs || [], d));
      fetch(`/api/bot-stats?domain=${encodeURIComponent(d)}`).then((r) => r.json()).then(setBots).catch(() => {});
      // B1: build the client's truth record from their own live site, then check
      // the branded answers for drift (fabricated founders etc.). No sweep cost —
      // a single page fetch; grounded against first-party JSON-LD + llms.txt.
      fetch('/api/fetch-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: d }) })
        .then((r) => r.json())
        .then((site) => {
          if (!site?.html) return;
          const tr = extractTruthRecord(site.html, site.llmsTxt);
          setTruth(tr);
          setPageFactDensity(auditFactDensity(site.html)); // E2: content-depth audit
          const brandedRuns = (json.runs || []).filter((r: SweepRunResult) => r.queryType === 'branded');
          setFidelity(summarizeFidelity(brandedRuns, tr));
          // B2: which wrong entities the engines confused you with (from cited sources).
          setEntityLinking(detectEntityLinkingFailures(brandedRuns, { domain: d, brand: json.brand || tr.brandName || undefined }, tr));
        })
        .catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'sweep failed');
    } finally {
      setRunning(false);
    }
  }

  // Build a single human-readable report of the whole sweep — summary scores,
  // competitors, authority gap, crawler hits, and every transcript — so it can
  // be saved/shared/pasted in one shot instead of expanding runs one at a time.
  function buildReport(r: SweepResponse): string {
    const L = (eng: string) => ENGINE_LABEL[eng] || eng;
    const out: string[] = [];
    out.push(`# Citation Sweep — ${r.domain}`);
    if (r.brand) out.push(`Brand: ${r.brand}`);
    out.push(`Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
    out.push(`Runs per query: ${r.runsPerQuery}`);
    out.push(`Engines: ${r.configured.join(', ') || 'none'}`);
    if (r.skippedEngines?.length) out.push(`Skipped (no API key): ${r.skippedEngines.join(', ')}`);
    if (isAdmin) out.push(`Total sweep cost: ~$${r.summary.totalCostUsd.toFixed(3)}`);
    out.push('');

    // Lead the report with the plain-English summary + the buyer-facing scorecard,
    // not raw scores (UX-PRINCIPLES §4).
    const sc = sweepScorecard(r.runs, { domain: r.domain, brand: r.brand || undefined }, parseCompetitors(competitors));
    out.push('## Summary — in plain English');
    out.push(sc.plainSummary);
    out.push('');
    const scoreCell = (v: number | null, n: number) =>
      v === null ? '—' : `${v}% (N=${n}, ${confidenceLevel(n)} confidence)`;
    out.push('| What it measures | Score |');
    out.push('| --- | --- |');
    out.push(`| Found when asked by name (retrievability) | ${scoreCell(sc.brandedRetrievabilityPct, sc.brandedRuns)} |`);
    out.push(`| Recommended to new buyers (category win) | ${scoreCell(sc.categoryRecommendationWinPct, sc.categoryRuns)} |`);
    out.push(`| Your own site cited (owned citation rate) | ${scoreCell(sc.ownedCitationRatePct, sc.ownedCitationN)} |`);
    out.push(`| Your share of the category | ${scoreCell(sc.competitiveSharePct, sc.competitiveShareN)} |`);
    out.push('');
    if (sc.modelPriorRuns > 0) {
      out.push(`_Category win is measured on search-grounded answers only. ${sc.modelPriorRuns} answer${sc.modelPriorRuns > 1 ? 's' : ''} came from model memory (no web search)${sc.modelPriorVisibilityPct !== null ? `; the model named you ${sc.modelPriorVisibilityPct}% of those (model-prior visibility)` : ''}._`);
      out.push('');
    }

    // C3: category win by buyer segment.
    const segs = segmentBreakdown(r.runs);
    if (segs.length > 1) {
      out.push('### Category win by buyer segment');
      out.push('| Segment | Win | N |');
      out.push('| --- | --- | --- |');
      for (const s of segs) out.push(`| ${SEGMENT_LABEL[s.segment]} | ${s.winPct}% | ${s.categoryRuns} |`);
      out.push('');
      out.push(segmentSummaryNote(segs, (s) => `**${s}**`));
      out.push('');
    }

    // Fidelity (B1): of the branded answers that named the brand, which got facts wrong.
    if (fidelity && (fidelity.citedAccurate > 0 || fidelity.citedDrifted > 0)) {
      out.push('## Fidelity — is AI accurate about you?');
      out.push(`Of the answers that named you, ${fidelity.citedAccurate} got your facts right${fidelity.citedDrifted > 0 ? ` and ${fidelity.citedDrifted} drifted (asserted something false)` : ' — no fabricated facts detected'}.`);
      for (const iss of fidelity.issues) out.push(`- ${iss.wrong ? `"${iss.wrong}": ` : ''}${iss.detail}`);
      out.push('');
    }
    if (pageFactDensity && pageFactDensity.flags.length > 0) {
      out.push('## Content depth — the levers that make a page citable');
      out.push('_Effect sizes are findings from the Princeton GEO study (arXiv:2311.09735), not guarantees._');
      for (const f of pageFactDensity.flags) out.push(`- ${f.consequence}`);
      out.push('');
    }
    if (entityLinking && entityLinking.collisions.length > 0) {
      out.push('## Entity-linking — who engines confuse you with');
      out.push(`Engines are confusing you with: ${entityLinking.collisions.join(', ')}.`);
      for (const f of entityLinking.flags) out.push(`- [${f.kind}] ${f.detail} (${f.source})`);
      out.push('Fix: an explicit "not affiliated with…" disambiguation line + a connected @id entity graph.');
      out.push('');
    }

    out.push('## Scores by engine');
    for (const e of r.summary.engines) {
      out.push(`### ${L(e.engine)}`);
      if ((e as { errored?: boolean }).errored) {
        out.push('- Service unavailable (engine failed to run — bad/expired key or config; NOT a real 0%)');
      } else if (e.truncatedBlocked) {
        out.push(`- Column unreliable — ${e.truncatedRuns} answers were cut off by the token cap (not a real measurement; re-run at a higher cap).`);
      } else {
        out.push(`- Retrievability (branded): ${e.brandedCited}/${e.brandedRuns} (${e.retrievabilityPct}%)`);
        out.push(`- Citation win (category, search-grounded): ${e.citationWinPct}%`);
        if (e.modelPriorRuns > 0) out.push(`- (${e.modelPriorRuns} model-prior answer${e.modelPriorRuns > 1 ? 's' : ''} — answered without a live search — reported separately)`);
        if (e.truncatedRuns > 0) out.push(`- (${e.truncatedRuns} truncated answer${e.truncatedRuns > 1 ? 's' : ''} excluded from the scores above)`);
        if (isAdmin) out.push(`- Cost: $${e.costUsd.toFixed(3)}`);
      }
      out.push('');
    }

    const reportCompetitors = sc.topCompetitors.length ? sc.topCompetitors : r.summary.topCompetitors;
    if (reportCompetitors.length) {
      out.push('## Cited instead of you (category queries)');
      if (sc.competitorsAutoDetected) out.push('_Auto-detected from the answers (no competitors were entered)._');
      for (const c of reportCompetitors) out.push(`- ${c.name} · ${c.count}×`);
      out.push('');
    }

    if (authority && authority.authorityDomains.length) {
      out.push('## Authority gap — sources the engines trust (by attainability)');
      const topA = authority.authorityDomains.slice(0, 12);
      for (const tier of ['now', 'earned', 'aspirational'] as const) {
        const inTier = topA.filter((d) => tierForDomain(d.domain).tier === tier);
        if (!inTier.length) continue;
        out.push(`### ${TIER_LABEL[tier]}`);
        for (const d of inTier) out.push(`- ${d.domain} · ${d.citations} — ${tierForDomain(d.domain).rationale}`);
      }
      if (authority.recommendations.length) {
        out.push('');
        out.push('Recommendations:');
        for (const rec of authority.recommendations) out.push(`- ${rec}`);
      }
      out.push('');
    }

    if (bots && bots.configured) {
      out.push(`## AI crawler hits (${bots.days}d) — ${bots.totalHits} total`);
      for (const t of ['live', 'search', 'training']) out.push(`- ${t}: ${bots.tierTotals?.[t] || 0}`);
      out.push('');
    }

    // WO-UX-CLARITY-001: map each measured layer to its next action (closing agenda).
    for (const line of buildSweepActionAgenda({
      brandedRetrievabilityPct: sc.brandedRetrievabilityPct,
      categoryWinPct: sc.categoryRecommendationWinPct,
      hasFidelityOrCollision: (fidelity?.citedDrifted ?? 0) > 0 || (entityLinking?.collisions.length ?? 0) > 0,
      collisions: entityLinking?.collisions ?? [],
      losingCategoryQuestions: [...new Set(r.runs.filter((x) => x.queryType === 'category' && !x.cited && !x.truncated && x.grounding !== 'model-prior').map((x) => x.query))],
      doNowAuthorities: authority ? [...new Set(authority.authorityDomains.filter((d) => tierForDomain(d.domain).tier === 'now').map((d) => d.domain))] : [],
      brand: r.brand || undefined,
      domain: r.domain,
    })) out.push(line);
    out.push('');

    out.push(`## Transcripts (${r.runs.length} runs)`);
    out.push('');
    for (const run of r.runs) {
      const tag = run.truncated ? 'truncated — not scored' : run.cited ? 'cited' : 'not cited';
      const prior = run.grounding === 'model-prior' && !run.truncated ? ' · model-prior' : '';
      out.push(`### [${tag}${prior}] ${L(run.engine)} · ${run.queryType}: ${run.query}`);
      out.push(run.transcript || '(no answer)');
      if (run.sources?.length) out.push(`Sources: ${run.sources.join(' · ')}`);
      out.push('');
      out.push('---');
      out.push('');
    }
    return out.join('\n');
  }

  function downloadReport() {
    if (!result) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([buildReport(result)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citation-sweep-${result.domain}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const scorecard: SweepScorecard | null =
    result && !result.quickCheck
      ? sweepScorecard(result.runs, { domain: result.domain, brand: result.brand || undefined }, parseCompetitors(competitors))
      : null;

  // C3: category win by buyer segment (an out-of-segment 0% isn't failure).
  const segments = result && !result.quickCheck ? segmentBreakdown(result.runs) : [];
  const winSeg = winnableSegment(segments);

  // E1 (PAWC): when cited in category answers, how much of the answer you own.
  const pawcClient = result && !result.quickCheck
    ? avgPawc(
        result.runs.filter((r) => r.queryType === 'category' && !r.truncated && r.grounding !== 'model-prior').map((r) => r.transcript || ''),
        (s) => { const l = s.toLowerCase(); const d = result.domain.toLowerCase(); const b = (result.brand || '').toLowerCase(); return l.includes(d) || (b.length >= 3 && l.includes(b)); },
      )
    : { avgShare: 0, answers: 0 };

  // Color a 0–100 score green (good) / amber (some) / red (weak) — used on the stat cards.
  const tone = (v: number | null): string =>
    v === null ? 'text-zinc-400' : v >= 60 ? 'text-emerald-500' : v > 0 ? 'text-amber-500' : 'text-red-500';

  // Sample-size confidence chip (A3): honest about small-N cells.
  const confChip = (n: number) => {
    const lvl = confidenceLevel(n);
    const label = lvl === 'low' ? 'low confidence' : lvl === 'med' ? 'moderate' : 'high confidence';
    const cls = lvl === 'low' ? 'text-amber-600' : lvl === 'med' ? 'text-zinc-500' : 'text-emerald-600';
    return { label, cls };
  };

  // Confirm-panel display: expanded question lists + the total we'll actually ask.
  const dNorm = normDomain(domain);
  const brandedList = parseLines(branded).map((q) => q.replace(/\{domain\}/g, dNorm));
  const categoryList = parseLines(categoryQueries);
  const totalQuestions = brandedList.length + categoryList.length;
  // Bucket the model's free-form intent labels robustly — it returns variants
  // ("Category Discovery", "Problem/Solution", "Comparative") that an exact-string
  // match would drop from the review list. Anything unrecognized falls to "Other"
  // so we NEVER silently hide a question we'll actually ask.
  const intentBucket = (raw: string): string => {
    const s = (raw || '').toLowerCase();
    if (/compar|versus|\bvs\b|alternativ|switch/.test(s)) return 'Comparative';
    if (/problem|solution|use.?case|\bneed/.test(s)) return 'Problem';
    if (/discov|categor|\bbest\b|\btop\b/.test(s)) return 'Discovery';
    return 'Other';
  };
  // Group the ACTUAL category queries (source of truth for the run), looking up
  // each one's intent from the generated set so an edited list still displays.
  const intentOf = (q: string): string => {
    const g = generatedQueries.find((x) => x.query === q);
    return g ? intentBucket(g.intent_type) : 'Other';
  };
  const orderedBuckets = ['Discovery', 'Problem', 'Comparative', 'Other'];
  const intentLabel: Record<string, string> = {
    Discovery: 'Category discovery', Problem: 'Problem-first', Comparative: 'Head-to-head', Other: 'More buyer questions',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Citation Sweeps & Monitoring</h1>
        <p className="text-zinc-500 mt-2">
          Ask the real answer engines (with web search on), N&nbsp;times per query, and measure three separable layers:
          <b> retrievability</b> (branded), <b>citation win</b> (category), and who gets <b>cited instead</b> — backed by stored transcripts.
        </p>
        <p className="text-sm text-teal-700 mt-2 font-medium">{SCORE_VS_SWEEP.tagline.sweeps}</p>
      </div>

      {/* Condensed "what you actually get" — the 5-layer action plan (blog: /blog/what-you-actually-get). */}
      {phase === 'input' && !result && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-zinc-900">What you actually get — not just a score</h2>
            <a href="/blog/what-you-actually-get" className="text-xs font-semibold text-indigo-600 hover:underline">Read the full breakdown →</a>
          </div>
          <p className="text-sm text-zinc-500 mt-1">A sweep ends at an action plan with five layers — each answering “what do I change, and where?”</p>
          <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-700 list-decimal list-inside">
            <li><b>Paste-in code fixes</b> — verified JSON-LD + entity-graph corrections + web-team handoff.</li>
            <li><b>Corrections for what AI gets wrong</b> — each branded answer classified accurate / drifted / confused-with-another-entity.</li>
            <li><b>An off-site plan from real citations</b> — the sources engines trust, first-party/POSSE only.</li>
            <li><b>A battle-map of the questions</b> — per engine, with N + confidence, and who’s cited instead by name.</li>
            <li className="sm:col-span-2"><b>Proof the fixes worked</b> — every number backed by a stored transcript; re-sweep and compare before/after.</li>
          </ol>
        </div>
      )}

      {/* Input — phase 1: just the domain. The AI infers everything else. */}
      {phase === 'input' && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <label htmlFor="sweep-domain" className="text-lg font-bold text-zinc-900">Enter your website — we&apos;ll do the rest</label>
            <p className="text-sm text-zinc-500 mt-1">
              We read your site, work out your brand, category, and closest competitors, and draft the buyer
              questions to test. You just confirm — then run.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="sweep-domain" value={domain} onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && domain.trim() && !analyzing) analyze(); }}
              placeholder="example.com" disabled={analyzing}
              className="flex-1 border border-zinc-300 rounded-xl px-4 py-3 text-base disabled:opacity-60" />
            <button onClick={analyze} disabled={analyzing || !domain.trim()}
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-40 whitespace-nowrap">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Reading your site…' : 'Analyze'}
            </button>
          </div>
          <p className="text-xs text-zinc-400">No https:// needed. e.g. <span className="font-mono">sanctumshield.com</span></p>
          {extractError && <p className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{extractError}</p>}
        </div>
      )}

      {/* Input — phase 2: verify the guesses + review the drafted questions, then run. */}
      {phase === 'confirm' && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{dNorm ? `We analyzed ${dNorm}` : 'Set up your sweep'}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Check the basics below — <b>we guessed these, so edit anything that&apos;s off</b> — then run the sweep.
              </p>
            </div>
            <button onClick={startOver} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 whitespace-nowrap">
              <RotateCcw className="w-3.5 h-3.5" />Start over
            </button>
          </div>
          {extractError && <p className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{extractError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Brand name
              <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed this — verify</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Example Inc"
                className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold">Core category
              <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed this — verify</span>
              <input value={coreCategory} onChange={(e) => setCoreCategory(e.target.value)} placeholder="AI governance tools"
                className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="text-sm font-semibold block">Closest competitors
            <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed these — one per line, edit freely (<span className="font-mono">Name</span> or <span className="font-mono">Name, domain.com</span>)</span>
            <textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} rows={3}
              placeholder="Knostic, knostic.ai" className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>

          {/* The questions — collapsed by default; evidence of what we'll ask, not a field to fill. */}
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <button onClick={() => setEditQueries((v) => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-zinc-50">
              <span className="text-sm font-bold text-zinc-800">Review the {totalQuestions} questions we&apos;ll ask</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                <Pencil className="w-3.5 h-3.5" />{editQueries ? 'Done editing' : 'View / edit'}
                {editQueries ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </button>
            {editQueries ? (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-zinc-100">
                <label className="text-xs font-semibold block text-zinc-700">About you (branded) — <span className="font-mono">{'{domain}'}</span> expands to your site
                  <textarea value={branded} onChange={(e) => setBranded(e.target.value)} rows={2}
                    className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
                </label>
                <label className="text-xs font-semibold block text-zinc-700">From prospective buyers (unbranded, one per line)
                  <textarea value={categoryQueries} onChange={(e) => setCategoryQueries(e.target.value)} rows={8}
                    className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
                </label>
              </div>
            ) : (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-100 text-sm">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">About you</div>
                  <ul className="space-y-0.5 text-zinc-700">
                    {brandedList.map((q, i) => <li key={i} className="flex gap-2"><span className="text-zinc-300">•</span>{q}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">From prospective customers</div>
                  {categoryList.length > 0 ? (
                    <div className="space-y-2">
                      {orderedBuckets.filter((b) => categoryList.some((q) => intentOf(q) === b)).map((b) => (
                        <div key={b}>
                          <div className="text-xs font-semibold text-zinc-500">{intentLabel[b]}</div>
                          <ul className="space-y-0.5 text-zinc-700">
                            {categoryList.filter((q) => intentOf(q) === b).map((q, i) => (
                              <li key={i} className="flex gap-2"><span className="text-zinc-300">•</span>{q}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-400 italic">No buyer questions yet — add some via View / edit.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={run} disabled={running || !domain.trim() || categoryList.length === 0}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-40">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running sweep…' : 'Run sweep'}
          </button>
          {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
        </div>
      )}

      {result && (
        <>
          {result.quickCheck && (
            <div className="rounded-3xl p-6 border-2 border-amber-300 bg-amber-50 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-black text-amber-700 leading-none">{result.provisional?.score ?? '—'}</div>
                <div className="flex-1">
                  <div className="font-bold text-amber-900">Free quick check · {result.provisional?.label}</div>
                  <p className="text-sm text-amber-800 mt-1">{result.provisional?.message}</p>
                  <p className="text-sm text-amber-900 mt-3 font-semibold">{result.upgrade}</p>
                  <button onClick={onUpgrade} className="mt-3 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors">
                    Get a Day Pass or subscribe →
                  </button>
                </div>
              </div>
            </div>
          )}
          {result.skippedEngines?.length > 0 && !result.quickCheck && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Skipped (no API key set): {result.skippedEngines.join(', ')}. Configured: {result.configured.join(', ') || 'none'}.
            </div>
          )}

          {/* Plain-English headline (UX-PRINCIPLES §4): lead with what it MEANS, not a data dump. */}
          {scorecard && (
            <div className="rounded-3xl overflow-hidden shadow-sm border border-zinc-200">
              <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-900 text-white p-6 sm:p-8">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-3">Your AI visibility · in plain English</div>
                <p className="text-lg sm:text-xl leading-relaxed font-medium text-zinc-100">{scorecard.plainSummary}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-zinc-100 bg-white">
                {[
                  { label: 'Found when asked by name', hint: 'Branded retrievability', value: scorecard.brandedRetrievabilityPct, n: scorecard.brandedRuns },
                  { label: 'Recommended to new buyers', hint: 'Category win — the metric that drives sales', value: scorecard.categoryRecommendationWinPct, n: scorecard.categoryRuns, hero: true },
                  { label: 'Your own site cited', hint: 'Owned citation rate', value: scorecard.ownedCitationRatePct, n: scorecard.ownedCitationN },
                  { label: 'Your share of the category', hint: 'You vs. competitors', value: scorecard.competitiveSharePct, n: scorecard.competitiveShareN },
                ].map((s) => (
                  <div key={s.label} className={`p-4 sm:p-5 ${s.hero ? 'bg-emerald-50/60' : ''}`}>
                    <div className={`text-3xl font-black ${tone(s.value)}`}>{s.value === null ? '—' : `${s.value}%`}</div>
                    <div className="text-sm font-bold text-zinc-800 mt-1 leading-tight">{s.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{s.hint}</div>
                    {s.value !== null && s.n > 0 && (
                      <div className="text-[11px] mt-1 leading-tight">
                        <span className="text-zinc-400">N={s.n}</span>
                        <span className={`ml-1.5 font-semibold ${confChip(s.n).cls}`}>· {confChip(s.n).label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {scorecard.modelPriorRuns > 0 && (
                <div className="bg-white border-t border-zinc-100 px-4 sm:px-5 py-3 text-[11px] text-zinc-500">
                  <b>{scorecard.modelPriorRuns}</b> category answer{scorecard.modelPriorRuns > 1 ? 's' : ''} came from the model&apos;s memory (no live web search) and {scorecard.modelPriorRuns > 1 ? 'are' : 'is'} <b>not</b> counted in the score above.
                  {scorecard.modelPriorVisibilityPct !== null && <> Of those, the model named you {scorecard.modelPriorVisibilityPct}% of the time (<i>model-prior visibility</i>).</>}
                </div>
              )}
              {pawcClient.answers > 0 && (
                <div className="bg-white border-t border-zinc-100 px-4 sm:px-5 py-3 text-[11px] text-zinc-500">
                  <b>Answer share:</b> when you&apos;re named in a category answer, you own ~{Math.round(pawcClient.avgShare * 100)}% of it (position-weighted). <span className="text-zinc-400">Position-Adjusted Word Count — a prominence measure from the Princeton GEO study, not a guarantee.</span>
                </div>
              )}
            </div>
          )}

          {/* Fidelity (B1) + entity-linking (B2): of the answers that named you, how
              many got a FACT wrong, and which wrong entities engines confused you with. */}
          {fidelity && (() => {
            const hasCited = fidelity.citedAccurate > 0 || fidelity.citedDrifted > 0;
            const collisions = entityLinking?.collisions.length ?? 0;
            const alert = fidelity.citedDrifted > 0 || collisions > 0;
            if (!hasCited && collisions === 0) return null;
            return (
            <div className={`rounded-3xl p-6 shadow-sm border ${alert ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}>
              <h3 className="font-bold flex items-center gap-2 mb-1">
                {alert ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                Fidelity — is AI accurate about you?
              </h3>
              {hasCited && (
              <p className="text-sm text-zinc-700">
                Of the answers that named you, <b>{fidelity.citedAccurate}</b> got your facts right
                {fidelity.citedDrifted > 0
                  ? <> and <b className="text-red-600">{fidelity.citedDrifted}</b> drifted (asserted something false).</>
                  : <> — no fabricated facts detected.</>}
              </p>
              )}
              {fidelity.issues.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {fidelity.issues.map((iss, i) => (
                    <li key={i} className="text-sm bg-white border border-red-200 rounded-xl px-3 py-2">
                      <span className="font-semibold text-red-700">{iss.wrong ? `“${iss.wrong}”` : iss.type.replace(/_/g, ' ')}</span>
                      <span className="text-zinc-600"> — {iss.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
              {/* B2: entity-linking — the wrong entities engines confused you with. */}
              {entityLinking && entityLinking.collisions.length > 0 && (
                <div className="mt-4 border-t border-red-200 pt-3">
                  <p className="text-sm font-bold text-zinc-800">Engines are confusing you with:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entityLinking.collisions.map((c) => (
                      <span key={c} className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-red-700 border border-red-300">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">A crowded name/acronym (and a colliding stock ticker) means engines can&apos;t cleanly resolve you. Fix: an explicit &ldquo;not affiliated with…&rdquo; line + a connected <span className="font-mono">@id</span> entity graph so your identity is unambiguous.</p>
                </div>
              )}
            </div>
            );
          })()}

          {/* Per-engine scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.summary.engines.map((e) => (
              <div key={e.engine} className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm">
                <div className="font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-zinc-400" />{ENGINE_LABEL[e.engine] || e.engine}</div>
                {(e as { errored?: boolean }).errored ? (
                  // The engine itself failed to run (bad/expired key, config) — show
                  // "Service unavailable", NOT a fake 0% that looks like a real result.
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Service unavailable
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">This engine couldn&apos;t run (bad/expired key or config). This is <b>not</b> a real 0% — retry once the engine is restored.</div>
                  </div>
                ) : e.truncatedBlocked ? (
                  // Too many answers were cut off by the token cap — the column is
                  // unreliable, so we do NOT present its score as a real measurement.
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> Column unreliable
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">{e.truncatedRuns} of this engine&apos;s answers were <b>cut off</b> before finishing — its score isn&apos;t a real measurement. Re-run at a higher token cap.</div>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 text-sm text-zinc-500">Retrievability (branded)</div>
                    <div className="text-2xl font-black">{e.brandedCited}/{e.brandedRuns} <span className="text-base font-semibold text-zinc-400">({e.retrievabilityPct}%)</span></div>
                    <div className="mt-2 text-sm text-zinc-500">Citation win (category)</div>
                    <div className={`text-2xl font-black ${e.citationWinPct >= 50 ? 'text-emerald-600' : e.citationWinPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>{e.citationWinPct}% <span className="text-xs font-semibold text-zinc-400">· N={e.categoryRuns}</span></div>
                    {e.modelPriorRuns > 0 && <div className="mt-2 text-[11px] text-zinc-400">{e.modelPriorRuns} model-prior answer{e.modelPriorRuns > 1 ? 's' : ''} (no search) reported separately</div>}
                    {e.truncatedRuns > 0 && <div className="mt-2 text-[11px] text-amber-600">{e.truncatedRuns} truncated answer{e.truncatedRuns > 1 ? 's' : ''} excluded</div>}
                    {isAdmin && <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />${e.costUsd.toFixed(3)}</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Category win by buyer segment (C3) — an out-of-segment 0% isn't failure. */}
          {segments.length > 1 && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 mb-1"><Search className="w-4 h-4 text-zinc-400" />Category win by buyer segment</h3>
              <p className="text-xs text-zinc-500 mb-3">
                {winSeg
                  ? <>Your most winnable segment is <b className="text-emerald-600">{SEGMENT_LABEL[winSeg.segment]}</b> ({winSeg.winPct}%) — concentrate there first.</>
                  : (() => {
                      const worst = largestLosingSegment(segments);
                      return worst
                        ? <>No segment is winning yet — your largest set, <b className="text-zinc-700">{SEGMENT_LABEL[worst.segment]}</b> (N={worst.categoryRuns}), isn't converting; start where your positioning fits.</>
                        : <>No segment is winning yet; start where your positioning fits.</>;
                    })()}
              </p>
              <div className="flex flex-col gap-1.5">
                {segments.map((s) => (
                  <div key={s.segment} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 text-zinc-600">{SEGMENT_LABEL[s.segment]}</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full ${s.winPct >= 50 ? 'bg-emerald-500' : s.winPct > 0 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.max(2, s.winPct)}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right font-semibold text-zinc-700">{s.winPct}% <span className="text-xs font-normal text-zinc-400">N={s.categoryRuns}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitors displacing you. Prefer the scorecard's list: when the user
              entered no competitors it auto-detects them from the answers, so this
              panel + Share of Model fill in without a re-run. */}
          {(() => {
            const comps = scorecard?.topCompetitors?.length ? scorecard.topCompetitors : result.summary.topCompetitors;
            if (!comps.length) return null;
            const auto = !!scorecard?.competitorsAutoDetected;
            return (
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-amber-500" />Cited instead of you (category queries)</h3>
                {auto ? (
                  <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-400" />Auto-detected from the answers — add your real competitors in the setup to sharpen <b>your share of the category</b>.</p>
                ) : <div className="mb-3" />}
                <div className="flex flex-wrap gap-2">
                  {comps.map((c) => (
                    <span key={c.name} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">{c.name} · {c.count}×</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Authority gap (WO-7) */}
          {authority && authority.authorityDomains.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 mb-1"><Search className="w-4 h-4 text-zinc-400" />Authority gap — sources the engines trust</h3>
              <p className="text-xs text-zinc-500 mb-3">Grouped by how attainable they are — start with what you can do yourself today.</p>
              {(['now', 'earned', 'aspirational'] as const).map((tier) => {
                const inTier = authority.authorityDomains.slice(0, 12).filter((d) => tierForDomain(d.domain).tier === tier);
                if (!inTier.length) return null;
                const tone = tier === 'now' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tier === 'earned' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
                return (
                  <div key={tier} className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">{TIER_LABEL[tier]}</div>
                    <div className="flex flex-wrap gap-2">
                      {inTier.map((d) => (
                        <span key={d.domain} title={tierForDomain(d.domain).rationale} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tone}`}>{d.domain} · {d.citations}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {authority.recommendations.map((r, i) => <p key={i} className="text-sm text-zinc-600 mb-1">{r}</p>)}
            </div>
          )}

          {/* Content depth (E2): study-backed levers that make a page citable. */}
          {pageFactDensity && pageFactDensity.flags.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 mb-1"><Search className="w-4 h-4 text-zinc-400" />Content depth — the levers that make a page citable</h3>
              <p className="text-xs text-zinc-500 mb-3">From your live page. Effect sizes are findings from the Princeton GEO study (arXiv:2311.09735), not guarantees.</p>
              <ul className="space-y-2">
                {pageFactDensity.flags.map((f) => (
                  <li key={f.key} className="text-sm text-zinc-700 flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{f.consequence}</li>
                ))}
              </ul>
            </div>
          )}

          {/* What to do about these results (UX-CLARITY-001) — measured layer → action. */}
          {scorecard && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold mb-3">What to do about these results</h3>
              <AgendaBlock lines={buildSweepActionAgenda({
                brandedRetrievabilityPct: scorecard.brandedRetrievabilityPct,
                categoryWinPct: scorecard.categoryRecommendationWinPct,
                hasFidelityOrCollision: (fidelity?.citedDrifted ?? 0) > 0 || (entityLinking?.collisions.length ?? 0) > 0,
                collisions: entityLinking?.collisions ?? [],
                losingCategoryQuestions: [...new Set(result.runs.filter((x) => x.queryType === 'category' && !x.cited && !x.truncated && x.grounding !== 'model-prior').map((x) => x.query))],
                doNowAuthorities: authority ? [...new Set(authority.authorityDomains.filter((d) => tierForDomain(d.domain).tier === 'now').map((d) => d.domain))] : [],
                brand: result.brand || undefined,
                domain: result.domain,
              })} />
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <CrossLink to="score" onClick={onOpenAnalyzer} />
              </div>
            </div>
          )}

          {/* Which tool, when? — the Score-vs-Sweep explainer (UX-CLARITY-001). */}
          <ScoreVsSweepCard />

          {/* Cost + transcripts */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold">Evidence — every answer, stored</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{result.runs.length} transcripts back the scores above — run any query yourself and you&apos;ll get what the report says.</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && <span className="text-sm font-semibold text-zinc-500 mr-1">Sweep cost ≈ ${result.summary.totalCostUsd.toFixed(3)}</span>}
                <button onClick={() => setShowTranscripts((v) => !v)}
                  className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-zinc-50">
                  {showTranscripts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{showTranscripts ? 'Hide details' : 'Show details'}
                </button>
                {showTranscripts && (
                  <button onClick={() => setExpandAll((v) => !v)}
                    className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-zinc-50">
                    <ChevronsUpDown className="w-4 h-4" />{expandAll ? 'Collapse all' : 'Expand all'}
                  </button>
                )}
                <button onClick={downloadReport}
                  className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-zinc-800">
                  <Download className="w-4 h-4" />Download report
                </button>
              </div>
            </div>
            {showTranscripts && (
            <div className="space-y-2">
              {result.runs.map((r, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl">
                  <button onClick={() => setOpenRun(openRun === i ? null : i)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm">
                    {openRun === i || expandAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {r.truncated ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">truncated — not scored</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.cited ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{r.cited ? 'cited' : 'not cited'}</span>
                    )}
                    {r.grounding === 'model-prior' && !r.truncated && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-200" title="Answered from the model's memory — no live web search">model-prior</span>
                    )}
                    {truth && r.queryType === 'branded' && r.cited && !r.truncated && classifyRunFidelity(true, r.transcript, truth).state === 'cited-drifted' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200" title="Named you but asserted a false fact">drifted</span>
                    )}
                    <span className="font-semibold">{ENGINE_LABEL[r.engine] || r.engine}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 truncate">{r.queryType}: {r.query}</span>
                  </button>
                  {(openRun === i || expandAll) && (
                    <div className="px-4 pb-3 text-sm text-zinc-700 whitespace-pre-wrap break-words border-t border-zinc-100 pt-2">
                      {r.transcript || '(no answer)'}
                      {r.sources?.length > 0 && (
                        <div className="mt-2 text-xs text-zinc-400 break-all">Sources: {r.sources.join(' · ')}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        </>
      )}

      {/* Bot hits (WO-3) */}
      {bots && bots.configured && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-3"><Bot className="w-4 h-4 text-zinc-400" />AI crawler hits ({bots.days}d) — {bots.totalHits} total</h3>
          <div className="flex gap-4 mb-4">
            {(['live', 'search', 'training'] as const).map((t) => (
              <div key={t} className="flex-1 bg-zinc-50 rounded-xl p-3 text-center">
                <div className="text-xs uppercase tracking-widest text-zinc-400">{t}</div>
                <div className="text-2xl font-black">{bots.tierTotals?.[t] || 0}</div>
                <div className="text-[10px] text-zinc-400 mt-1">{bots.tierDefinitions?.[t]?.split('.')[0]}</div>
              </div>
            ))}
          </div>
          {bots.perBot?.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-400 text-xs uppercase"><th className="py-1">Bot</th><th>Engine</th><th>Tier</th><th className="text-right">Hits</th></tr></thead>
              <tbody>
                {bots.perBot.slice(0, 12).map((b: any) => (
                  <tr key={b.bot_token} className="border-t border-zinc-100"><td className="py-1 font-mono">{b.bot_token}</td><td className="text-zinc-500">{b.engine}</td><td>{b.tier}</td><td className="text-right font-semibold">{b.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
