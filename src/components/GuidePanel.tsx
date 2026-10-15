// WO-014 — "Download your step-by-step guide" (Word and PDF), personalized from stored data.
// Pro and Business everywhere; a Day Pass from its own sweep; Free sees the two public guides.
// Downloading never marks anything done.
import { useState } from 'react';
import { BUSINESS_TYPE_LABEL, GUIDE_GATED, type BusinessType, type Guide } from '../lib/stepGuide';
import { rememberBusinessType } from '../lib/guideData';

export type GuideAccess = 'full' | 'sweep-only' | 'none';

const PUBLIC = (
  <span>
    Free guides: <a className="underline font-semibold text-zinc-900" href="/guides/directory-listings">directory listings</a> and{' '}
    <a className="underline font-semibold text-zinc-900" href="/guides/wikidata">Wikidata</a>.
  </span>
);

export function GuidePanel({ domain, access, dayPassNote, build }: {
  domain: string;
  access: GuideAccess;
  /** Shown on the AEO Score report to a Day Pass: the guide comes from the sweep. */
  dayPassNote?: boolean;
  /** Builds the guide from stored data, with the customer's business type if they chose one. */
  build: (businessType: BusinessType | null) => Promise<Guide>;
}) {
  const [busy, setBusy] = useState<null | 'docx' | 'pdf'>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | 'docx' | 'pdf'>(null);
  const [chosen, setChosen] = useState<BusinessType | null>(null);

  if (access === 'none') {
    return (
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold mb-1">Your step-by-step guide</h3>
        <p className="text-sm text-zinc-800">{dayPassNote ? 'Your Day Pass includes the guide for its own sweep: download it from your Citation Sweep report.' : GUIDE_GATED}</p>
        <p className="text-sm text-zinc-800 mt-2">{PUBLIC}</p>
      </div>
    );
  }

  async function go(kind: 'docx' | 'pdf', type: BusinessType | null) {
    setBusy(kind); setError(null);
    try {
      const g = await build(type);
      if (g.needsBusinessType && !type) { setAsk(kind); return; }
      const svc = await import('../services/guideDocx');
      if (kind === 'docx') await svc.downloadGuideDocx(g);
      else if (!(await svc.openGuidePdf(g))) setError('Your browser blocked the PDF window. Allow pop-ups for this site and try again.');
    } catch {
      setError('The guide could not be built. Try again.');
    } finally { setBusy(null); }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
      <h3 className="font-bold mb-1">Your step-by-step guide</h3>
      <p className="text-sm text-zinc-800">Plain steps for {domain}, the exact text to paste, where to go and how long each step takes, in four parts your team can split: your website, your listings, your knowledge-base entry and the pages engines read. Mark each step in your Record as you go.</p>
      {ask && (
        <div className="mt-3 rounded-2xl border border-zinc-300 p-4">
          <p className="text-sm font-semibold text-zinc-900">Which best describes {domain}? We ask once, so the listings match your business.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((t) => (
              <button key={t} type="button" onClick={() => setChosen(t)} className={`text-xs font-semibold rounded-full border px-3 py-1 ${chosen === t ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-400 text-zinc-900'}`}>{BUSINESS_TYPE_LABEL[t]}</button>
            ))}
          </div>
          <button type="button" disabled={!chosen} onClick={() => { if (!chosen) return; rememberBusinessType(domain, chosen); const k = ask; setAsk(null); go(k, chosen); }} className="mt-3 rounded-lg bg-zinc-900 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-60">Confirm and download</button>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-3">
        <button type="button" disabled={!!busy} onClick={() => go('docx', chosen)} className="rounded-lg bg-zinc-900 text-white text-sm font-bold px-4 py-2">{busy === 'docx' ? 'Building…' : 'Download your step-by-step guide (Word)'}</button>
        <button type="button" disabled={!!busy} onClick={() => go('pdf', chosen)} className="rounded-lg border border-zinc-900 text-zinc-900 text-sm font-bold px-4 py-2">{busy === 'pdf' ? 'Building…' : 'PDF'}</button>
      </div>
      {access === 'sweep-only' && <p className="text-xs text-zinc-700 mt-2">Your Day Pass includes this guide for this sweep. The Record, which fills the guide's tracking table, is included on Pro and Business.</p>}
      {error && <p className="text-sm text-red-800 mt-2">{error}</p>}
      <p className="text-xs text-zinc-700 mt-3">{PUBLIC}</p>
    </div>
  );
}
