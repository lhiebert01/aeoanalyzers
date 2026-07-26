import { useState } from 'react';
import { Play, Loader2, Bot, Trophy, AlertTriangle, ChevronDown, ChevronRight, DollarSign, Search, Download, ChevronsUpDown } from 'lucide-react';
import { aggregateAuthorityGap, type AuthorityGapReport } from '../lib/authorityGap';
import type { SweepSummary, SweepRunResult } from '../lib/citationSweep';
import { getAccessToken } from '../supabase';

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

export default function SweepDashboard({ onUpgrade, isAdmin }: { onUpgrade?: () => void; isAdmin?: boolean }) {
  const [domain, setDomain] = useState('');
  const [brand, setBrand] = useState('');
  const [branded, setBranded] = useState('who is {domain}\nwhat is {domain}');
  const [category, setCategory] = useState('best AEO tools\nbest answer engine optimization tools');
  const [competitors, setCompetitors] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SweepResponse | null>(null);
  const [authority, setAuthority] = useState<AuthorityGapReport | null>(null);
  const [bots, setBots] = useState<any | null>(null);
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const parseLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  const parseCompetitors = (s: string) =>
    parseLines(s).map((l) => {
      const [name, dom] = l.split(',').map((x) => x.trim());
      return { name, domain: dom || undefined };
    });

  async function run() {
    setError(null); setResult(null); setAuthority(null); setRunning(true);
    try {
      const d = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const expand = (q: string) => q.replace(/\{domain\}/g, d);
      const token = getAccessToken();
      const res = await fetch('/api/run-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          domain: d, brand: brand.trim() || undefined,
          brandedQueries: parseLines(branded).map(expand),
          categoryQueries: parseLines(category).map(expand),
          competitors: parseCompetitors(competitors),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `sweep failed (${res.status})`);
      setResult(json);
      setAuthority(aggregateAuthorityGap(json.runs || [], d));
      fetch(`/api/bot-stats?domain=${encodeURIComponent(d)}`).then((r) => r.json()).then(setBots).catch(() => {});
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

    out.push('## Scores by engine');
    for (const e of r.summary.engines) {
      out.push(`### ${L(e.engine)}`);
      if ((e as { errored?: boolean }).errored) {
        out.push('- Service unavailable (engine failed to run — bad/expired key or config; NOT a real 0%)');
      } else {
        out.push(`- Retrievability (branded): ${e.brandedCited}/${e.brandedRuns} (${e.retrievabilityPct}%)`);
        out.push(`- Citation win (category): ${e.citationWinPct}%`);
        if (isAdmin) out.push(`- Cost: $${e.costUsd.toFixed(3)}`);
      }
      out.push('');
    }

    if (r.summary.topCompetitors.length) {
      out.push('## Cited instead of you (category queries)');
      for (const c of r.summary.topCompetitors) out.push(`- ${c.name} · ${c.count}×`);
      out.push('');
    }

    if (authority && authority.authorityDomains.length) {
      out.push('## Authority gap — sources the engines trust');
      for (const d of authority.authorityDomains.slice(0, 12)) out.push(`- ${d.domain} · ${d.citations}`);
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

    out.push(`## Transcripts (${r.runs.length} runs)`);
    out.push('');
    for (const run of r.runs) {
      out.push(`### [${run.cited ? 'cited' : 'not cited'}] ${L(run.engine)} · ${run.queryType}: ${run.query}`);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Citation Sweeps & Monitoring</h1>
        <p className="text-zinc-500 mt-2">
          Ask the real answer engines (with web search on), N&nbsp;times per query, and measure three separable layers:
          <b> retrievability</b> (branded), <b>citation win</b> (category), and who gets <b>cited instead</b> — backed by stored transcripts.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
        {/* How to fill this in — plain-language explainer with a worked example */}
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5 text-xs leading-relaxed text-zinc-600">
          <p className="font-bold text-zinc-800 mb-1">How a sweep works</p>
          <p>
            We ask each real answer engine your questions, several times each, and measure two things:
            <b> branded</b> queries (that name you) test whether engines <b>know you</b> when asked directly;
            <b> category</b> queries (that don&apos;t name you) test whether engines <b>cite you</b> for your
            space — and who gets cited <i>instead</i>. Example: for SanctumShield, a branded query is
            <span className="font-mono"> &ldquo;who is sanctumshield.com&rdquo;</span> and a category query is
            <span className="font-mono"> &ldquo;best AI governance tools&rdquo;</span>.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Domain
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">Your website — no https:// needed. e.g. <span className="font-mono">sanctumshield.com</span></span>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold">Brand name (optional)
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">Catches mentions even without a link. e.g. <span className="font-mono">SanctumShield</span></span>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Example Inc"
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Branded queries (one per line; {'{domain}'} expands)
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">Questions that <b>name you</b> — do engines know you when asked directly? e.g. <span className="font-mono">who is {'{domain}'}</span></span>
            <textarea value={branded} onChange={(e) => setBranded(e.target.value)} rows={3}
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>
          <label className="text-sm font-semibold">Category queries (unbranded buyer-intent)
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">Buyer questions that <b>don&apos;t name you</b> but where you want to be cited. e.g. <span className="font-mono">best AI governance tools</span></span>
            <textarea value={category} onChange={(e) => setCategory(e.target.value)} rows={3}
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>
        </div>
        <label className="text-sm font-semibold block">Competitors (one per line: <span className="font-mono">Name, domain.com</span>)
          <span className="mt-0.5 block text-xs font-normal text-zinc-500">Rivals to track — the sweep counts each time they&apos;re cited instead of you. e.g. <span className="font-mono">Knostic, knostic.ai</span></span>
          <textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} rows={2}
            className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
        </label>
        <button onClick={run} disabled={running || !domain.trim()}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-40">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running sweep…' : 'Run sweep'}
        </button>
        {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
      </div>

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
                ) : (
                  <>
                    <div className="mt-3 text-sm text-zinc-500">Retrievability (branded)</div>
                    <div className="text-2xl font-black">{e.brandedCited}/{e.brandedRuns} <span className="text-base font-semibold text-zinc-400">({e.retrievabilityPct}%)</span></div>
                    <div className="mt-2 text-sm text-zinc-500">Citation win (category)</div>
                    <div className={`text-2xl font-black ${e.citationWinPct >= 50 ? 'text-emerald-600' : e.citationWinPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>{e.citationWinPct}%</div>
                    {isAdmin && <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />${e.costUsd.toFixed(3)}</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Competitors displacing you */}
          {result.summary.topCompetitors.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-amber-500" />Cited instead of you (category queries)</h3>
              <div className="flex flex-wrap gap-2">
                {result.summary.topCompetitors.map((c) => (
                  <span key={c.name} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">{c.name} · {c.count}×</span>
                ))}
              </div>
            </div>
          )}

          {/* Authority gap (WO-7) */}
          {authority && authority.authorityDomains.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Search className="w-4 h-4 text-zinc-400" />Authority gap — sources the engines trust</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {authority.authorityDomains.slice(0, 12).map((d) => (
                  <span key={d.domain} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.isKnownAuthority ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-zinc-100 text-zinc-600'}`}>{d.domain} · {d.citations}</span>
                ))}
              </div>
              {authority.recommendations.map((r, i) => <p key={i} className="text-sm text-zinc-600 mb-1">{r}</p>)}
            </div>
          )}

          {/* Cost + transcripts */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-bold">Transcripts ({result.runs.length} runs)</h3>
              <div className="flex items-center gap-2">
                {isAdmin && <span className="text-sm font-semibold text-zinc-500 mr-1">Sweep cost ≈ ${result.summary.totalCostUsd.toFixed(3)}</span>}
                <button onClick={() => setExpandAll((v) => !v)}
                  className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-zinc-50">
                  <ChevronsUpDown className="w-4 h-4" />{expandAll ? 'Collapse all' : 'Expand all'}
                </button>
                <button onClick={downloadReport}
                  className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-zinc-800">
                  <Download className="w-4 h-4" />Download report
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {result.runs.map((r, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl">
                  <button onClick={() => setOpenRun(openRun === i ? null : i)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm">
                    {openRun === i || expandAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.cited ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{r.cited ? 'cited' : 'not cited'}</span>
                    <span className="font-semibold">{ENGINE_LABEL[r.engine] || r.engine}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 truncate">{r.queryType}: {r.query}</span>
                  </button>
                  {(openRun === i || expandAll) && (
                    <div className="px-4 pb-3 text-sm text-zinc-700 whitespace-pre-wrap border-t border-zinc-100 pt-2">
                      {r.transcript || '(no answer)'}
                      {r.sources?.length > 0 && (
                        <div className="mt-2 text-xs text-zinc-400">Sources: {r.sources.join(' · ')}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
