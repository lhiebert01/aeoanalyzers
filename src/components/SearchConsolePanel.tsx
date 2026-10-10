// WO-AEO-POSITION-AND-PANEL-006 Item E — Search Console fan-out segmentation. DARK: renders nothing
// unless the server says this account is allowed. Two inputs: the read-only OAuth connection, or a
// Queries export file from Search Console. Either way every row is a CLASSIFICATION with its rules
// and confidence, never a confirmed origin.
import { useEffect, useState } from 'react';
import { getAccessToken } from '../supabase';
import { FANOUT_RULES, FANOUT_LIMITS, segment, parseGscCsv, type GscRow } from '../lib/fanoutClassifier';

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);
const num = (v: number) => v.toLocaleString('en-US');

export function SearchConsolePanel() {
  const [st, setSt] = useState<{ enabled: boolean; configured: boolean; connected: boolean } | null>(null);
  const [sites, setSites] = useState<string[]>([]);
  const [site, setSite] = useState('');
  const [rows, setRows] = useState<GscRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const end = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
  const call = async (action: string, body?: unknown) => {
    const t = getAccessToken();
    const r = await fetch(`/api/gsc?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j;
  };
  useEffect(() => { call('status').then(setSt).catch(() => setSt(null)); }, []);
  useEffect(() => { if (st?.connected) call('sites').then((j) => { setSites(j.sites || []); setSite((j.sites || [])[0] || ''); }).catch((e) => setErr(String(e.message))); }, [st?.connected]);
  if (!st?.enabled) return null; // dark for everyone not allowlisted

  const pull = async () => { setBusy(true); setErr(null); try { const j = await call('queries', { siteUrl: site, startDate: start, endDate: end }); setRows(j.rows || []); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const seg = rows ? segment(rows) : null;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 space-y-4">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Search Console · preview (not public)</div>
        <h3 className="text-lg font-bold text-zinc-900 mt-1">Queries a person typed, separated from queries that look machine-written</h3>
        <p className="text-sm text-zinc-600 mt-1">Blended together, long machine-written queries pull CTR down and inflate impressions. This separates the two populations by a visible rule set so you can read each on its own.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {st.configured ? (st.connected ? (
          <>
            <select value={site} onChange={(e) => setSite(e.target.value)} className="border border-zinc-300 rounded-xl px-3 py-2">{sites.map((s) => <option key={s}>{s}</option>)}</select>
            <button onClick={pull} disabled={!site || busy} className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50">{busy ? 'Pulling…' : `Pull ${start} → ${end}`}</button>
            <button onClick={() => call('revoke').then(() => setSt({ ...st, connected: false }))} className="text-zinc-600 underline">Disconnect</button>
          </>
        ) : <button onClick={() => call('start').then((j) => { window.location.href = j.url; })} className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold">Connect Search Console (read-only)</button>)
          : <span className="text-zinc-500">OAuth is not configured on this deployment.</span>}
        <label className="text-zinc-700">or load a Queries export (.csv)
          <input type="file" accept=".csv,text/csv" className="ml-2 text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setRows(parseGscCsv(await f.text())); }} />
        </label>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <ul className="text-xs text-zinc-600 list-disc ml-5 space-y-0.5">{FANOUT_LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
      {seg && (
        <>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-zinc-500 border-b"><th className="py-1">Population</th><th>Queries</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Avg position</th></tr></thead>
            <tbody>
              {([['Blended (as Search Console shows it)', seg.blended], ['Likely typed by a person', seg.likelyPerson], ['Likely machine-written (classification)', seg.likelyMachine]] as const).map(([l, p]) => (
                <tr key={l} className="border-b border-zinc-100"><td className="py-1.5 font-semibold">{l}</td><td>{num(p.queries)}</td><td>{num(p.impressions)}</td><td>{num(p.clicks)}</td><td className="font-bold">{pct(p.ctr)}</td><td>{p.avgPosition === null ? '—' : p.avgPosition.toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
          <details className="text-xs text-zinc-700"><summary className="cursor-pointer font-semibold">The rules, and which fired on each query</summary>
            <ul className="mt-2 space-y-0.5">{FANOUT_RULES.map((r) => <li key={r.id}><code>{r.id}</code> — {r.label} (weight {r.weight})</li>)}</ul>
            <p className="mt-2">Confidence = 1 − the product of (1 − weight) over the rules that fired; 0.5 or more is shown as likely machine-written. A classification, not a fact.</p>
            <table className="w-full mt-2">
              <thead><tr className="text-left text-zinc-500"><th>Query</th><th>Impr.</th><th>Rules fired</th><th>Confidence</th></tr></thead>
              <tbody>{[...seg.verdicts].sort((a, b) => b.impressions - a.impressions).slice(0, 200).map((v) => (
                <tr key={v.query} className="border-t border-zinc-100"><td className="py-1 pr-2">{v.query}</td><td>{num(v.impressions)}</td><td>{v.fired.join(', ') || '—'}</td><td>{v.confidence.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
