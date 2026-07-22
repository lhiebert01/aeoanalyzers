import { useState } from 'react';
import { Play, Loader2, Bot, Trophy, AlertTriangle, ChevronDown, ChevronRight, DollarSign, Search } from 'lucide-react';
import { aggregateAuthorityGap, type AuthorityGapReport } from '../lib/authorityGap';
import type { SweepSummary, SweepRunResult } from '../lib/citationSweep';

// WO-1 (+WO-3/WO-7) client dashboard: run a tested citation sweep, then show
// branded retrievability, category citation-rate, competitor displacement,
// transcript drill-down, per-sweep cost, AI-bot hits, and the authority gap.

interface SweepResponse {
  domain: string; brand: string | null; runsPerQuery: number;
  engines: string[]; skippedEngines: string[]; configured: string[];
  summary: SweepSummary; runs: SweepRunResult[]; persisted: boolean;
}

const ENGINE_LABEL: Record<string, string> = {
  claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini',
};

export default function SweepDashboard() {
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
      const res = await fetch('/api/run-sweep', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Domain
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold">Brand name (optional)
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Example Inc"
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Branded queries (one per line; {'{domain}'} expands)
            <textarea value={branded} onChange={(e) => setBranded(e.target.value)} rows={3}
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>
          <label className="text-sm font-semibold">Category queries (unbranded buyer-intent)
            <textarea value={category} onChange={(e) => setCategory(e.target.value)} rows={3}
              className="mt-1 w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-mono" />
          </label>
        </div>
        <label className="text-sm font-semibold block">Competitors (one per line: <span className="font-mono">Name, domain.com</span>)
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
          {result.skippedEngines?.length > 0 && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Skipped (no API key set): {result.skippedEngines.join(', ')}. Configured: {result.configured.join(', ') || 'none'}.
            </div>
          )}

          {/* Per-engine scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.summary.engines.map((e) => (
              <div key={e.engine} className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm">
                <div className="font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-zinc-400" />{ENGINE_LABEL[e.engine] || e.engine}</div>
                <div className="mt-3 text-sm text-zinc-500">Retrievability (branded)</div>
                <div className="text-2xl font-black">{e.brandedCited}/{e.brandedRuns} <span className="text-base font-semibold text-zinc-400">({e.retrievabilityPct}%)</span></div>
                <div className="mt-2 text-sm text-zinc-500">Citation win (category)</div>
                <div className={`text-2xl font-black ${e.citationWinPct >= 50 ? 'text-emerald-600' : e.citationWinPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>{e.citationWinPct}%</div>
                <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />${e.costUsd.toFixed(3)}</div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Transcripts ({result.runs.length} runs)</h3>
              <span className="text-sm font-semibold text-zinc-500">Sweep cost ≈ ${result.summary.totalCostUsd.toFixed(3)}</span>
            </div>
            <div className="space-y-2">
              {result.runs.map((r, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl">
                  <button onClick={() => setOpenRun(openRun === i ? null : i)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm">
                    {openRun === i ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.cited ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{r.cited ? 'cited' : 'not cited'}</span>
                    <span className="font-semibold">{ENGINE_LABEL[r.engine] || r.engine}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 truncate">{r.queryType}: {r.query}</span>
                  </button>
                  {openRun === i && (
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
