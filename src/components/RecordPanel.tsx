// WO-012 G — the Record on screen. "Mark done" on each action in this sweep's plan, "Add your
// own", the dated list, "Download the Record" (CSV), and — when a previous sweep of the same
// domain exists — "Measured after these actions." Pro and Business only.
import { useEffect, useState } from 'react';
import { OWNER_ORDER, type OwnerTag } from '../lib/ownerTags';
import { RECORD_GATED, recordCsv, METRIC_KEYS, type RecordEntry } from '../lib/theRecord';
import { addRecord, listRecord } from '../lib/recordStore';

export interface RecordAction { key: string; title: string; owner: OwnerTag }

const today = () => new Date().toISOString().slice(0, 10);
const TAG = 'ml-1 inline-block rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 align-middle';

export function RecordPanel({ domain, enabled, actions, onEntries }: { domain: string; enabled: boolean; actions: RecordAction[]; onEntries?: (e: RecordEntry[]) => void }) {
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null); // action key being marked done, or 'own'
  const blank = { title: '', owner: 'Site' as OwnerTag, date: today(), note: '', link: '', exp: false, metricKey: '', metricArg: '', baseline: '', checks: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled || !domain) return;
    let live = true;
    listRecord(domain).then((e) => { if (live) { setEntries(e); onEntries?.(e); } }).catch(() => { if (live) setError('The Record could not be loaded.'); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, enabled]);

  if (!enabled) {
    return (
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold mb-1">The Record</h3>
        <p className="text-sm text-zinc-800">{RECORD_GATED}</p>
      </div>
    );
  }

  const doneKeys = new Set(entries.filter((e) => e.action_key).map((e) => e.action_key as string));
  function start(key: string, a?: RecordAction) {
    setOpen(key); setError(null);
    setForm({ ...blank, title: a?.title || '', owner: a?.owner || 'Site' });
  }
  async function save(a?: RecordAction) {
    if (!form.title.trim()) { setError('Describe what was done.'); return; }
    if (form.link && !/^https?:\/\//i.test(form.link.trim())) { setError('A link starts with https://'); return; }
    setSaving(true); setError(null);
    try {
      const mk = form.exp && form.metricKey ? (form.metricKey.endsWith(':') ? form.metricKey + form.metricArg.trim() : form.metricKey) : null;
      const label = mk ? `${METRIC_KEYS.find((m) => m.key === form.metricKey)?.label.replace(/ \(add [^)]*\)/, '') || mk}${form.metricKey.endsWith(':') && form.metricArg ? `: ${form.metricArg.trim()}` : ''}` : null;
      const checks = form.checks.split(/[,\s]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      await addRecord({ domain, title: form.title, owner_tag: form.owner, source: a ? 'plan' : 'own', action_key: a?.key ?? null, done_at: form.date || today(), note: form.note, link: form.link,
        ...(mk ? { metric: label, metric_key: mk, baseline: form.baseline || null, check_dates: checks, hypothesis: `This should move ${label}${form.baseline ? ` from ${form.baseline}` : ''}.` } : {}) });
      const e = await listRecord(domain);
      setEntries(e); onEntries?.(e); setOpen(null);
    } catch (err) {
      setError(/row-level security|42501|permission/i.test(String((err as Error).message)) ? RECORD_GATED : 'Could not save. Try again.');
    } finally { setSaving(false); }
  }
  function download() {
    const blob = new Blob([recordCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `the-record-${domain}-${today()}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const input = 'w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900 bg-white';
  const formFor = (a?: RecordAction) => (
    <div className="mt-2 grid gap-2 sm:grid-cols-2 rounded-xl border border-zinc-200 p-3">
      {!a && <label className="text-xs text-zinc-800 sm:col-span-2">What was done<input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={500} /></label>}
      {!a && (
        <label className="text-xs text-zinc-800">Owner
          <select className={input} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value as OwnerTag })}>
            {OWNER_ORDER.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs text-zinc-800">Date done<input type="date" className={input} value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label className="text-xs text-zinc-800">Note (optional)<input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={2000} /></label>
      <label className="text-xs text-zinc-800">Link (optional)<input className={input} value={form.link} placeholder="https://" onChange={(e) => setForm({ ...form, link: e.target.value })} maxLength={2000} /></label>
      <label className="text-xs text-zinc-800 sm:col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.checked })} /> Log it as an experiment (what it should move, and when to check)</label>
      {form.exp && (
        <>
          <label className="text-xs text-zinc-800">What should it move?
            <select className={input} value={form.metricKey} onChange={(e) => setForm({ ...form, metricKey: e.target.value })}>
              <option value="">Choose a metric</option>
              {METRIC_KEYS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          {form.metricKey.endsWith(':') && <label className="text-xs text-zinc-800">{form.metricKey === 'gsc_position:' ? 'The search query' : 'The page address'}<input className={input} value={form.metricArg} onChange={(e) => setForm({ ...form, metricArg: e.target.value })} maxLength={250} /></label>}
          <label className="text-xs text-zinc-800">Value now (optional)<input className={input} value={form.baseline} placeholder="e.g. 16.1" onChange={(e) => setForm({ ...form, baseline: e.target.value })} maxLength={300} /></label>
          <label className="text-xs text-zinc-800">Check on (one or more dates, YYYY-MM-DD)<input className={input} value={form.checks} placeholder="2026-11-16, 2026-11-30" onChange={(e) => setForm({ ...form, checks: e.target.value })} maxLength={120} /></label>
        </>
      )}
      <div className="sm:col-span-2 flex gap-3 items-center">
        <button type="button" disabled={saving} onClick={() => save(a)} className="rounded-lg bg-zinc-900 text-white text-xs font-bold px-3 py-1.5">{saving ? 'Saving…' : 'Save to the Record'}</button>
        <button type="button" onClick={() => setOpen(null)} className="text-xs underline text-zinc-800">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">The Record</h3>
        <div className="flex gap-3">
          <button type="button" onClick={() => start('own')} className="text-xs font-semibold underline text-zinc-900">Add your own</button>
          {entries.length > 0 && <button type="button" onClick={download} className="text-xs font-semibold underline text-zinc-900">Download the Record</button>}
        </div>
      </div>
      <p className="text-sm text-zinc-700 mt-1">Mark what you did, with the date. The next sweep of {domain} on the same engines opens with these dates beside its figures.</p>
      {error && <p className="text-sm text-red-800 mt-2">{error}</p>}
      {open === 'own' && formFor()}

      {actions.length > 0 && (
        <ul className="mt-4 space-y-2">
          {actions.map((a) => (
            <li key={a.key} className="text-sm text-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{a.title}<span className={TAG}>{a.owner}</span></span>
                {doneKeys.has(a.key)
                  ? <span className="text-xs font-semibold text-emerald-800">Done {entries.filter((e) => e.action_key === a.key).map((e) => e.done_at).sort().slice(-1)[0]}</span>
                  : <button type="button" onClick={() => start(a.key, a)} className="text-xs font-semibold underline text-zinc-900">Mark done</button>}
              </div>
              {open === a.key && formFor(a)}
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <div className="mt-5 pt-3 border-t border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Done so far, oldest first</p>
          <ul className="text-sm text-zinc-800 space-y-1">
            {entries.map((e) => (
              <li key={e.id || `${e.done_at}-${e.title}`}>
                <b>{e.done_at}</b> · {e.title}<span className={TAG}>{e.owner_tag}</span>
                {e.note ? <span className="text-zinc-700"> · {e.note}</span> : null}
                {e.metric ? <span className="text-zinc-700"> · Experiment: {e.metric}{e.baseline ? `, then ${e.baseline}` : ''}{e.check_dates?.length ? `, check ${e.check_dates.join(', ')}` : ''}</span> : null}
                {e.link ? <> · <a className="underline break-all" href={e.link} target="_blank" rel="noopener noreferrer nofollow">{e.link}</a></> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
