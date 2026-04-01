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
} from 'lucide-react';
import type { AnalysisResult } from '../services/geminiService';

interface Props {
  result: AnalysisResult;
}

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

export default function AdvancedAnalysisCards({ result }: Props) {
  const hasAnyAdvanced = result.citationHookDensity || result.eatAudit || result.llmSummarizationTest ||
    result.zeroClickPredictor || result.queryContentGap || result.semanticChunking;

  if (!hasAnyAdvanced) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
        <Brain className="w-6 h-6 text-zinc-900" />
        Advanced Analysis
      </h2>

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
              {result.citationHookDensity.exampleHooks.map((hook, i) => (
                <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm text-zinc-600 italic">
                  "{hook}"
                </div>
              ))}
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
              {result.queryContentGap.generatedQuestions.map((q, i) => (
                <div key={i} className={`rounded-xl p-3 ${q.answerQuality === 'Missing' ? 'bg-red-50 border border-red-100' : q.answerQuality === 'Partial' ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <div className="flex items-start gap-3">
                    {q.answerQuality === 'Strong' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : q.answerQuality === 'Partial' ? (
                      <Minus className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-700">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${q.answerQuality === 'Strong' ? 'text-emerald-600' : q.answerQuality === 'Partial' ? 'text-amber-600' : 'text-red-500'}`}>
                          {q.answerQuality}
                        </span>
                      </div>
                      {q.answerQuality === 'Missing' && (
                        <p className="text-xs text-red-600 mt-1.5 leading-relaxed">
                          <strong>Action:</strong> Create dedicated content answering this question with specific facts, data, and technical details. Add it as an FAQ entry or a standalone section on a relevant page.
                        </p>
                      )}
                      {q.answerQuality === 'Partial' && (
                        <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
                          <strong>Action:</strong> Expand existing content with additional metrics, specifications, and concrete examples. Replace vague language with measurable claims.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="text-sm text-zinc-400">Content is well-chunked with appropriate headings.</p>
            )}
          </CardWrapper>
        )}
      </div>
    </div>
  );
}
