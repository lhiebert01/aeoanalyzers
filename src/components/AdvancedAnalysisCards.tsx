import React from 'react';
import {
  Quote,
  UserCheck,
  Brain,
  MousePointerClick,
  HelpCircle,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Lock,
  ArrowRight,
  Share2,
  ScanText,
} from 'lucide-react';
import type { AnalysisResult } from '../services/geminiService';
import { recommendationFor } from '../services/geminiService';
import { categoryFromAnswerQuality, type GapCategory } from '../lib/queryGap';

interface Props {
  result: AnalysisResult;
  /** Pro/Business/admin. Free users see the diagnosis (scores) but the
      actionable fixes inside each card are locked. */
  isPaid?: boolean;
  onUpgrade?: () => void;
}

// Inline lock used to gate the "cure" (specific actions, source quotes, fixes)
// for free users while keeping the diagnostic scores visible.
function LockedFix({ label, onUpgrade }: { label: string; onUpgrade?: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl py-3 px-3 hover:bg-zinc-100 hover:text-zinc-700 transition-all"
    >
      <Lock className="w-3.5 h-3.5" /> {label}
      <span className="text-zinc-400 font-semibold">— Unlock</span>
    </button>
  );
}

const GAP_LABEL: Record<GapCategory, string> = {
  strong: 'Strong',
  schema_only: 'Schema only',
  partial: 'Partial',
  missing: 'Missing',
};

function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const color =
    score >= 70 ? 'bg-emerald-100 text-emerald-700' :
    score >= 40 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
      {score}/100{label ? ` ${label}` : ''}
    </span>
  );
}

function CardWrapper({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function AlignmentBadge({ alignment }: { alignment: string }) {
  if (alignment === 'Aligned') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Aligned</span>;
  if (alignment === 'Misaligned') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Misaligned</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><Minus className="w-3 h-3" /> Vague</span>;
}

export default function AdvancedAnalysisCards({ result, isPaid = true, onUpgrade }: Props) {
  const hasAnyAdvanced = result.citationHookDensity || result.eatAudit || result.llmSummarizationTest ||
    result.zeroClickPredictor || result.queryContentGap || result.semanticChunking ||
    result.entityGraphAudit || result.passageExtractability;

  if (!hasAnyAdvanced) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
        <Brain className="w-6 h-6 text-zinc-900" />
        Advanced Analysis
        {result.siteType && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 capitalize">
            {result.siteType.replace('_', ' ')} site
          </span>
        )}
      </h2>
      {(result.siteType === 'editorial' || result.siteType === 'news') && (
        <p className="text-sm text-zinc-500 -mt-2">
          Detected as an editorial brand — your voice is treated as an asset. Recommendations focus on
          structured-data enrichment, not prose rewrites.
        </p>
      )}

      {/* Free-tier value gate: diagnosis (scores) is shown; the specific fixes
          inside each card are locked for non-paying users. */}
      {!isPaid && (
        <div className="bg-zinc-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 mt-0.5 shrink-0 text-amber-300" />
            <div>
              <p className="font-bold">Your diagnosis is below. The fixes are locked.</p>
              <p className="text-sm text-zinc-300">
                You can see every score and where your gaps are. Unlock to get the exact actions, the on-page
                quotes to wrap in schema, the snippet rewrites, and the paste-ready JSON-LD.
              </p>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="shrink-0 bg-white text-zinc-900 px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
          >
            Unlock fixes <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Change 6: schema-density recommendations replace voice rewrites for editorial sites */}
      {result.schemaDensityRecommendations && result.schemaDensityRecommendations.length > 0 && (
        <CardWrapper icon={<Layers className="w-5 h-5 text-zinc-900" />} title="Schema-Density Opportunities">
          <p className="text-xs text-zinc-500 mb-4">
            Raise your AEO score by adding structured data — no changes to your prose. This is the right path for editorial brands.
          </p>
          <div className="space-y-3">
            {result.schemaDensityRecommendations.map((rec, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded">{rec.schemaType}</span>
                  {isPaid && <span className="text-xs text-emerald-600 font-medium">{rec.benefit}</span>}
                </div>
                {isPaid
                  ? <p className="text-sm text-zinc-600">{rec.reason}</p>
                  : <p className="text-sm text-zinc-400 italic">Why this helps and the exact benefit are in the full report.</p>}
              </div>
            ))}
          </div>
          {!isPaid && <div className="mt-3"><LockedFix label="See why each schema helps + how to add it" onUpgrade={onUpgrade} /></div>}
        </CardWrapper>
      )}

      {/* Entity-graph / portfolio audit */}
      {result.entityGraphAudit && (
        <CardWrapper icon={<Share2 className="w-5 h-5 text-zinc-900" />} title="Entity Graph & Portfolio">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <ScoreBadge score={result.entityGraphAudit.score} />
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${result.entityGraphAudit.sameAsFound ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {result.entityGraphAudit.sameAsFound ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} sameAs links
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${result.entityGraphAudit.founderEntityFound ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {result.entityGraphAudit.founderEntityFound ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} founder entity
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            AI engines resolve a brand to one authoritative entity via reciprocal <code className="bg-zinc-100 px-1 rounded">sameAs</code> links, a single canonical founder <code className="bg-zinc-100 px-1 rounded">Person</code>, and consistent NAP across all your properties. Citation is won at the portfolio level, not the page.
          </p>
          {result.entityGraphAudit.napConsistencyNote && (
            <p className="text-sm text-zinc-600 mb-3">{result.entityGraphAudit.napConsistencyNote}</p>
          )}
          {result.entityGraphAudit.sameAsUrls?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {result.entityGraphAudit.sameAsUrls.map((u) => (
                <span key={u} className="text-xs bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1 text-zinc-600 truncate max-w-full">{u}</span>
              ))}
            </div>
          )}
          {isPaid ? (
            <ul className="space-y-2">
              {result.entityGraphAudit.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-zinc-600 flex gap-2"><ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400" />{rec}</li>
              ))}
            </ul>
          ) : (
            <LockedFix label="See the portfolio-level entity-resolution fixes" onUpgrade={onUpgrade} />
          )}
        </CardWrapper>
      )}

      {/* Passage-level extractability */}
      {result.passageExtractability && (
        <CardWrapper icon={<ScanText className="w-5 h-5 text-zinc-900" />} title="Passage Extractability">
          <div className="flex items-center gap-2 mb-4">
            <ScoreBadge score={result.passageExtractability.selfContainedScore} label="self-contained" />
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            When an AI lifts a standalone chunk of your page, a "We build…" sentence has no entity anchor. Surgically insert self-contained, entity-named answer sentences under question-shaped headings — this is anchoring, not a voice change.
          </p>
          {result.passageExtractability.guidance && (
            <p className="text-sm text-zinc-600 mb-4">{result.passageExtractability.guidance}</p>
          )}
          {result.passageExtractability.pronounHeavyPassages.length > 0 && (
            isPaid ? (
              <div className="space-y-3">
                {result.passageExtractability.pronounHeavyPassages.map((p, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                    <p className="text-sm text-zinc-500 line-through">{p.excerpt}</p>
                    <p className="text-sm text-zinc-900 font-medium mt-1 flex gap-2"><Quote className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />{p.suggestedRewrite}</p>
                    <p className="text-xs text-zinc-400 mt-1">{p.issue}</p>
                  </div>
                ))}
              </div>
            ) : (
              <LockedFix label={`Unlock ${result.passageExtractability.pronounHeavyPassages.length} entity-anchored rewrites`} onUpgrade={onUpgrade} />
            )
          )}
        </CardWrapper>
      )}

      {/* Change 3: disclose offers stripped from the catalog */}
      {result.offerCatalogRemoved && result.offerCatalogRemoved.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Trimmed the OfferCatalog
          </p>
          <p className="text-xs text-amber-700 mb-2">
            We list only services a customer can actually use. These were removed because they looked like internal
            architecture or exceeded the 4-service cap:
          </p>
          <ul className="text-xs space-y-0.5">
            {result.offerCatalogRemoved.map((o, i) => (
              <li key={i}>• <strong>{o.name}</strong> — {o.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Citation Hook Density */}
        {result.citationHookDensity && (
          <CardWrapper icon={<Quote className="w-5 h-5 text-zinc-900" />} title="Citation Hook Density">
            <div className="flex items-center gap-4 mb-4">
              <ScoreBadge score={result.citationHookDensity.factualDensityScore} />
              <span className="text-xs text-zinc-400">
                {result.citationHookDensity.statsCount} stats &middot; {result.citationHookDensity.percentagesCount} percentages
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Top Citable Sentences</p>
              {(isPaid ? result.citationHookDensity.exampleHooks : result.citationHookDensity.exampleHooks.slice(0, 1)).map((hook, i) => (
                <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm text-zinc-600 italic">
                  "{hook}"
                </div>
              ))}
              {!isPaid && result.citationHookDensity.exampleHooks.length > 1 && (
                <LockedFix label={`See all ${result.citationHookDensity.exampleHooks.length} citable sentences`} onUpgrade={onUpgrade} />
              )}
            </div>
          </CardWrapper>
        )}

        {/* E-E-A-T Author Audit */}
        {result.eatAudit && (
          <CardWrapper icon={<UserCheck className="w-5 h-5 text-zinc-900" />} title="E-E-A-T Author Audit">
            <div className="flex items-center gap-4 mb-4">
              <ScoreBadge score={result.eatAudit.eatScore} />
              {result.eatAudit.authorFound ? (
                <span className="text-xs text-emerald-600 font-medium">Author: {result.eatAudit.authorName || 'Found'}</span>
              ) : (
                <span className="text-xs text-red-500 font-medium">No author found</span>
              )}
            </div>
            {result.eatAudit.genericAuthorFlag && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 bg-amber-50 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4" />
                Generic author name detected
              </div>
            )}
            {result.eatAudit.trustSignals.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Trust Signals</p>
                <div className="flex flex-wrap gap-2">
                  {result.eatAudit.trustSignals.map((s, i) => (
                    <span key={i} className="inline-block bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.eatAudit.warnings.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Warnings</p>
                <ul className="space-y-1">
                  {result.eatAudit.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardWrapper>
        )}

        {/* LLM Summarization Test */}
        {result.llmSummarizationTest && (
          <CardWrapper icon={<Brain className="w-5 h-5 text-zinc-900" />} title="LLM Summarization Test">
            <div className="mb-4">
              <AlignmentBadge alignment={result.llmSummarizationTest.alignment} />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Metadata Intent</p>
                <p className="text-sm text-zinc-600">{result.llmSummarizationTest.metadataIntent}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">AI Summary</p>
                <p className="text-sm text-zinc-600">{result.llmSummarizationTest.aiSummary}</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                <p className="text-sm text-zinc-600">{result.llmSummarizationTest.explanation}</p>
              </div>
            </div>
          </CardWrapper>
        )}

        {/* Zero-Click Predictor */}
        {result.zeroClickPredictor && (
          <CardWrapper icon={<MousePointerClick className="w-5 h-5 text-zinc-900" />} title="Zero-Click / Snippet Predictor">
            <div className="mb-4">
              <ScoreBadge score={result.zeroClickPredictor.featuredSnippetReadiness} label="snippet ready" />
            </div>
            {result.zeroClickPredictor.snippetOpportunities.length > 0 ? (
              isPaid ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Snippet Opportunities</p>
                {result.zeroClickPredictor.snippetOpportunities.map((opp, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-zinc-600">"{opp.currentText}"</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded">{opp.suggestedFormat}</span>
                      <span className="text-xs text-zinc-400">{opp.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">
                    {result.zeroClickPredictor.snippetOpportunities.length} text block{result.zeroClickPredictor.snippetOpportunities.length === 1 ? '' : 's'} could be reformatted to win featured snippets.
                  </p>
                  <LockedFix label="See which blocks & the exact format to use" onUpgrade={onUpgrade} />
                </div>
              )
            ) : (
              <p className="text-sm text-zinc-400">No snippet opportunities identified — content is well-formatted.</p>
            )}
          </CardWrapper>
        )}

        {/* Query-to-Content Gap */}
        {result.queryContentGap && (
          <CardWrapper icon={<HelpCircle className="w-5 h-5 text-zinc-900" />} title="Query-to-Content Gap">
            <div className="mb-4">
              <ScoreBadge score={result.queryContentGap.gapScore} label="coverage" />
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Questions AI agents are most likely to ask about your business. Items marked Missing or Partial need attention.
            </p>
            <div className="space-y-3">
              {result.queryContentGap.generatedQuestions.map((q, i) => {
                // Change 4: prefer the explicit gapCategory; back-fill for legacy records.
                const cat: GapCategory = q.gapCategory || categoryFromAnswerQuality(q.answerQuality, !!q.sourceQuote);
                const style =
                  cat === 'strong' ? { box: 'bg-emerald-50 border-emerald-100', accent: 'text-emerald-600' } :
                  cat === 'schema_only' ? { box: 'bg-blue-50 border-blue-100', accent: 'text-blue-600' } :
                  cat === 'partial' ? { box: 'bg-amber-50 border-amber-100', accent: 'text-amber-600' } :
                  { box: 'bg-red-50 border-red-100', accent: 'text-red-500' };
                const action = recommendationFor(cat, q.sourceQuote);
                const actionColor =
                  cat === 'schema_only' ? 'text-blue-700' :
                  cat === 'partial' ? 'text-amber-700' : 'text-red-600';
                return (
                  <div key={i} className={`rounded-xl p-3 border ${style.box}`}>
                    <div className="flex items-start gap-3">
                      {cat === 'strong' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : cat === 'schema_only' ? (
                        <Layers className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      ) : cat === 'partial' ? (
                        <Minus className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-700">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${style.accent}`}>
                            {GAP_LABEL[cat]}
                          </span>
                        </div>
                        {isPaid && cat === 'schema_only' && q.sourceQuote && (
                          <p className="text-xs text-blue-800/70 mt-1.5 italic border-l-2 border-blue-200 pl-2">
                            Found on page: "{q.sourceQuote}"
                          </p>
                        )}
                        {isPaid && action && (
                          <p className={`text-xs mt-1.5 leading-relaxed ${actionColor}`}>
                            <strong>Action:</strong> {action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!isPaid && (
                <LockedFix label="See the exact fix for each gap (and on-page quotes to reuse)" onUpgrade={onUpgrade} />
              )}
            </div>
          </CardWrapper>
        )}

        {/* Semantic Chunking */}
        {result.semanticChunking && (
          <CardWrapper icon={<Layers className="w-5 h-5 text-zinc-900" />} title="Semantic Chunking">
            <div className="mb-4">
              <ScoreBadge score={result.semanticChunking.chunkingScore} label="chunked" />
            </div>
            {result.semanticChunking.longBlocks.length > 0 ? (
              isPaid ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Long Blocks Without Headings</p>
                {result.semanticChunking.longBlocks.map((block, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded">~{block.approximateWordCount} words</span>
                      <span className="text-xs text-zinc-400">{block.context}</span>
                    </div>
                    <p className="text-sm text-zinc-600">
                      Suggested heading: <strong>"{block.suggestedHeading}"</strong>
                    </p>
                  </div>
                ))}
              </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">
                    {result.semanticChunking.longBlocks.length} long block{result.semanticChunking.longBlocks.length === 1 ? '' : 's'} need clearer headings so AI can parse them.
                  </p>
                  <LockedFix label="See the blocks & suggested headings" onUpgrade={onUpgrade} />
                </div>
              )
            ) : (
              <p className="text-sm text-zinc-400">Content is well-chunked with appropriate headings.</p>
            )}
          </CardWrapper>
        )}
      </div>
    </div>
  );
}
