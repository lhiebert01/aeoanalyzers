// WO-UX-CLARITY-001 — shared "Which tool, when?" explainer + cross-links + the
// sweep action-agenda renderer. Shared so the Analyzer and Sweeps pages present an
// identical Score-vs-Sweep story, and so the web action block reuses the SAME
// markdown the .md/exec reports emit (one source of truth: buildSweepActionAgenda).
import type { ReactNode } from 'react';
import { SCORE_VS_SWEEP as C } from '../content/scoreVsSweep';

/** The two-panel Score-vs-Sweep explainer card. */
export function ScoreVsSweepCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm ${className}`}>
      <h3 className="font-bold mb-3">{C.heading}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 p-4 bg-zinc-50/60">
          <p className="font-semibold text-sm mb-1 text-zinc-900">{C.score.title}</p>
          <p className="text-xs text-zinc-600 leading-relaxed">{C.score.body}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 bg-zinc-50/60">
          <p className="font-semibold text-sm mb-1 text-zinc-900">{C.sweep.title}</p>
          <p className="text-xs text-zinc-600 leading-relaxed">{C.sweep.body}</p>
        </div>
      </div>
    </div>
  );
}

/** A cross-link button. `to="sweep"` shows the run-a-sweep prompt; `to="score"` the fixes prompt. */
export function CrossLink({ to, onClick }: { to: 'sweep' | 'score'; onClick?: () => void }) {
  const label = to === 'sweep' ? C.toSweep : C.toScore;
  return (
    <button type="button" onClick={onClick}
      className="text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline">
      {label}
    </button>
  );
}

// --- action-agenda renderer (renders buildSweepActionAgenda markdown natively) ---

function bold(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>);
}

/** Render the markdown agenda lines from buildSweepActionAgenda as native UI. */
export function AgendaBlock({ lines }: { lines: string[] }) {
  const els: ReactNode[] = [];
  let code: string[] | null = null;
  let list: string[] | null = null;
  const flushList = () => {
    if (list) {
      const items = list;
      els.push(<ul key={`u${els.length}`} className="list-disc ml-5 text-sm text-zinc-700 space-y-1">{items.map((t, i) => <li key={i}>{bold(t)}</li>)}</ul>);
      list = null;
    }
  };
  for (const line of lines) {
    if (line === '```html') { code = []; continue; }
    if (line === '```') {
      if (code) { els.push(<pre key={`c${els.length}`} className="bg-zinc-900 text-zinc-100 text-xs rounded-xl p-3 overflow-x-auto whitespace-pre">{code.join('\n')}</pre>); code = null; }
      continue;
    }
    if (code) { code.push(line); continue; }
    if (line.startsWith('## ')) continue; // section title rendered by the card header
    if (line.startsWith('- ')) { (list ||= []).push(line.slice(2)); continue; }
    flushList();
    if (!line.trim()) continue;
    els.push(<p key={`p${els.length}`} className="text-sm text-zinc-700 leading-relaxed">{bold(line)}</p>);
  }
  flushList();
  return <div className="space-y-2">{els}</div>;
}
