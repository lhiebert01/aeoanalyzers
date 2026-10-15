import { useState, useEffect } from 'react';
import { Type } from '@google/genai';
import { Play, Loader2, Bot, Trophy, AlertTriangle, ChevronDown, ChevronRight, ArrowLeft, DollarSign, Search, Download, ChevronsUpDown, Sparkles, RotateCcw, Pencil, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import { aggregateAuthorityGap, type AuthorityGapReport } from '../lib/authorityGap';
import { tierForDomain, TIER_LABEL } from '../lib/authorityTiers';
import { segmentBreakdown, winnableSegment, largestLosingSegment, SEGMENT_LABEL } from '../lib/querySegment';
import { sanitizeCompetitors, lintDefunctNames, stripNonQuestionLines, cleanBrandName } from '../lib/sweepConfig';
import { buildSweepActionAgenda } from '../lib/sweepActions';
import { buildDoNowPlan } from '../lib/doNowPlan';
import { planSweep } from '../lib/sweepPlan';
import { estimateSweepCost } from '../lib/costEstimate';
import { SCORE_VS_SWEEP } from '../content/scoreVsSweep';
import { ScoreVsSweepCard, CrossLink, AgendaBlock } from './ScoreVsSweepCard';
import { avgPawc } from '../lib/pawc';
import { auditFactDensity, type FactDensityAudit } from '../lib/factDensity';
import { sweepScorecard, confidenceLevel, confidenceLabel, aggregateSweep, scoreRun } from '../lib/citationSweep';
import type { SweepSummary, SweepRunResult, SweepScorecard, Engine, QueryType, Competitor } from '../lib/citationSweep';
import { extractTruthRecord, withSiteRecord, type TruthRecord } from '../lib/truthRecord';
import { summarizeFidelity, classifyRunFidelity, type FidelitySummary } from '../lib/fidelity';
import { doNowChecklist } from '../lib/doNowChecklist';
import { recordActions, buildSweepReport, buildSweepCover, pitchTargetsFrom, ALIAS, type SweepResponse, type SweepReportInputs } from '../lib/sweepReport';
import { CoverCard } from './CoverCard';
import { SearchConsolePanel } from './SearchConsolePanel';
import { accuracyWhenNamed } from '../lib/fidelity';
import { panelOf, panelDisclosure, testConditionsLines, type PanelVersion } from '../lib/panel';
import { classifyIntent, intentMix, INTENTS, INTENT_LABEL } from '../lib/queryIntent';
import { otherPanels, describeDenominator, buildSeries, pooledFromSummary, rescoreNote, SCORING_VERSION, type SeriesPoint } from '../lib/sweepDisclosure';
import { extractBeliefs, flaggedWrongValues, flaggedSiteValues, ENGINE_LABEL as BELIEF_ENGINE } from '../lib/beliefs';
import { detectEntityLinkingFailures, type EntityLinkingReport } from '../lib/entityLinking';
import { getAccessToken, supabaseQuery, supabaseUpdate } from '../supabase';
import { coverageHeadline, coverageAction, corroboration, corroborationLine, vendorBase, vendorBaseLine, type SourceCoverage } from '../lib/sourceCoverage';
import { latestScoreFor } from '../lib/latestFigures';
import { OWNER_ORDER, OWNER_DESC, nextSweepLine } from '../lib/ownerTags';
import { measuredAfterView, PANEL_DIFFERS, MEASURED_AFTER, fmtDay, type RecordEntry, type SweepFigures } from '../lib/theRecord';
import { figuresFrom, previousSweepFigures } from '../lib/recordStore';
import { RecordPanel } from './RecordPanel';
import { GuidePanel, type GuideAccess } from './GuidePanel';
import { buildGuide, guideRecordActions, type BusinessType, type GuideScore } from '../lib/stepGuide';
import { latestScoreDetail, rememberedBusinessType } from '../lib/guideData';
import type { SiteFacts } from '../lib/truthRecord';
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
    // `purpose` is what lets the shared LLM proxy refuse sweep setup for a free
    // caller (WO-AEO-TIER-LEAK-007 §2.1). The analyzer's own calls carry no
    // purpose and are unaffected — a free user's score still works.
    body: JSON.stringify({ prompt, schema, purpose: 'sweep-config' }),
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

const ENGINE_LABEL: Record<string, string> = {
  claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', grok: 'Grok',
};

export default function SweepDashboard({ onUpgrade, isAdmin, isPaidUser, planPanel, onOpenAnalyzer, savedSweepId, onBackToHistory, recordEnabled }: { onUpgrade?: () => void; isAdmin?: boolean; isPaidUser?: boolean; planPanel?: PanelVersion; onOpenAnalyzer?: () => void; savedSweepId?: string | null; onBackToHistory?: () => void; recordEnabled?: boolean }) {
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
  const [showAllComps, setShowAllComps] = useState(false);
  // WO-AEO-REPORT-POLISH-001 G2: near-name domains the OWNER confirmed are theirs.
  const [ownedDomains, setOwnedDomains] = useState<string[]>([]);
  // WO-AEO-PRODUCT-FIXES-003: 4.2 what moved on re-score (shown, and written back); 4.4 the dated series.
  const [rescoreNoteText, setRescoreNoteText] = useState<string | null>(null);
  // WO-006: panel (admin choice; v1.1 is the series of record) and the country named inside each category question.
  const [panel, setPanel] = useState<PanelVersion>('v1.1');
  const [location, setLocation] = useState('United States');
  const [seriesOtherPanels, setSeriesOtherPanels] = useState<PanelVersion[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const fetchSeries = (dom: string, current: { panel?: PanelVersion; id: string; domain: string; created_at: string; category?: string | null; category_queries?: string[] | null }) => {
    supabaseQuery('citation_sweeps', `domain=ilike.${encodeURIComponent(dom)}&select=id,domain,created_at,summary,category,category_queries,branded_queries,scoring_version&order=created_at.asc`)
      .then(({ data }) => { setSeries(buildSeries((data || []) as any, current as any)); setSeriesOtherPanels(otherPanels((data || []) as any, current as any)); })
      .catch(() => setSeries([]));
  };
  async function markOwned(domain: string) {
    const d = domain.toLowerCase().replace(/^www\./, '');
    const next = ownedDomains.includes(d) ? ownedDomains : [...ownedDomains, d];
    setOwnedDomains(next);
    // Re-derive the finding with the owner's ruling applied — no re-run, no engine spend.
    if (result && truth) {
      const brandedRuns = result.runs.filter((r) => r.queryType === 'branded');
      setEntityLinking(detectEntityLinkingFailures(brandedRuns, { domain: result.domain, brand: result.brand || truth.brandName || undefined }, truth, next));
    }
    // Persist on the saved sweep row (P1-B config memory). Best-effort: a failed write keeps
    // the on-screen ruling, and the next sweep re-sends ownedDomains in its request body.
    if (savedSweepId) { try { await supabaseUpdate('citation_sweeps', `id=eq.${savedSweepId}`, { owned_domains: next }); } catch { /* keep the on-screen ruling */ } }
  }
  const [pageFactDensity, setPageFactDensity] = useState<FactDensityAudit | null>(null);
  const [truth, setTruth] = useState<TruthRecord | null>(null);
  // WO-012 B: Source coverage (dated by its fetch) and page one's "Ready to be cited".
  const [sourceCoverage, setSourceCoverage] = useState<SourceCoverage | null>(null);
  const [coverageState, setCoverageState] = useState<'idle' | 'running' | 'error'>('idle');
  const [currentSweepId, setCurrentSweepId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<{ score: number } | null>(null);
  // WO-012 G: the Record for this domain, and the previous sweep's figures.
  const [recordEntries, setRecordEntries] = useState<RecordEntry[]>([]);
  const [previousFigures, setPreviousFigures] = useState<SweepFigures | null>(null);
  useEffect(() => {
    setPreviousFigures(null);
    if (!recordEnabled || !result || result.quickCheck) return;
    let live = true;
    previousSweepFigures(result.domain, result.generatedAt, ownedDomains).then((f) => { if (live) setPreviousFigures(f); }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.domain, result?.generatedAt, recordEnabled]);
  // WO-014: the step-by-step guide — site facts from the sweep snapshot or the latest coverage
  // check, and the domain's latest AEO Score, all stored data.
  const [siteFacts, setSiteFacts] = useState<SiteFacts | null>(null);
  const [guideScore, setGuideScore] = useState<GuideScore | null>(null);
  const guideAccess: GuideAccess = isAdmin || isPaidUser ? (recordEnabled ? 'full' : 'sweep-only') : 'none';
  useEffect(() => {
    setGuideScore(null);
    if (!result || result.quickCheck || guideAccess === 'none') return;
    let live = true;
    latestScoreDetail(result.domain).then((s) => { if (live) setGuideScore(s); }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.domain, result?.generatedAt, guideAccess]);
  const guideFor = (r: SweepResponse, type: BusinessType | null) => buildGuide({
    domain: r.domain, date: new Date(), brand: r.brand, site: truth?.site || siteFacts, score: guideScore,
    split: buildSweepCover(reportInputs(r)).split ?? null, coverage: sourceCoverage, category: coreCategory || null,
    businessType: type ?? (rememberedBusinessType(r.domain) as BusinessType | null), record: recordEnabled ? recordEntries : null,
  });
  const nowFigures = (r: SweepResponse | null): SweepFigures | null => r ? figuresFrom(r.generatedAt, r.summary as any, r.runs, r.domain, ownedDomains, sourceCoverage) : null;
  async function runCoverage(id: string) {
    setCoverageState('running');
    try {
      const token = getAccessToken();
      const r = await fetch('/api/source-coverage', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ sweepId: id }) });
      const j = await r.json();
      if (!r.ok || !j.sourceCoverage) throw new Error(j.error || 'failed');
      setSourceCoverage(j.sourceCoverage); if (j.siteFacts) setSiteFacts(j.siteFacts); setCoverageState('idle');
    } catch { setCoverageState('error'); }
  }
  const [bots, setBots] = useState<any | null>(null);
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);

  // WO-AEO-MOBILE-HISTORY-001 Part B — saved-sweep view. When a savedSweepId is
  // passed, rebuild the results page from STORED data (citation_sweeps + sweep_results)
  // with no engine calls and $0 cost. Point-in-time fidelity/entity-linking/content-
  // depth are NOT persisted (derived live at run time) and are intentionally not
  // re-queried here, so those sections simply don't render in a saved view.
  const savedView = !!savedSweepId;
  // WO-AEO-TIER-LEAK-007 — founder ruling, Sep 8 2026: "unless users pay for the
  // sweep, no sweep functionality should work." Not the questions, not the
  // competitor inference, not the auto-fill, not the downloads. The page still
  // explains what a sweep is and offers the Day Pass; nothing on it runs.
  // The server refuses independently (api/run-sweep 402, api/llm-generate 402 on
  // purpose=sweep-config) — this flag only decides what is worth drawing.
  const paidViewer = !!isAdmin || !!isPaidUser;
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);
  // A saved sweep that predates the Sep-2 snapshot column has no point-in-time layers.
  const [savedSnapshotMissing, setSavedSnapshotMissing] = useState(false);

  useEffect(() => {
    if (!savedSweepId) return;
    let cancelled = false;
    (async () => {
      setSavedLoading(true); setSavedError(null);
      setResult(null); setAuthority(null); setFidelity(null); setEntityLinking(null); setPageFactDensity(null); setTruth(null); setBots(null);
      setSavedSnapshotMissing(false);
      setShowTranscripts(false); setExpandAll(false); setOpenRun(null);
      try {
        const { data: sweeps, error: e1 } = await supabaseQuery('citation_sweeps', `id=eq.${savedSweepId}&select=*`);
        if (e1) throw new Error('Could not load this sweep.');
        const sweep = sweeps?.[0];
        if (!sweep) throw new Error('Sweep not found (it may belong to another account).');
        const { data: rows, error: e2 } = await supabaseQuery('sweep_results', `sweep_id=eq.${savedSweepId}&select=*&order=run_index.asc`);
        if (e2) throw new Error('Could not load this sweep’s stored answers.');
        // Raw runs from stored rows. NOTE: the stored `cited` is intentionally NOT used —
        // we RE-SCORE below so the branded false-positive fix, domainCited (owned-citation),
        // citedCompetitors (cited-instead/share) and the "site not found" label are all
        // recovered on reopen against the persisted config (WO-INTEGRITY-002 A1/A2).
        const raw: SweepRunResult[] = (rows || []).map((r: any) => ({
          engine: r.engine as Engine,
          query: r.query,
          queryType: r.query_type as QueryType,
          runIndex: r.run_index,
          transcript: r.transcript || '',
          sources: r.sources || [],
          // WO-AEO-REPORT-INTEGRITY-003 §2.4 amendment. The LIVE path zeroes cost
          // server-side in api/run-sweep for non-admins, but this SAVED path reads
          // cost_usd straight from Supabase, so without this the real figure reaches
          // the client and only a render-time flag keeps it out of the download.
          // Strip it from the DATA, so the field is absent from the artifact and not
          // merely hidden on the screen.
          costUsd: isAdmin ? Number(r.cost_usd) || 0 : 0,
          citedCompetitors: r.cited_competitors || [],
          truncated: r.truncated ?? undefined,
          grounding: (r.grounding as SweepRunResult['grounding']) ?? undefined,
        }));
        // The ENTERED config, persisted on the row (WO-INTEGRITY-002 A1). NULL on pre-fix
        // sweeps → empty competitor list (auto-detect, as before), but domainCited is still
        // recovered from the transcript by the re-score.
        const brandArg = sweep.brand || undefined;
        const savedCompetitors: Competitor[] = Array.isArray(sweep.competitors) ? sweep.competitors : [];
        const savedOwned: string[] = Array.isArray(sweep.owned_domains) ? sweep.owned_domains : [];
        setOwnedDomains(savedOwned);
        const scored = raw.map((r) => scoreRun(r, { domain: sweep.domain, brand: brandArg }, savedCompetitors));

        // Deterministic order: engine (canonical), then question index (panel order if
        // persisted, else first-seen), then rep — so the rebuild matches the live run.
        const ENGINE_ORDER: Engine[] = ['claude', 'openai', 'perplexity', 'gemini', 'grok'];
        const panelOrder: string[] = [...(sweep.branded_queries || []), ...(sweep.category_queries || [])];
        const firstSeen: string[] = [];
        const qIndex = (q: string) => {
          const p = panelOrder.indexOf(q);
          if (p >= 0) return p;
          let s = firstSeen.indexOf(q);
          if (s < 0) s = firstSeen.push(q) - 1;
          return panelOrder.length + s;
        };
        scored.sort((a, b) =>
          (ENGINE_ORDER.indexOf(a.engine) - ENGINE_ORDER.indexOf(b.engine)) ||
          (qIndex(a.query) - qIndex(b.query)) ||
          (a.runIndex - b.runIndex));

        const engines = ENGINE_ORDER.filter((e) => scored.some((r) => r.engine === e));
        const runsPerQuery = scored.length ? Math.max(...scored.map((r) => r.runIndex)) + 1 : 0;
        const reconstructed: SweepResponse = {
          domain: sweep.domain,
          brand: sweep.brand ?? null,
          runsPerQuery,
          engines,
          skippedEngines: [],
          configured: engines,
          // WO-006: keep the stored panel + location — the rebuild must not erase them (nor its write-back).
          summary: { ...aggregateSweep(scored, { domain: sweep.domain, brand: brandArg }, savedCompetitors), ...(sweep.summary?.panel ? { panel: sweep.summary.panel } : {}) } as SweepSummary,
          runs: scored,
          persisted: true,
          generatedAt: sweep.created_at,
          // THE GATE FOLLOWS THE VIEWER, NOT THE RUN. A live run carries the tier the
          // server resolved for whoever asked. A rebuild carried none, so `tier` was
          // undefined and `tier !== 'free'` was true — every saved sweep rendered the
          // paid Do-Now steps to whoever could open it. Unreachable for a never-paid
          // account (free sweeps are quick checks and are never persisted) but wide
          // open on the one path that exists: a Pro subscriber whose plan lapses keeps
          // every stored sweep and reads it as a free user. Found writing the check-7
          // instructions, Sep 8 2026.
          tier: (isAdmin || isPaidUser) ? 'paid' : 'free',
        };
        if (cancelled) return;
        setResult(reconstructed);
        // WO-AEO-PRODUCT-FIXES-003 §4.2: the stored figure and the opened figure are the same
        // number, or the row says why they differ. Re-scoring here under newer rules than the
        // row was stored with writes the opened summary back with the version and a note.
        {
          const stored = pooledFromSummary(sweep.summary);
          const now = pooledFromSummary(reconstructed.summary);
          const pooledNote = rescoreNote(sweep.scoring_version, stored, now);
          // WO-004: History shows accuracy-when-named from the stored summary; add it when the row has a snapshot.
          // WO-010 A: judge against what the site published at the sweep's own time (prices, free
          // allowance, retired names); for our own domain the dated record fills an older snapshot.
          const truthAtRun = withSiteRecord(sweep.full_result?.truth as TruthRecord | undefined, sweep.domain, sweep.created_at);
          const awnSaved = accuracyWhenNamed(scored.filter((r) => r.queryType === 'branded'), truthAtRun);
          const storedAwn = sweep.summary?.accuracyWhenNamed as { accurate: number; named: number } | undefined;
          const awnMoved = !!(awnSaved && storedAwn && (storedAwn.accurate !== awnSaved.accurate || storedAwn.named !== awnSaved.named));
          const awnNote = awnMoved ? `Described accurately when named ${storedAwn!.accurate}/${storedAwn!.named} → ${awnSaved!.accurate}/${awnSaved!.named}: scoring rules ${SCORING_VERSION} also check the prices, free allowance and product names your site published.` : null;
          const summaryOut = awnSaved ? { ...reconstructed.summary, accuracyWhenNamed: { accurate: awnSaved.accurate, named: awnSaved.named } } : reconstructed.summary;
          const note = [pooledNote, awnNote].filter(Boolean).join(' ') || null;
          setRescoreNoteText(note);
          if (note || sweep.scoring_version !== SCORING_VERSION || (awnSaved && !sweep.summary?.accuracyWhenNamed)) {
            supabaseUpdate('citation_sweeps', `id=eq.${savedSweepId}`, { summary: summaryOut, scoring_version: SCORING_VERSION, rescored_at: new Date().toISOString(), rescore_note: note })
              .then((r) => { if (r.error) return supabaseUpdate('citation_sweeps', `id=eq.${savedSweepId}`, { summary: summaryOut }); })
              .catch(() => { /* best effort; the screen already shows the re-scored figure and the note */ });
          }
        }
        // §4.4: every sweep of this domain on the same configs, oldest first.
        fetchSeries(sweep.domain, sweep);
        setAuthority(aggregateAuthorityGap(scored, sweep.domain));
        setSavedDate(sweep.created_at);
        setSourceCoverage((sweep.full_result?.sourceCoverage as SourceCoverage | undefined) ?? null);
        setSiteFacts((sweep.full_result?.truth?.site || sweep.full_result?.siteFacts || null) as SiteFacts | null);
        setCurrentSweepId(savedSweepId);
        latestScoreFor(sweep.domain).then(setReadiness).catch(() => setReadiness(null));
        setDomain(sweep.domain);
        setBrand(sweep.brand || '');
        // Feed the scorecard the SAME entered competitors (not auto-detect) so cited-instead
        // and category-share match the live run. Empty on pre-fix sweeps → auto-detect.
        setCompetitors(savedCompetitors.map((c) => (c.domain ? `${c.name}, ${c.domain}` : c.name)).join('\n'));
        const runs = scored; // downstream (fidelity/entity-linking) uses the re-scored runs

        // WO-AEO-MOBILE-HISTORY-001: rebuild every point-in-time layer the as-run
        // screen shows from the compact snapshot persisted at run time (full_result:
        // { truth, factDensity }, added in the 20260902 migration). truth drives BOTH
        // fidelity/drift and entity-linking collisions; factDensity is the content-depth
        // audit. So a saved sweep === the original run (same screen + same downloaded
        // report). Nothing is re-fetched from the client's site (that would be a
        // different point in time) and nothing is fabricated.
        const savedTruth = withSiteRecord(sweep.full_result?.truth as TruthRecord | undefined, sweep.domain, sweep.created_at) ?? undefined;
        const savedFactDensity = sweep.full_result?.factDensity as FactDensityAudit | undefined;
        if (savedTruth) {
          const brandedRuns = runs.filter((r) => r.queryType === 'branded');
          setTruth(savedTruth);
          setFidelity(summarizeFidelity(brandedRuns, savedTruth));
          setEntityLinking(detectEntityLinkingFailures(brandedRuns, { domain: sweep.domain, brand: sweep.brand || savedTruth.brandName || undefined }, savedTruth, savedOwned));
        }
        if (savedFactDensity) setPageFactDensity(savedFactDensity);
        // A sweep run before the snapshot column existed carries no point-in-time layers.
        if (!savedTruth) setSavedSnapshotMissing(true);
        // Crawler-hit telemetry is a rolling 30-day window (not a page snapshot), so it
        // is re-read live by domain — $0, no engine call. Same behavior as a live run.
        fetch(`/api/bot-stats?domain=${encodeURIComponent(sweep.domain)}`)
          .then((r) => r.json()).then((b) => { if (!cancelled) setBots(b); }).catch(() => {});
      } catch (err: any) {
        if (!cancelled) setSavedError(err?.message || 'Could not load this saved sweep.');
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [savedSweepId]);

  // URL-first flow: 'input' (just the domain) → 'confirm' (verify auto-extracted
  // brand/category/competitors + review the drafted questions) → run.
  const [phase, setPhase] = useState<'input' | 'confirm'>('input');
  const [analyzing, setAnalyzing] = useState(false);
  // WO-INTEGRITY-002 P1-B: where the confirm-panel values came from — a fresh AI guess or
  // this user's last sweep of the same domain (config memory).
  const [configSource, setConfigSource] = useState<'guess' | 'prior'>('guess');
  const [priorSweepDate, setPriorSweepDate] = useState<string | null>(null);
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
  // WO-INTEGRITY-002 C1: questions only — drop pasted section labels / non-question lines.
  const parseQuestions = (s: string) => stripNonQuestionLines(parseLines(s));
  const parseCompetitors = (s: string) =>
    parseLines(s).map((l) => {
      const [name, dom] = l.split(',').map((x) => x.trim());
      return { name, domain: dom || undefined };
    });



  // Step 1: user enters only the domain → crawl it, infer the basics, draft the
  // buyer questions, then surface them for confirmation (nothing runs/costs a
  // sweep yet). Falls back to the manual confirm panel if the site can't be read.
  async function analyze(forceGuess = false) {
    if (!paidViewer) return; // WO-007: no site read, no inference, no auto-fill on free
    const d = normDomain(domain);
    if (!d) return;
    setAnalyzing(true); setExtractError(null);
    // WO-INTEGRITY-002 P1-B: config memory. If this user has swept this domain before,
    // reuse the config they last ran (persisted on citation_sweeps by A1) instead of
    // re-guessing. RLS ("owner reads sweeps", auth.uid()=user_id) means this only ever
    // returns the user's own rows — a cross-user read yields nothing.
    if (!forceGuess) {
      try {
        const { data } = await supabaseQuery('citation_sweeps',
          `domain=eq.${encodeURIComponent(d)}&competitors=not.is.null&select=brand,category,competitors,branded_queries,category_queries,owned_domains,created_at&order=created_at.desc&limit=1`);
        const prior = data?.[0];
        if (prior && (prior.category || (prior.competitors || []).length || (prior.category_queries || []).length)) {
          setBrand(prior.brand || '');
          setCoreCategory(prior.category || '');
          setCompetitors((prior.competitors || []).map((c: any) => (c.domain ? `${c.name}, ${c.domain}` : c.name)).join('\n'));
          const cq: string[] = prior.category_queries || [];
          setCategoryQueries(cq.join('\n'));
          setGeneratedQueries(cq.map((query) => ({ intent_type: '', query })));
          setOwnedDomains(Array.isArray(prior.owned_domains) ? prior.owned_domains : []);
          setConfigSource('prior'); setPriorSweepDate(prior.created_at);
          setPhase('confirm'); setAnalyzing(false);
          return;
        }
      } catch { /* fall through to a fresh guess */ }
    }
    setConfigSource('guess'); setPriorSweepDate(null);
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
      const guessedBrand = cleanBrandName(String(ext.brand || ''));
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
    if (!paidViewer) return; // WO-007: the server refuses too (402); this saves the round trip
    setError(null); setResult(null); setAuthority(null); setFidelity(null); setEntityLinking(null); setPageFactDensity(null); setTruth(null); setSourceCoverage(null); setSiteFacts(null); setCurrentSweepId(null); setRunning(true);
    try {
      const d = normDomain(domain);
      const expand = (q: string) => q.replace(/\{domain\}/g, d);
      const token = getAccessToken();
      const res = await fetch('/api/run-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          domain: d, brand: brand.trim() || undefined,
          category: coreCategory.trim() || undefined, // WO-INTEGRITY-002 A1: persisted for pin/rebuild
          brandedQueries: parseQuestions(branded).map(expand),
          categoryQueries: parseQuestions(categoryQueries).map(expand),
          competitors: parseCompetitors(competitors),
          ownedDomains, // G2 config memory
          // Only admin picks the panel; for customers the plan decides it server-side.
          panel: isAdmin ? panel : undefined, location: location.trim() || null, // WO-006
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `sweep failed (${res.status})`);
      setResult(json);
      // WO-012 B8: Source coverage runs automatically at the end of every new sweep.
      if (json.sweepId) { setCurrentSweepId(json.sweepId); runCoverage(json.sweepId); }
      latestScoreFor(d).then(setReadiness).catch(() => setReadiness(null));
      setRescoreNoteText(null);
      fetchSeries(d, { id: 'live', panel: (json.summary?.panel?.version as PanelVersion) || panel, domain: d, created_at: new Date().toISOString(), category: coreCategory.trim() || null, category_queries: (json.runs || []).filter((x: any) => x.queryType === 'category').map((x: any) => x.query).filter((q: string, i: number, a: string[]) => a.indexOf(q) === i) });
      setAuthority(aggregateAuthorityGap(json.runs || [], d));
      fetch(`/api/bot-stats?domain=${encodeURIComponent(d)}`).then((r) => r.json()).then(setBots).catch(() => {});
      // B1: build the client's truth record from their own live site, then check
      // the branded answers for drift (fabricated founders etc.). No sweep cost —
      // a single page fetch; grounded against first-party JSON-LD + llms.txt.
      const fetchSite = (url: string) => fetch('/api/fetch-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then((r) => r.json()).catch(() => null);
      // WO-010 A: the pricing page as well, so a quoted price is checked against what the site publishes.
      Promise.all([fetchSite(d), fetchSite(`${d.replace(/\/+$/, '')}/pricing`)])
        .then(([site, pricing]) => {
          if (!site?.html) return;
          const tr = withSiteRecord(extractTruthRecord(site.html, site.llmsTxt, pricing?.html || null), d, new Date()) as TruthRecord;
          setTruth(tr);
          setPageFactDensity(auditFactDensity(site.html)); // E2: content-depth audit
          const brandedRuns = (json.runs || []).filter((r: SweepRunResult) => r.queryType === 'branded');
          setFidelity(summarizeFidelity(brandedRuns, tr));
          // B2: which wrong entities the engines confused you with (from cited sources).
          setEntityLinking(detectEntityLinkingFailures(brandedRuns, { domain: d, brand: json.brand || tr.brandName || undefined }, tr, ownedDomains));
        })
        .catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'sweep failed');
    } finally {
      setRunning(false);
    }
  }

  // Lane C: the report is ONE pure function (lib/sweepReport.ts) shared by the .md, the .docx,
  // the saved view and the PDF — a test regenerates the founder's Nybsys report from stored runs.
  function reportInputs(r: SweepResponse): SweepReportInputs {
    return { result: r, competitors: parseCompetitors(competitors), fidelity, entityLinking, authority, bots, truth, pageFactDensity, ownedDomains, isAdmin: !!isAdmin, savedView, category: coreCategory || null, readiness, sourceCoverage, record: recordEnabled ? { entries: recordEntries, previous: previousFigures, now: nowFigures(r) } : null };
  }
  function buildReport(r: SweepResponse): string { return buildSweepReport(reportInputs(r)); }

  function downloadReport() {
    if (!result) return;
    const stamp = new Date(result.generatedAt || Date.now()).toISOString().slice(0, 10);
    const blob = new Blob([buildReport(result)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citation-sweep-report-${result.domain}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Same report text as the .md, rendered to .docx so it opens natively on
  // iPhone / Files / Google Drive (iOS has no Markdown viewer — QA Sep 7 2026).
  const [docxBusy, setDocxBusy] = useState(false);
  async function downloadDocx() {
    if (!result || docxBusy) return;
    setDocxBusy(true);
    try {
      const stamp = new Date(result.generatedAt || Date.now()).toISOString().slice(0, 10);
      const { generateSweepDocx } = await import('../services/sweepDocx');
      await generateSweepDocx(buildReport(result), result.domain, stamp);
    } catch (e: any) {
      setError(`Word export failed: ${e?.message || e}`);
    } finally {
      setDocxBusy(false);
    }
  }

  // Lane E: print-to-PDF of the same report text (see services/sweepPdf.ts for the route).
  async function downloadPdf() {
    if (!result) return;
    const stamp = new Date(result.generatedAt || Date.now()).toISOString().slice(0, 10);
    const { openSweepPdf } = await import('../services/sweepPdf');
    if (!openSweepPdf(buildReport(result), result.domain, stamp)) setError('PDF export needs a pop-up window — allow pop-ups for this site and try again.');
  }

  const scorecard: SweepScorecard | null =
    result && !result.quickCheck
      ? sweepScorecard(result.runs, { domain: result.domain, brand: result.brand || undefined }, parseCompetitors(competitors))
      : null;
  // WO-AEO-PRODUCT-FIXES-003 §4.3: what each N is counted out of.
  // WO-004: described accurately when named — beneath retrievability, never instead of it.
  const accuracy = result && truth ? accuracyWhenNamed(result.runs.filter((r) => r.queryType === 'branded'), truth) : null;
  const denominator = result && scorecard ? describeDenominator(result.runs, (result.configured?.length || result.engines?.length || 0), result.runsPerQuery, scorecard) : null;

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
    const label = confidenceLabel(n);
    const cls = lvl === 'low' ? 'text-amber-600' : lvl === 'med' ? 'text-zinc-500' : 'text-emerald-600';
    return { label, cls };
  };

  // Confirm-panel display: expanded question lists + the total we'll actually ask.
  const dNorm = normDomain(domain);
  const brandedList = parseQuestions(branded).map((q) => q.replace(/\{domain\}/g, dNorm));
  const categoryList = parseQuestions(categoryQueries);
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
  // WO-006 Item D: five buyer intents, deterministic and category-aware, so an edited question is
  // tagged the same way as a generated one (the old grouping fell to "Other" on any edit).
  const intentOf = (q: string): string => classifyIntent(q, coreCategory).intent;
  const orderedBuckets: string[] = INTENTS;
  const intentLabel: Record<string, string> = INTENT_LABEL;
  void intentBucket; void generatedQueries;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Citation Sweeps & Monitoring</h1>
        <p className="text-zinc-500 mt-2">
          We ask the real answer engines your buyers&apos; questions — with web search on, one or more times each depending on how many questions you ask (the per-cell N is shown on every result) — and measure three separate things: are you found when asked by name, are you recommended when buyers ask the category, and who gets cited instead. Every answer is stored as a transcript you can check.
        </p>
        <p className="text-sm text-teal-700 mt-2 font-medium">{SCORE_VS_SWEEP.tagline.sweeps}</p>
      </div>

      {/* WO-AEO-MOBILE-HISTORY-001 Part B — saved-sweep banner (B1). */}
      {savedView && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4">
          <div className="text-sm text-indigo-900">
            <span className="font-bold">Viewing Saved Sweep</span>
            {savedDate && <span className="text-indigo-700"> · {new Date(savedDate).toLocaleDateString()}</span>}
            {rescoreNoteText && <span className="block text-xs text-indigo-900 mt-1"><b>Re-scored on open:</b> {rescoreNoteText}</span>}
            <span className="block text-xs text-indigo-600 mt-0.5">Rebuilt from stored transcripts — no new engine calls, $0. Scores recomputed from the stored answers; errored runs (rate-limit / timeout) are excluded, so a sweep run before Sep 2, 2026 is corrected here.</span>
          </div>
          <button onClick={onBackToHistory} className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:text-indigo-900 whitespace-nowrap">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
        </div>
      )}
      {savedView && savedLoading && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>
      )}
      {savedView && savedError && !savedLoading && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{savedError}</div>
      )}

      {/* Condensed "what you actually get" — the 5-layer action plan (blog: /blog/what-you-actually-get). */}
      {phase === 'input' && !result && !savedView && (
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

      {/* WO-AEO-TIER-LEAK-007 — the free-tier wall. The page above explains what a
          sweep is and what it returns; from here down, nothing runs. No domain box,
          so no site fetch, no competitor inference, no drafted question bank, no
          engine call, no download. The question bank is the expensive half of this
          product and it was being handed over before payment. */}
      {!paidViewer && !savedView && (
        <div className="bg-white border-2 border-dashed border-zinc-300 rounded-3xl p-8 sm:p-10">
          <div className="text-center">
            <div className="inline-flex bg-zinc-900 p-4 rounded-2xl mb-5 shadow-xl">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Citation Sweeps are a paid feature</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
              A sweep is not a score. It is a measurement of what the answer engines actually say about
              you, run against your buyers&apos; own questions, with every answer kept so you can check it.
            </p>
          </div>

          <ul className="mt-7 max-w-2xl mx-auto space-y-3 text-sm text-zinc-700">
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>The answer engines in your plan, with web search on</b> — ChatGPT, Claude, Perplexity and Gemini, plus Grok on Pro and Business,
              asked the way a buyer asks them.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>Your buyers&apos; questions, not a generic list</b> — we read your site and draft them
              from your brand, your category and your closest competitors. You edit them before anything runs.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>Repeated runs per question</b> — engines are not deterministic, so each question is
              asked more than once and the per-cell N is shown on every number.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>Three separate measurements, never one blended score</b> — whether you are found when
              asked by name, whether you are recommended when the category is asked, and who gets cited
              instead of you, by name.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>Every answer stored as a transcript</b> — open any number, read the answer behind it,
              and run the same question yourself to see we are telling you the truth.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>Written to your history</b> — so a later sweep measures before against after, and the
              fixes either moved the number or they did not.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span><b>It ends in an action plan, not a number</b> — what to change, where, and what each
              change does and does not do.</span>
            </li>
          </ul>

          <div className="mt-8 text-center">
            <button onClick={onUpgrade}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20">
              Get a Day Pass or subscribe <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <p className="text-sm text-zinc-600 mt-4 max-w-xl mx-auto">
              <b>The Day Pass is the trial</b> — $29 for twenty-four hours, no subscription, and a real
              full sweep. There is no sample run and no cut-down version, because one engine asked once is
              not a measurement, and a number we would not stand behind is the opposite of what this tool
              is for.
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              Your AEO score and your gaps stay free — run those on the{' '}
              <button onClick={onOpenAnalyzer} className="font-semibold text-indigo-600 hover:underline">Analyzer</button>{' '}
              as often as you like.
            </p>
          </div>
        </div>
      )}

      {/* Input — phase 1: just the domain. The AI infers everything else. */}
      {phase === 'input' && !savedView && paidViewer && (
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
            <button onClick={() => analyze()} disabled={analyzing || !domain.trim()}
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
      {phase === 'confirm' && !savedView && paidViewer && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{dNorm ? `We analyzed ${dNorm}` : 'Set up your sweep'}</h2>
              {/* WO-INTEGRITY-002 P1-B: provenance — reused config vs a fresh guess. */}
              {configSource === 'prior' ? (
                <p className="text-sm text-emerald-700 mt-1">
                  <b>From your last sweep{priorSweepDate ? ` on ${new Date(priorSweepDate).toLocaleDateString()}` : ''}</b> — edit anything that&apos;s off, then run. <button onClick={() => analyze(true)} className="underline text-zinc-500 hover:text-zinc-800">start from a fresh guess</button> instead.
                </p>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">
                  Check the basics below — <b>we guessed these, so edit anything that&apos;s off</b> — then run the sweep.
                </p>
              )}
            </div>
            <button onClick={startOver} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 whitespace-nowrap">
              <RotateCcw className="w-3.5 h-3.5" />Start over
            </button>
          </div>
          {extractError && <p className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{extractError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Brand name
              {configSource === 'prior' ? <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-emerald-600"><Sparkles className="w-3 h-3" />from your last sweep</span> : <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed this — verify</span>}
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Example Inc"
                className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold">Core category
              {configSource === 'prior' ? <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-emerald-600"><Sparkles className="w-3 h-3" />from your last sweep</span> : <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed this — verify</span>}
              <input value={coreCategory} onChange={(e) => setCoreCategory(e.target.value)} placeholder="AI governance tools"
                className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="text-sm font-semibold block">Closest competitors
            {configSource === 'prior'
              ? <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-emerald-600"><Sparkles className="w-3 h-3" />from your last sweep — one per line, edit freely (<span className="font-mono">Name</span> or <span className="font-mono">Name, domain.com</span>)</span>
              : <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-indigo-500"><Sparkles className="w-3 h-3" />we guessed these — one per line, edit freely (<span className="font-mono">Name</span> or <span className="font-mono">Name, domain.com</span>)</span>}
            <textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} rows={3}
              placeholder="Knostic, knostic.ai" className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>

          {/* WO-006 Item C: the country is named INSIDE each buyer question, not left to account settings. */}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold block text-zinc-700">Market — named inside each buyer question
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. United States (blank = not named)"
                className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
            </label>
            {isAdmin && (
              <label className="text-xs font-semibold block text-zinc-700">Engine panel (admin)
                <select value={panel} onChange={(e) => setPanel(e.target.value as PanelVersion)} className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm">
                  <option value="v1.1">v1.1 — ChatGPT, Claude, Perplexity, Gemini (series of record)</option>
                  <option value="v1.2">v1.2 — v1.1 + Grok (its own series)</option>
                </select>
              </label>
            )}
          </div>

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
                  {categoryList.length > 0 && (() => { const m = intentMix(categoryList, coreCategory); return (
                    <div className="flex flex-wrap gap-1.5 mb-2" aria-label="Question mix by buyer intent">
                      {INTENTS.filter((i) => m[i]).map((i) => <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">{INTENT_LABEL[i]} · {m[i]}</span>)}
                    </div>); })()}
                  {categoryList.length > 0 ? (
                    <div className="space-y-2">
                      {orderedBuckets.filter((b) => categoryList.some((q) => intentOf(q) === b)).map((b) => (
                        <div key={b}>
                          <div className="text-xs font-semibold text-zinc-500">{intentLabel[b]}</div>
                          <ul className="space-y-0.5 text-zinc-700">
                            {categoryList.filter((q) => intentOf(q) === b).map((q, i) => (
                              <li key={i} className="flex gap-2" title={classifyIntent(q, coreCategory).rule}><span className="text-zinc-300">•</span>{q}<span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">{INTENT_LABEL[classifyIntent(q, coreCategory).intent as keyof typeof INTENT_LABEL]}</span></li>
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

          {/* WO-INTEGRITY-002 B1(b): show reps + a cost estimate before the run. A large
              panel runs once each (the sweep fits query breadth into the time budget);
              smaller panels run 3×. */}
          {!running && (() => {
            const nQ = brandedList.length + categoryList.length;
            // The panel run-sweep will use: admin picks it; for customers the plan decides (PLAN_PANEL).
            const nEng = (isAdmin ? panel : planPanel ?? 'v1.1') === 'v1.2' ? 5 : 4;
            // WO-INTEGRITY-002 B1(b): reps from the SAME planner run-sweep uses (no duplicate rule).
            const { reps, queriesRun } = planSweep(nQ, nEng, { admin: isAdmin, requestedReps: 3 });
            const answers = queriesRun * nEng * reps;
            // Raw provider cost is admin-only (never shown to customers — plan quotas cap
            // spend server-side). WO-AEO-REPORT-INTEGRITY-003 Rev B §2.6: the estimate is
            // built on MEASURED per-engine cost, not a flat per-answer figure, so the
            // pre-run and post-run admin figures agree. Per-call cost spans ~307× between
            // engines, so the mix decides the price far more than the answer count.
            const est = isAdmin
              ? estimateSweepCost({ questions: queriesRun, reps, engines: ['claude', 'openai', 'perplexity', 'gemini'] })
              : null;
            return (
              <div className="mb-2">
                <p className="text-xs text-zinc-500">{queriesRun} question{queriesRun !== 1 ? 's' : ''} × {nEng} engines × {reps} run{reps > 1 ? 's' : ''} each ≈ {answers} answers{est ? ` · est. $${est.expectedUsd.toFixed(2)} (upper $${est.upperUsd.toFixed(2)})` : ''}</p>
                {est && (
                  <details className="mt-1">
                    <summary className="text-xs text-zinc-400 cursor-pointer">show the arithmetic</summary>
                    <pre className="mt-1 text-[11px] leading-tight text-zinc-500 whitespace-pre-wrap font-mono">{est.arithmetic}</pre>
                    <p className="mt-1 text-[11px] text-zinc-400">{est.accuracyNote}</p>
                  </details>
                )}
              </div>
            );
          })()}
          <button onClick={run} disabled={running || !domain.trim() || categoryList.length === 0}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-40">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running sweep…' : 'Run sweep'}
          </button>
          {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
        </div>
      )}

      {result && (paidViewer || savedView) && (
        <>
          {/* The free quick-check banner was removed with the teaser it belonged to
              (WO-AEO-TIER-LEAK-007 Rev B). The server can no longer return
              quickCheck — a free caller gets 402 — so this block was unreachable,
              and it was the one place in the product that printed a headline
              percentage from a single observation. `quickCheck` survives on the
              response type because stored sweeps predating the wall carry it.  */}
          {result.skippedEngines?.length > 0 && !result.quickCheck && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Skipped (no API key set): {result.skippedEngines.join(', ')}. Configured: {result.configured.join(', ') || 'none'}.
            </div>
          )}

          {/* Lane C: the executive summary — the same CoverInput the .md/.docx page 1 renders. */}
          {scorecard && result && <CoverCard cover={buildSweepCover(reportInputs(result))} />}
          {/* WO-012 G: "Measured after these actions." — timing beside figures, never cause. */}
          {recordEnabled && result && previousFigures && (() => {
            const v = measuredAfterView(recordEntries, previousFigures, nowFigures(result)!);
            if (!v) return null;
            const table = (cols: { label: string; rows: [string, string][] }[]) => (
              <table className="w-full text-xs mt-2">
                <thead><tr className="text-left text-zinc-700 border-b border-zinc-200"><th className="py-1 pr-3">Figure</th>{cols.map((c) => <th key={c.label} className="py-1 pr-3">{c.label}</th>)}</tr></thead>
                <tbody>{cols[0].rows.map(([label], i) => <tr key={label} className="border-b border-zinc-100"><td className="py-1 pr-3 text-zinc-900">{label}</td>{cols.map((c) => <td key={c.label} className="py-1 pr-3 text-zinc-800">{c.rows[i][1]}</td>)}</tr>)}</tbody>
              </table>
            );
            return (
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold">{MEASURED_AFTER}</h3>
                <ul className="text-sm text-zinc-800 mt-2 space-y-1">{v.done.map((e) => <li key={e.id || e.title}><b>{fmtDay(e.done_at)}</b>: {e.title} ({e.owner_tag})</li>)}</ul>
                {v.same ? table([v.previous, v.now]) : (
                  <>
                    <p className="text-sm text-zinc-900 font-semibold mt-3">{PANEL_DIFFERS}</p>
                    {table([{ label: `${v.previous.label} (${v.previous.panel})`, rows: v.previous.rows }])}
                    {table([{ label: `${v.now.label} (${v.now.panel})`, rows: v.now.rows }])}
                  </>
                )}
                <p className="text-xs italic text-zinc-700 mt-2">The dates show when things were done and when the figures were measured; they do not show cause.</p>
              </div>
            );
          })()}

          {/* WO-006 Items B + C: which engines produced these numbers, and under what conditions — on the
              face of every result, not in a footnote. */}
          {scorecard && result && (() => {
            const pv = panelOf(result.summary as any);
            const loc = ((result.summary as any)?.panel?.location ?? null) as string | null;
            return (
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-xs text-zinc-700 space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">How these numbers were produced</div>
                <p>{panelDisclosure(pv, result.engines)}</p>
                {testConditionsLines({ location: loc }).map((l) => <p key={l}>{l}</p>)}
              </div>
            );
          })()}

          {/* WO-AEO-PRODUCT-FIXES-003 §4.4: two dates on the same configs are a series. */}
          {series.length > 1 && (
            <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-5">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Measured over time · same questions, same engines</div>
              <p className="text-xs text-zinc-600 mt-1">One figure is a snapshot. The same questions asked again on the same panel, with every transcript stored, is a measurement.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-3">
                  <thead><tr className="text-left text-zinc-500 border-b border-zinc-200"><th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Found when asked by name</th><th className="py-1 pr-3">Recommended to new buyers</th><th className="py-1 pr-3">Change</th><th className="py-1">Transcripts</th></tr></thead>
                  <tbody>
                    {series.map((p) => (
                      <tr key={p.id} className={`border-b border-zinc-100 ${p.id === savedSweepId ? 'bg-emerald-50/60' : ''}`}>
                        <td className="py-1.5 pr-3 tabular-nums">{p.date}</td>
                        <td className="py-1.5 pr-3 font-bold tabular-nums">{p.branded === null ? '—' : `${p.branded}%`}</td>
                        <td className="py-1.5 pr-3 font-bold tabular-nums">{p.category === null ? '—' : `${p.category}%`}</td>
                        <td className={`py-1.5 pr-3 tabular-nums ${p.deltaCategory === null ? 'text-zinc-400' : p.deltaCategory > 0 ? 'text-emerald-700' : p.deltaCategory < 0 ? 'text-red-700' : ''}`}>{p.deltaCategory === null ? '—' : `${p.deltaCategory > 0 ? '+' : ''}${p.deltaCategory} pts`}</td>
                        <td className="py-1.5">{p.id === savedSweepId ? <span className="text-zinc-500">this sweep</span> : <a className="text-indigo-700 underline" href={`/sweeps?saved=${p.id}`}>open</a>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {seriesOtherPanels.length > 0 && (
                <p className="text-[11px] text-amber-800 mt-2">This domain also has sweeps on panel {seriesOtherPanels.join(' and ')}. A different set of engines is a different measurement, so those dates are a separate series and no change is computed across panels.</p>
              )}
              <p className="text-[11px] text-zinc-500 mt-2">Recommended = search-grounded category answers only; answers given from memory are reported beside the tile below, never pooled in. Each date links to its own stored transcripts.</p>
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
                  { label: 'Found when asked by name', hint: 'Branded retrievability', value: scorecard.brandedRetrievabilityPct, n: scorecard.brandedRuns, note: denominator?.branded, accuracy },
                  { label: 'Recommended to new buyers', hint: 'Category win — the metric that drives sales', value: scorecard.categoryRecommendationWinPct, note: denominator?.category, n: scorecard.categoryRuns, hero: true },
                  { label: ALIAS.owned.plain, hint: ALIAS.owned.precise, value: scorecard.ownedCitationRatePct, n: scorecard.ownedCitationN },
                  { label: ALIAS.share.plain, hint: `${ALIAS.share.precise} — you vs. competitors`, value: scorecard.competitiveSharePct, n: scorecard.competitiveShareN, countLabel: 'recommendations counted' },
                ].map((s) => (
                  <div key={s.label} className={`p-4 sm:p-5 ${s.hero ? 'bg-emerald-50/60' : ''}`}>
                    <div className={`text-3xl font-black ${tone(s.value)}`}>{s.value === null ? '—' : `${s.value}%`}</div>
                    <div className="text-sm font-bold text-zinc-800 mt-1 leading-tight">{s.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{s.hint}</div>
                    {s.value !== null && s.n > 0 && ((s as { countLabel?: string }).countLabel ? (
                      // Share counts recommendations, not answers: no N, no answer-based confidence chip.
                      <div className="text-[11px] mt-1 leading-tight text-zinc-600">{s.n} {(s as { countLabel?: string }).countLabel}</div>
                    ) : (
                      <div className="text-[11px] mt-1 leading-tight">
                        <span className="text-zinc-400">N={s.n}</span>
                        <span className={`ml-1.5 font-semibold ${confChip(s.n).cls}`}>· {confChip(s.n).label}</span>
                      </div>
                    ))}
                    {/* WO-AEO-PRODUCT-FIXES-003 §4.3: what N is counted out of, in one line. */}
                    {(s as { note?: string }).note && <div className="text-[11px] text-zinc-600 mt-1 leading-snug">{(s as { note?: string }).note}</div>}
                    {(s as { accuracy?: typeof accuracy }).accuracy && (() => { const a = (s as { accuracy: NonNullable<typeof accuracy> }).accuracy; return (
                      <div className="mt-2 pt-2 border-t border-zinc-100">
                        <div className="text-sm font-bold text-zinc-800">{a.pct === null ? '—' : `${a.pct}%`} <span className="text-xs font-semibold text-zinc-600">{ALIAS.accuracy.plain}</span></div>
                        <div className="text-[11px] text-zinc-600 leading-snug">{a.definition}</div>
                      </div>); })()}
                    {s.label === 'Found when asked by name' && result && !truth && <div className="mt-2 text-[11px] text-zinc-500">{ALIAS.accuracy.plain}: unmeasured — no snapshot of your site&apos;s own facts was stored with this sweep.</div>}
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

          {/* The report downloads lived ONLY at the very end of a five-screen report, so a
              reader had to scroll past every section to find them. Repeat the pair here,
              directly under the headline scorecard. This render path serves BOTH the live
              result and the saved view, so one card covers both. The pair at the bottom
              stays — this is an addition, not a move. */}
          {paidViewer && scorecard && (
            <div className="bg-zinc-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg">Take the full report with you</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                    Every score, every cited source and all {result.runs.length} transcripts — the same detail as the page below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={downloadDocx} disabled={docxBusy}
                    className="inline-flex items-center gap-2 bg-white text-zinc-900 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-100 disabled:opacity-50">
                    <Download className="w-4 h-4" />{docxBusy ? 'Preparing…' : 'Download report (Word)'}
                  </button>
                  <button onClick={downloadReport}
                    className="inline-flex items-center gap-2 border border-white/40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10">
                    <Download className="w-4 h-4" />Markdown
                  </button>
                  <button onClick={downloadPdf}
                    className="inline-flex items-center gap-2 border border-white/40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10">
                    <Download className="w-4 h-4" />Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WO-AEO-MOBILE-HISTORY-001: a saved sweep that predates the Sep-2 snapshot
              has no point-in-time layers — say so explicitly rather than render a blank. */}
          {savedView && savedSnapshotMissing && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-zinc-600">
              <b className="text-zinc-800">Fidelity, entity-linking and content-depth not captured</b> — {savedDate && new Date(savedDate) < new Date('2026-09-02')
                ? <>this sweep predates the Sep 2, 2026 snapshot, so its point-in-time page layers weren&apos;t stored.</>
                : <>no point-in-time page snapshot was stored with this sweep (it was run outside the app and imported), so those layers are not shown rather than fabricated.</>}
              {' '}Scores, per-engine results, cited-instead, source citations and every transcript above are complete.
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
                    {entityLinking.collisions.map((c) => {
                      const isDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(c);
                      return (
                        <span key={c} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white text-red-700 border border-red-300">
                          {c}
                          {isDomain && (
                            // WO-AEO-REPORT-POLISH-001 G2: the OWNER decides; the product never auto-decides.
                            <button type="button" onClick={() => markOwned(c)} className="text-[10px] uppercase tracking-wide text-zinc-600 underline">This is ours</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {ownedDomains.length > 0 && (
                    <p className="text-xs text-zinc-600 mt-2"><b>Owned properties:</b> {ownedDomains.join(', ')} &mdash; excluded from collisions; the remediation below says what to do with each.</p>
                  )}
                  {/* WO-INTEGRITY-002 B2: name the collision TYPES actually detected — never
                      assert a stock-ticker or acronym collision that isn't in this sweep. */}
                  {(() => {
                    const flags = entityLinking.flags || [];
                    const hasTicker = flags.some((f) => f.kind === 'ticker-collision');
                    const hasWiki = flags.some((f) => f.kind === 'wikipedia-collision');
                    const cause = `A crowded name${hasWiki ? '/acronym' : ''}${hasTicker ? ' and a colliding stock ticker' : ''}`;
                    return <p className="text-xs text-zinc-500 mt-2">{cause} means engines can&apos;t cleanly resolve you. Fix: an explicit &ldquo;not affiliated with…&rdquo; line + a connected <span className="font-mono">@id</span> entity graph so your identity is unambiguous.</p>;
                  })()}
                </div>
              )}
              {/* WO-010 B: pages pulled up for the name in answers that were still correct. Not confusion. */}
              {entityLinking?.retrievedAlongside && entityLinking.retrievedAlongside.length > 0 && (
                <div className="mt-4 border-t border-zinc-200 pt-3">
                  <p className="text-sm font-bold text-zinc-800">Retrieved alongside you</p>
                  <p className="text-xs text-zinc-600 mt-1">{entityLinking.alongsideAnswersAccurate ? 'Engines pulled these up for your name; your answer was still correct.' : 'Engines pulled these up for your name; no answer described you as them.'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entityLinking.retrievedAlongside.map((a) => (
                      <a key={a.entity} href={a.source} target="_blank" rel="noopener noreferrer" className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white text-zinc-700 border border-zinc-300 hover:underline">{a.entity}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* WO-AEO-REPORT-POLISH-001 Lane B: what the engines BELIEVE about you — every factual
              claim in the branded answers, counted. Agreement, not truth: "wrong" appears only
              where the fidelity classifier already said so. */}
          {result && (() => {
            const brandedRuns = result.runs.filter((x) => x.queryType === 'branded');
            const rows = extractBeliefs(brandedRuns, result.brand || truth?.brandName || undefined, flaggedWrongValues(fidelity), flaggedSiteValues(fidelity));
            if (!rows.length) return null;
            const tone: Record<string, string> = { Consistent: 'bg-emerald-50 text-emerald-800 border-emerald-200', 'Single-source': 'bg-amber-50 text-amber-800 border-amber-200', Conflicts: 'bg-red-50 text-red-800 border-red-200', 'Contradicts your site': 'bg-red-100 text-red-900 border-red-300' };
            return (
              <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-4">
                <h3 className="text-sm font-bold text-zinc-900">What the engines believe about you</h3>
                <p className="text-xs text-zinc-600 mt-1">Every factual claim the {brandedRuns.length} branded answers made, counted. <b>Consistent</b> = two or more engines said it. <b>Single-source</b> = one engine. <b>Conflicts</b> = different values for the same fact. <b>Contradicts your site</b> = your own site publishes a different value, shown beside it. Otherwise this reports agreement, not truth &mdash; check a Conflicts or Single-source row against your own site.</p>
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-zinc-500 border-b border-zinc-200"><th className="py-1 pr-3">Claim</th><th className="py-1 pr-3">Said by</th><th className="py-1 pr-3">Times</th><th className="py-1">Status</th></tr></thead>
                    <tbody>
                      {rows.map((b) => (
                        <tr key={`${b.field}:${b.claim}`} className="border-b border-zinc-100 align-top">
                          <td className="py-1.5 pr-3 text-zinc-800"><span className="text-zinc-500">{b.field}:</span> {b.claim}</td>
                          <td className="py-1.5 pr-3 text-zinc-700">{b.saidBy.map((e) => BELIEF_ENGINE[e] || e).join(', ')}</td>
                          <td className="py-1.5 pr-3 text-zinc-700 tabular-nums">{b.times}</td>
                          <td className="py-1.5"><span className={`inline-block px-2 py-0.5 rounded-full border font-semibold ${tone[b.status] || ''}`}>{b.status}</span>{b.siteValue && <div className="text-[11px] text-zinc-700 mt-1">Your site: {b.siteValue}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                ) : (e as { insufficientValid?: boolean }).insufficientValid ? (
                  // Every run for this engine failed to complete (429/5xx/timeout) — there
                  // is no valid answer left to score, so we show "insufficient valid runs",
                  // NOT a fake 0% (WO-AEO-SWEEP-MEMORY-001).
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> Insufficient valid runs
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">All {(e as { erroredRuns?: number }).erroredRuns ?? 0} of this engine&apos;s runs <b>errored</b> (rate-limit / timeout) and were excluded. This is <b>not</b> a real 0% — re-run to measure it.</div>
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
                    <div className="mt-3 text-sm text-zinc-700 font-semibold">{ALIAS.retrievability.plain}</div><div className="text-[11px] text-zinc-400">{ALIAS.retrievability.precise}</div>
                    <div className="text-2xl font-black">{e.brandedCited}/{e.brandedRuns} <span className="text-base font-semibold text-zinc-400">({e.retrievabilityPct}%)</span></div>
                    {truth && (() => { const a = accuracyWhenNamed(result.runs.filter((r) => r.queryType === 'branded' && r.engine === e.engine), truth); return a && a.named ? <div className="text-[11px] text-zinc-600">{ALIAS.accuracy.plain}: <b>{a.accurate}/{a.named}</b></div> : null; })()}
                    <div className="mt-2 text-sm text-zinc-700 font-semibold">{ALIAS.categoryWin.plain}</div><div className="text-[11px] text-zinc-400">{ALIAS.categoryWin.precise} — search-grounded</div>
                    {/* WO-INTEGRITY-002 B6: a category cell with zero search-grounded runs is
                        UNMEASURED (the engine answered from memory), not a real 0%. */}
                    {e.categoryRuns === 0 ? (
                      <div className="text-base font-bold text-sky-700">Unmeasured — no search invoked{e.modelPriorRuns > 0 ? ` (${e.modelPriorRuns} answered from memory)` : ''}</div>
                    ) : (
                      <div className={`text-2xl font-black ${e.citationWinPct >= 50 ? 'text-emerald-600' : e.citationWinPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>{e.citationWinPct}% <span className="text-xs font-semibold text-zinc-400">· N={e.categoryRuns}</span></div>
                    )}
                    {e.modelPriorRuns > 0 && <div className="mt-2 text-[11px] text-zinc-400">{e.modelPriorRuns} answered from memory (no search) reported separately</div>}
                    {e.truncatedRuns > 0 && <div className="mt-2 text-[11px] text-amber-600">{e.truncatedRuns} truncated answer{e.truncatedRuns > 1 ? 's' : ''} excluded</div>}
                    {((e as { erroredRuns?: number }).erroredRuns ?? 0) > 0 && <div className="mt-2 text-[11px] text-amber-800">{(e as { erroredRuns?: number }).erroredRuns} of {e.brandedRuns + e.categoryRuns + e.truncatedRuns + e.modelPriorRuns + ((e as { erroredRuns?: number }).erroredRuns ?? 0)} runs errored{e.erroredAfterRetry && e.erroredAfterRetry === e.erroredRuns ? ' after retry' : ''} — excluded</div>}
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
                  {(showAllComps ? comps : comps.slice(0, 10)).map((c) => (
                    <span key={c.name} title={(c as { domain?: string }).domain || 'named without a URL'} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                      {c.name} · {c.count}×{(c as { seeded?: boolean }).seeded ? <span className="ml-1.5 text-[10px] uppercase tracking-wide text-red-500">seeded</span> : null}
                    </span>
                  ))}
                </div>
                {comps.length > 10 && (
                  <button type="button" onClick={() => setShowAllComps((v) => !v)} className="mt-3 text-xs font-semibold text-zinc-600 underline">
                    {showAllComps ? 'Show top 10' : `Show all ${comps.length}`}
                  </button>
                )}
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

          {/* WO-012 B: Source coverage — the pages engines read for the category questions, and
              whether each names you; corroboration in the branded answers; the vendor-naming base. */}
          {result && !result.quickCheck && (() => {
            const cor = corroboration(result.runs, result.domain, ownedDomains);
            const base = vendorBase(result.runs, { domain: result.domain, brand: result.brand || undefined }, parseCompetitors(competitors));
            const hl = sourceCoverage ? coverageHeadline(sourceCoverage) : null;
            const label = { yes: 'Yes', no: 'No', unreadable: 'Could not read' } as const;
            return (
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold flex items-center gap-2 mb-1"><Search className="w-4 h-4 text-zinc-500" />Source coverage</h3>
                {hl ? (
                  <>
                    <p className="text-sm text-zinc-900 font-semibold">{hl.headline}</p>
                    <p className="text-sm text-zinc-700 mt-1">{hl.sites}</p>
                    {sourceCoverage!.rows.length > 0 && (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-zinc-600 border-b border-zinc-200"><th className="py-1 pr-3">Site</th><th className="py-1 pr-3">Times cited</th><th className="py-1 pr-3">Engines citing</th><th className="py-1 pr-3">Page read</th><th className="py-1 pr-3">Names you</th><th className="py-1">Fetched</th></tr></thead>
                          <tbody>
                            {sourceCoverage!.rows.map((r) => (
                              <tr key={r.url} className="border-b border-zinc-100 align-top">
                                <td className="py-1.5 pr-3 text-zinc-900">{r.host}</td>
                                <td className="py-1.5 pr-3 tabular-nums text-zinc-800">{r.timesCited}</td>
                                <td className="py-1.5 pr-3 text-zinc-800">{r.engines.map((e) => BELIEF_ENGINE[e] || e).join(', ')}</td>
                                <td className="py-1.5 pr-3 break-all"><a className="underline text-zinc-800" href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.url}</a></td>
                                <td className="py-1.5 pr-3 font-semibold text-zinc-900">{label[r.verdict]}{r.reason ? <span className="font-normal text-zinc-600"> ({r.reason})</span> : null}</td>
                                <td className="py-1.5 text-zinc-700">{new Date(sourceCoverage!.fetchedAt).toISOString().slice(0, 10)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {(() => { const act = coverageAction(sourceCoverage!); return act ? (
                      <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
                        <p className="font-bold text-sm">{act.title} <span className="ml-1 inline-block rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 align-middle">Outreach</span></p>
                        <ul className="mt-2 text-xs text-zinc-800 space-y-1 break-all">{act.items.map((it) => <li key={it}>{it}</li>)}</ul>
                        <p className="mt-2 text-xs italic text-zinc-700">{nextSweepLine('coverage')}</p>
                      </div>
                    ) : null; })()}
                    {currentSweepId && <button type="button" onClick={() => runCoverage(currentSweepId)} disabled={coverageState === 'running'} className="mt-3 text-xs font-semibold underline text-zinc-800">{coverageState === 'running' ? 'Checking the pages…' : 'Check source coverage again today'}</button>}
                  </>
                ) : (
                  <div className="text-sm text-zinc-700">
                    {coverageState === 'running' ? 'Reading the pages the engines cited for your category questions…'
                      : currentSweepId ? <button type="button" onClick={() => runCoverage(currentSweepId)} className="font-semibold underline text-zinc-900">Check source coverage</button>
                      : 'Source coverage runs on a saved sweep.'}
                    {coverageState === 'error' && <span className="block text-zinc-700 mt-1">The check could not be completed. Try again.</span>}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-zinc-100">
                  <p className="text-sm text-zinc-800">{corroborationLine(cor)}</p>
                  {cor.hosts.length > 0 && <p className="text-xs text-zinc-700 mt-1">{cor.hosts.join(', ')}</p>}
                </div>
                {base.perQuestion.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">How many answers named any vendor</p>
                    <ul className="text-xs text-zinc-800 space-y-1">
                      {base.perSegment.map((r) => <li key={'s' + r.label}><b>{r.label}:</b> {vendorBaseLine(r)}</li>)}
                    </ul>
                    <ul className="text-xs text-zinc-700 space-y-1 mt-2">
                      {base.perQuestion.map((r) => <li key={'q' + r.label}>“{r.label}”: {vendorBaseLine(r)}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

          {/* WO-012 G: the Record. */}
          {result && !result.quickCheck && result.persisted && (
            <RecordPanel domain={result.domain} enabled={!!recordEnabled} actions={(() => { const a = [...recordActions(reportInputs(result)), ...guideRecordActions(guideFor(result, null))]; return a.filter((x, i) => a.findIndex((y) => y.key === x.key) === i); })()} onEntries={setRecordEntries} />
          )}
          {/* WO-014: the step-by-step guide. */}
          {result && !result.quickCheck && (
            <GuidePanel domain={result.domain} access={guideAccess} build={async (t) => guideFor(result, t)} />
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
              {/* PART C — screen and download parity. This renders from the SAME
                  buildDoNowPlan call the .md/.docx uses, in the same order, with the
                  same wording. A customer reads on screen and acts from the download,
                  or the reverse, so any divergence is a support ticket. */}
              {(() => {
                const plan = buildDoNowPlan({
                  domain: result.domain,
                  perEngine: result.summary.engines.map((e) => ({ engine: ENGINE_LABEL[e.engine] || e.engine, found: e.brandedCited, total: e.brandedRuns })),
                  drifted: fidelity ? fidelity.citedDrifted : undefined,
                  collisions: entityLinking?.collisions ?? [],
                  authorityGap: authority ? authority.authorityDomains.map((d) => ({ domain: d.domain, citations: d.citations })) : [],
                  pitchTargets: pitchTargetsFrom(authority, parseCompetitors(competitors)),
                  paid: !!isAdmin || result.tier !== 'free',
                });
                return (
                  <div className="mb-5">
                    {plan.situation.map((line, i) => (
                      <p key={i} className="text-sm text-zinc-700 mb-2" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                    {plan.gatedNote && <p className="text-sm text-zinc-500 italic mt-2">{plan.gatedNote}</p>}
                    {/* WO-012 C: grouped by owner (Site, Content, Outreach), one tag each. */}
                    {OWNER_ORDER.flatMap((o) => plan.steps.filter((st) => st.owner === o)).map((step, i, all) => (
                      <div key={step.n} className="mt-4 pt-4 border-t border-zinc-100">
                        {(i === 0 || all[i - 1].owner !== step.owner) && <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">{step.owner} — {OWNER_DESC[step.owner]}</p>}
                        <p className="font-bold text-sm">{i + 1}. {step.what} <span className="ml-1 inline-block rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 align-middle">{step.owner}</span></p>
                        <p className="text-sm text-zinc-600 mt-1">{step.explainer}</p>
                        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                          <li><span className="text-zinc-600">Moves:</span> {step.moves === 'citation' ? 'citation win — being the answer' : step.moves === 'discovery' ? 'discovery — being retrievable at all' : 'accuracy — what they say about you'}</li>
                          <li><span className="text-zinc-600">Why it matters for AI answers:</span> {step.why}</li>
                          {step.link && <li><span className="text-zinc-600">Link:</span> <span className="break-all">{step.link}</span></li>}
                          <li><span className="text-zinc-600">Time:</span> {step.time}</li>
                          <li><span className="text-zinc-600">What changes:</span> {step.changes}</li>
                          <li><span className="text-zinc-600">What does NOT change:</span> {step.doesNotChange}</li>
                          <li className="italic text-zinc-700">{nextSweepLine(step.moves)}</li>
                        </ul>
                      </div>
                    ))}
                    {plan.noChannelNote && <p className="text-sm text-zinc-600 mt-4 pt-4 border-t border-zinc-100">{plan.noChannelNote}</p>}
                  </div>
                );
              })()}
              <AgendaBlock lines={buildSweepActionAgenda({
                brandedRetrievabilityPct: scorecard.brandedRetrievabilityPct,
                categoryWinPct: scorecard.categoryRecommendationWinPct,
                hasFidelityOrCollision: (fidelity?.citedDrifted ?? 0) > 0 || (entityLinking?.collisions.length ?? 0) > 0,
                collisions: entityLinking?.collisions ?? [],
                losingCategoryQuestions: [...new Set(result.runs.filter((x) => x.queryType === 'category' && !x.cited && !x.truncated && x.grounding !== 'model-prior').map((x) => x.query))],
                location: ((result.summary as any)?.panel?.location ?? null) as string | null,
                doNowAuthorities: authority ? doNowChecklist(authority.authorityDomains) : [],
                brand: result.brand || undefined,
                domain: result.domain,
                served: truth ? { hasOrg: truth.hasOrganization, hasOrgId: truth.hasOrgId, hasDisambiguation: truth.hasDisambiguation, sameAs: truth.sameAs, ownedDomains } : undefined,
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
              <div className="flex flex-wrap items-center gap-2 min-w-0">
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
                {/* Both downloads, or neither. Word is the readable one — Markdown is
                    unreadable on iOS and awkward without an editor — so gating one and
                    leaving the other open is the shape this defect already had. */}
                {paidViewer && (
                  <>
                    <button onClick={downloadDocx} disabled={docxBusy}
                      className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-zinc-800 disabled:opacity-50">
                      <Download className="w-4 h-4" />{docxBusy ? 'Preparing…' : 'Download report (Word)'}
                    </button>
                    <button onClick={downloadReport}
                      className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-zinc-50">
                      <Download className="w-4 h-4" />Markdown
                    </button>
                    <button onClick={downloadPdf}
                      className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-zinc-50">
                      <Download className="w-4 h-4" />Download PDF
                    </button>
                  </>
                )}
              </div>
            </div>
            {showTranscripts && (
            <div className="space-y-2">
              {result.runs.map((r, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl">
                  <button onClick={() => setOpenRun(openRun === i ? null : i)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm">
                    {openRun === i || expandAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {/^\s*\[error:/i.test(r.transcript || '') ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700" title="The engine call failed (rate-limit / timeout) — excluded from scores">errored — excluded</span>
                    ) : r.truncated ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">truncated — not scored</span>
                    ) : (r as { siteNotFound?: boolean }).siteNotFound ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600" title="Search ran but did not find the client's own site — a branded miss, not a fake citation">search ran — site not found</span>
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
                    <span className="text-zinc-500 truncate">{r.queryType === 'category' ? INTENT_LABEL[classifyIntent(r.query, coreCategory).intent] : 'About you'}: {r.query}</span>
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
          {/* WO-INTEGRITY-002 B4: zero hits on a domain we don't instrument is NOT a
              measured zero — it means no telemetry is connected. Don't render fake zeros. */}
          {(bots.totalHits || 0) === 0 ? (
            <>
              <h3 className="font-bold flex items-center gap-2 mb-1"><Bot className="w-4 h-4 text-zinc-400" />AI crawler hits</h3>
              <p className="text-sm text-zinc-500">No telemetry connected for this domain. Crawler-hit tracking needs a first-party pixel/log on the site itself — until it&apos;s connected, this isn&apos;t a measured zero, so we don&apos;t show one.</p>
            </>
          ) : (<>
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
          </>)}
        </div>
      )}
      {/* WO-006 Item E — dark: renders nothing unless the server allows this account. */}
      {!savedView && <SearchConsolePanel />}
    </div>
  );
}
