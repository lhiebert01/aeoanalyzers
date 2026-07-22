import { Search, Eye, EyeOff, Link2, CheckCircle2, XCircle, AlertTriangle, FileCode2 } from 'lucide-react';
import type { IndexCoverageResult } from '../lib/indexCoverage';

interface Props {
  indexCoverage?: IndexCoverageResult;
}

/**
 * Index-coverage & discoverability panel (WO-8). Sits directly under the crawler
 * access card: "allowed to crawl" (crawlerAccess) is necessary but not
 * sufficient — the page also has to be VISIBLE to a JS-less bot, verified in the
 * index that feeds Perplexity/ChatGPT (Bing), and resolvable to one entity.
 */
export default function IndexCoverageCard({ indexCoverage }: Props) {
  if (!indexCoverage) return null;
  const ic = indexCoverage;
  const critical = ic.status === 'critical';
  const warn = ic.status === 'warn';

  const border = critical ? 'bg-red-50 border-red-300' : warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-zinc-200';
  const iconWrap = critical ? 'bg-red-100' : warn ? 'bg-amber-100' : 'bg-emerald-50';

  return (
    <div className={`rounded-3xl p-8 shadow-sm border ${border}`}>
      <div className="flex items-start gap-4">
        <div className={`shrink-0 rounded-2xl p-3 ${iconWrap}`}>
          <Search className={`w-7 h-7 ${critical ? 'text-red-600' : warn ? 'text-amber-600' : 'text-emerald-600'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-lg">Index Coverage &amp; Discoverability</h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                ic.score >= 70 ? 'bg-emerald-100 text-emerald-700' : ic.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {ic.score}/100
            </span>
            {ic.clientRenderedShell && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                <AlertTriangle className="w-3 h-3" /> Invisible to AI bots (client-rendered)
              </span>
            )}
          </div>
          <p className={`text-sm mt-2 leading-relaxed ${critical ? 'text-red-800' : warn ? 'text-amber-800' : 'text-zinc-600'}`}>
            {ic.summary}
          </p>

          {/* Signal grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
            {/* Non-JS render test */}
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              {ic.clientRenderedShell ? (
                <EyeOff className="w-4 h-4 text-red-500" />
              ) : (
                <Eye className="w-4 h-4 text-zinc-400" />
              )}
              <span className="font-semibold">Non-JS render:</span>
              <span className={ic.clientRenderedShell ? 'text-red-600' : 'text-zinc-600'}>
                {ic.renderedTextLength.toLocaleString()} chars visible to bots
              </span>
            </div>
            {/* Custom-coded flag (context for the render test) */}
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <FileCode2 className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold">Rendering:</span>
              <span className="text-zinc-600">{ic.isCustomCoded ? 'custom-coded (SSR/prerender matters)' : 'server-rendered / CMS'}</span>
            </div>
            {/* Bing verification */}
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Search className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold">Bing signal:</span>
              {ic.bingVerificationMetaFound ? (
                <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> verification tag present</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600"><XCircle className="w-3.5 h-3.5" /> none on page</span>
              )}
            </div>
            {/* sameAs */}
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Link2 className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold">Entity profiles (sameAs):</span>
              <span className={ic.sameAsCount === 0 ? 'text-amber-600' : 'text-zinc-600'}>
                {ic.sameAsCount} found
              </span>
            </div>
          </div>

          {ic.recommendations.length > 0 && (
            <ul className="mt-5 space-y-2">
              {ic.recommendations.map((rec, i) => (
                <li key={i} className={`text-sm flex gap-2 ${critical ? 'text-red-800' : 'text-zinc-600'}`}>
                  <span className="mt-1 shrink-0">
                    {critical ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-zinc-400" />}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
