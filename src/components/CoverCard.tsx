// WO-AEO-REPORT-POLISH-001 Lane C — the executive summary on screen, from the same CoverInput
// the .md/.docx page 1 renders (lib/reportCover.ts), so the screen and the download agree.
import type { CoverInput } from '../lib/reportCover';

export function CoverCard({ cover }: { cover: CoverInput }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-zinc-100">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Executive summary</div>
        <h2 className="text-2xl font-black text-zinc-900 mt-1">{cover.title}</h2>
        <div className="text-sm text-zinc-500 mt-1">{[cover.brand, cover.domain, cover.date, cover.preparedBy ? `Prepared by ${cover.preparedBy}` : null].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
        {cover.headlines.map((h) => (
          <div key={h.plain} className="px-6 py-5 border-t-4 border-emerald-600">
            <div className="text-xs font-bold text-zinc-600">{h.plain}</div>
            <div className="text-4xl font-black text-zinc-900 mt-1">{h.value}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{h.precise}</div>
            {h.note && <div className="text-[11px] text-zinc-400">{h.note}</div>}
          </div>
        ))}
      </div>
      <div className="px-6 sm:px-8 py-5 grid md:grid-cols-2 gap-8 border-t border-zinc-100">
        <div>
          {cover.bars.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">{cover.barsTitle}</div>
              <div className="space-y-2">
                {cover.bars.map((b) => (
                  <div key={b.label} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-xs">
                    <div className="font-semibold text-zinc-800 truncate">{b.label}</div>
                    <div className="h-3 rounded bg-zinc-200 overflow-hidden"><div className="h-3 bg-emerald-700" style={{ width: `${b.pct ?? 0}%` }} /></div>
                    <div className="text-zinc-800 tabular-nums"><b>{b.pct === null ? 'Unmeasured' : `${b.pct}%`}</b> <span className="text-zinc-400">{b.detail}</span></div>
                  </div>
                ))}
              </div>
            </>
          )}
          {cover.namedInstead && cover.namedInstead.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Who got named instead</div>
              <ol className="text-sm text-zinc-800 space-y-1">
                {cover.namedInstead.map((n, i) => (
                  <li key={n.name} className="flex justify-between gap-3"><span>{i + 1}. {n.name}{n.seeded ? <span className="text-zinc-400 text-xs"> · entered by you</span> : null}</span><b className="tabular-nums">{n.count}</b></li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">What this means</div>
          <p className="text-sm text-zinc-800 leading-relaxed">{cover.meaning}</p>
          {cover.firstThree.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Do these three things first</div>
              <ol className="text-sm text-zinc-800 space-y-1.5">
                {cover.firstThree.map((a, i) => (
                  <li key={a.what}><b>{i + 1}. {a.what}</b> <span className="text-zinc-500">— see “{a.section}”</span></li>
                ))}
              </ol>
            </div>
          )}
          {cover.pointer && <p className="text-xs text-zinc-500 italic mt-4">{cover.pointer}</p>}
        </div>
      </div>
    </div>
  );
}
