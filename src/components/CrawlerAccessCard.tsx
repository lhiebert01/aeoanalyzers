import { ShieldAlert, ShieldCheck, Bot, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { CrawlerAccessResult } from '../lib/crawlerAccess';

interface Props {
  crawlerAccess?: CrawlerAccessResult;
  /** The model's original score before the crawler gate capped it, if capped. */
  scoreBeforeCap?: number;
  cappedScore?: number;
}

/**
 * Foundational crawler-access panel. Rendered at the TOP of results because a
 * page AI engines cannot read cannot be their source of truth — this is the one
 * thing that can silently zero out an otherwise strong AEO report.
 */
export default function CrawlerAccessCard({ crawlerAccess, scoreBeforeCap, cappedScore }: Props) {
  if (!crawlerAccess) return null;
  const ca = crawlerAccess;
  const critical = ca.criticalBlock;

  return (
    <div
      className={`rounded-3xl p-8 shadow-sm border ${
        critical ? 'bg-red-50 border-red-300' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 rounded-2xl p-3 ${critical ? 'bg-red-100' : 'bg-emerald-50'}`}>
          {critical ? (
            <ShieldAlert className="w-7 h-7 text-red-600" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-lg">AI Crawler Access</h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                ca.score >= 70 ? 'bg-emerald-100 text-emerald-700' : ca.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {ca.score}/100
            </span>
            {critical && scoreBeforeCap != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                <AlertTriangle className="w-3 h-3" /> Score capped {scoreBeforeCap} → {cappedScore}
              </span>
            )}
          </div>
          <p className={`text-sm mt-2 leading-relaxed ${critical ? 'text-red-800' : 'text-zinc-600'}`}>
            {ca.summary}
          </p>

          {/* Engine allow/deny grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Bot className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold">robots.txt:</span>
              <span className={ca.robotsFound ? 'text-zinc-600' : 'text-amber-600'}>
                {ca.robotsFound ? 'found' : 'not found (default-allow)'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold">llms.txt:</span>
              {ca.llmsTxtFound ? (
                <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> present</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600"><XCircle className="w-3.5 h-3.5" /> missing</span>
              )}
            </div>
          </div>

          {(ca.noindexDetected || ca.edgeBlockSuspected) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ca.noindexDetected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                  <AlertTriangle className="w-3 h-3" /> noindex — removed from search
                </span>
              )}
              {ca.edgeBlockSuspected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-600 text-white">
                  <ShieldAlert className="w-3 h-3" /> Cloudflare edge block (fix in dashboard, not code)
                </span>
              )}
            </div>
          )}

          {ca.blockedBots.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Blocked AI crawlers</div>
              <div className="flex flex-wrap gap-2">
                {ca.blockedBots.map((b) => (
                  <span
                    key={b.name}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      b.critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                    title={b.engine}
                  >
                    <XCircle className="w-3 h-3" /> {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ca.allowedCriticalBots.length > 0 && !critical && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Allowed answer engines</div>
              <div className="flex flex-wrap gap-2">
                {ca.allowedCriticalBots.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ca.recommendations.length > 0 && (
            <ul className="mt-5 space-y-2">
              {ca.recommendations.map((rec, i) => (
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
