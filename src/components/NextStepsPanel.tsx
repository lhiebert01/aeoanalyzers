// WO-015 — "Your next steps" on the sweep page: the same plan the report and the guide render
// (lib/fixItPlan.ts), as native UI. Lane 0 takes a Search Console upload, parsed in the browser.
import { useState } from 'react';
import { LANE_TITLE, VENDOR_LINE, type FixItPlan, type Lane } from '../lib/fixItPlan';
import { BAND_LABEL, NO_EXPORT_LINE, EXPORT_STEPS } from '../lib/searchStanding';

const TAG = 'ml-2 inline-block rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 align-middle';
const CLS = { brand: 'Your name', category: 'Category searches', specific: 'Specific questions' } as const;

export function NextStepsPanel({ plan, access, onUpload, uploading, uploadError, onUseDifferentiator }: {
  plan: FixItPlan; access: 'none' | 'sweep-only' | 'full';
  onUpload: (f: File) => void; uploading: boolean; uploadError: string | null;
  onUseDifferentiator: (qs: string[]) => void;
}) {
  const [openNote, setOpenNote] = useState<string | null>(null);
  if (access === 'none') {
    return (
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold">Your next steps</h3>
        <p className="text-sm text-zinc-700 mt-1">Your step-by-step plan is included on Pro and Business, and with a Day Pass for its own sweep.</p>
      </div>
    );
  }
  const st = plan.lane0.standing;
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-5">
      <div>
        <h3 className="font-bold">Your next steps</h3>
        <p className="text-base font-semibold text-zinc-900 mt-1">{plan.diagnosis.line}.</p>
        <p className="text-xs text-zinc-700">{plan.diagnosis.rule}</p>
      </div>

      {plan.oneNextStep && (
        <div className="rounded-2xl border-2 border-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-800">If you do one thing this month</p>
          <p className="font-bold text-zinc-900 mt-1">{plan.oneNextStep.title}.</p>
          <p className="text-sm text-zinc-800 mt-1">{plan.oneNextStep.why}</p>
        </div>
      )}

      {plan.movingFirst.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">Moving first (compared with last month)</p>
          <ul className="text-sm text-zinc-800 space-y-1">{plan.movingFirst.map((m) => <li key={m.label}>{m.label}: {m.then} → {m.now} <span className={TAG}>{m.dir}</span></li>)}</ul>
        </div>
      )}

      <section>
        <h4 className="font-bold text-zinc-900">{LANE_TITLE[0]}</h4>
        {st ? (
          <ul className="text-sm text-zinc-800 mt-2 space-y-1.5">
            {st.classes.filter((c) => c.queries).map((c) => (
              <li key={c.cls}><b>{CLS[c.cls]}</b>: {c.queries} searches, {c.impressions} impressions, average position {c.position}{c.band ? ` (${BAND_LABEL[c.band]})` : ''}. {c.sentence}</li>
            ))}
            {st.categoryPage && <li>The page search shows most for your non-brand searches: <span className="break-all">{st.categoryPage.url}</span>, average position {st.categoryPage.position}.</li>}
            {st.winnable.length > 0 && <li><b>Winnable</b> (already on page 1): {st.winnable.slice(0, 8).map((q) => `"${q.key}" (${q.position})`).join(', ')}.</li>}
          </ul>
        ) : (
          <div className="text-sm text-zinc-800 mt-2">
            <p>{NO_EXPORT_LINE}</p>
            <ol className="list-decimal ml-5 mt-1 space-y-0.5">{EXPORT_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        )}
        <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
          {st ? 'Upload a newer export' : 'Upload your export'} (.xlsx or .csv)
          <input type="file" accept=".xlsx,.csv" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }} className="text-xs" />
        </label>
        {uploading && <p className="text-xs text-zinc-700 mt-1">Reading the file in your browser…</p>}
        {uploadError && <p className="text-sm text-red-800 mt-1">{uploadError}</p>}
        <p className="text-xs text-zinc-700 mt-1">The file is read in your browser. Only the summary above is kept.</p>
      </section>

      {([1, 2, 3, 4] as Lane[]).map((lane) => {
        const steps = plan.steps.filter((s) => s.lane === lane);
        return (
          <section key={lane}>
            <h4 className="font-bold text-zinc-900">{LANE_TITLE[lane]}</h4>
            {!steps.length && lane !== 3 && <p className="text-sm text-zinc-700 mt-1">Nothing in this lane this month.</p>}
            <div className="mt-2 space-y-3">
              {steps.map((s) => (
                <div key={s.key} className="rounded-2xl border border-zinc-200 p-3">
                  <p className="font-semibold text-sm text-zinc-900">{s.title}<span className={TAG}>{s.owner}</span>{s.minutes > 0 && <span className={TAG}>about {s.minutes} min</span>}</p>
                  {s.lines.map((l, i) => <p key={i} className="text-sm text-zinc-800 mt-1 break-words">{l}</p>)}
                  <p className="text-xs text-zinc-800 mt-2"><b>Done when:</b> {s.doneWhen}</p>
                  <p className="text-xs text-zinc-800"><b>What the next sweep shows:</b> {s.nextSweepShows}</p>
                </div>
              ))}
              {lane === 3 && plan.pitch.map((r) => (
                <div key={r.url} className="rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-800">
                  <p className="font-semibold text-zinc-900">{r.title || r.url}</p>
                  <p className="break-all"><a className="underline" href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.url}</a> · cited {r.timesCited} times{r.byline ? ` · by ${r.byline}` : ''}</p>
                  <p className="mt-1 break-words">{r.contact}</p>
                  <button type="button" onClick={() => setOpenNote(openNote === r.url ? null : r.url)} className="mt-1 text-xs font-semibold underline text-zinc-900">{openNote === r.url ? 'Hide' : 'Show'} the draft note</button>
                  {openNote === r.url && <div className="mt-2 rounded-xl bg-zinc-50 p-3 space-y-2">{r.note.map((n, i) => <p key={i}>{n}</p>)}</div>}
                </div>
              ))}
              {lane === 3 && plan.vendors.length > 0 && (
                <details className="rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-800">
                  <summary className="cursor-pointer font-semibold text-zinc-900">{plan.vendors.length} vendor-owned page{plan.vendors.length === 1 ? '' : 's'} (unlikely to add you)</summary>
                  <p className="mt-2 italic">{VENDOR_LINE}</p>
                  <ul className="mt-2 space-y-1">{plan.vendors.map((v) => <li key={v.url} className="break-all">{v.url} (cited {v.timesCited} times)</li>)}</ul>
                </details>
              )}
            </div>
          </section>
        );
      })}

      {plan.differentiator.length > 0 && (
        <section className="rounded-2xl bg-zinc-50 p-4">
          <h4 className="font-bold text-zinc-900">A second set of questions where you are different</h4>
          <p className="text-sm text-zinc-800 mt-1">Optional, and a separate series: never mixed into your main questions or compared with them. Nothing runs until you start the sweep yourself.</p>
          <ol className="list-decimal ml-5 mt-2 text-sm text-zinc-800 space-y-0.5">{plan.differentiator.map((q) => <li key={q}>{q}</li>)}</ol>
          <button type="button" onClick={() => onUseDifferentiator(plan.differentiator)} className="mt-3 rounded-lg bg-zinc-900 text-white text-xs font-bold px-3 py-1.5">Add as a separate question set</button>
        </section>
      )}
    </div>
  );
}
