import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Mail,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Layout,
  ShoppingBag,
  Code,
  Globe,
  Palette,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Download,
  Loader2
} from 'lucide-react';
import type { AnalysisResult } from '../services/geminiService';
import { categoryFromAnswerQuality, type GapCategory } from '../lib/queryGap';

function gapStatusLabel(cat: GapCategory): string {
  return cat === 'schema_only' ? 'Schema only' : cat.charAt(0).toUpperCase() + cat.slice(1);
}

function gapAction(cat: GapCategory): string {
  if (cat === 'strong') return 'No action needed';
  if (cat === 'schema_only') return 'Wrap the existing on-page answer in FAQPage schema — do NOT write new content';
  if (cat === 'partial') return 'Expand with additional details and metrics';
  return 'Create dedicated content with specific facts';
}

interface ImplementationRoadmapProps {
  isPaid: boolean;
  onUpgrade: () => void;
  analyzedUrl?: string;
  analysisResult: AnalysisResult;
  displayName?: string;
  citationProbability?: number;
  recommendations?: string[];
}

export default function ImplementationRoadmap({ isPaid, onUpgrade, analyzedUrl, analysisResult, displayName, citationProbability, recommendations }: ImplementationRoadmapProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'handoff' | 'platforms'>('summary');
  const [platform, setPlatform] = useState<'wordpress' | 'shopify' | 'hubspot' | 'wix' | 'custom'>('wordpress');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const { generateDocxReport } = await import('../services/docxGenerator');
      await generateDocxReport(
        analysisResult,
        analyzedUrl || 'Unknown URL',
        cleanDisplayName
      );
    } catch (err) {
      console.error('Error generating DOCX report:', err);
      // A failed dynamic import is almost always a stale chunk after a deploy
      // (the old hashed file no longer exists). Recover by reloading once so the
      // user gets the current build, then they can click again.
      const msg = String((err as Error)?.message || err);
      const isChunkError = /dynamically imported module|Failed to fetch|importing a module script|MIME type/i.test(msg);
      if (isChunkError) {
        const last = Number(sessionStorage.getItem('aeo-chunk-reload-at') || '0');
        if (Date.now() - last > 10000) {
          sessionStorage.setItem('aeo-chunk-reload-at', String(Date.now()));
          window.location.reload();
          return;
        }
        alert('A new version of the app was just deployed. Please refresh the page (Ctrl/Cmd+Shift+R) and try the download again.');
      } else {
        alert('Sorry — the Word report could not be generated. Please try again, or use the "Copy Template" option as a fallback.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Sanitize display name — strip file paths or garbage that may have been appended
  const cleanDisplayName = (displayName || 'AEO Analyzers User').split(/[&|\\\/]/).map(s => s.trim()).filter(s => s && !s.includes('.docx') && !s.includes('.pdf') && !s.includes(':\\'))[0] || 'AEO Analyzers User';

  const siteUrl = analyzedUrl || 'our website';
  const weakAreas = analysisResult.criteria.filter(c => c.score < 7);
  const strongAreas = analysisResult.criteria.filter(c => c.score >= 7);
  const sortedCriteria = [...analysisResult.criteria].sort((a, b) => a.score - b.score);
  const topPriorities = sortedCriteria.slice(0, 3);

  const findingsSection = analysisResult.criteria
    .map(c => `### ${c.name}\n\n**Score: ${c.score}/10**\n\n${c.feedback}\n\n**What to do:**\n${c.score < 7 ? '* This is a priority area. See implementation instructions below.' : '* This area is performing well. Maintain current implementation and monitor for changes.'}`)
    .join('\n\n---\n\n');

  const getScoreRating = (score: number): { rating: string; description: string } => {
    if (score <= 30) return { rating: 'Poor', description: 'AI engines will almost never cite this site' };
    if (score <= 50) return { rating: 'Below Average', description: 'Major gaps — AI may find the site but won\'t trust it as a source' };
    if (score <= 70) return { rating: 'Okay / Fair', description: 'Foundational elements exist but content lacks the specificity AI needs to cite confidently' };
    if (score <= 85) return { rating: 'Good', description: 'Strong structure + content — AI will cite this for many relevant queries' };
    return { rating: 'Excellent', description: 'Source of Truth — AI engines actively prefer this site as a primary reference' };
  };

  const { rating: scoreRating } = getScoreRating(analysisResult.score);

  const emailTemplate = `Dear Web Team,

We recently completed an Answer Engine Optimization (AEO) review of ${siteUrl} using AEO Analyzers.

**Current AEO Score:** ${analysisResult.score}/100
**Citation Probability:** Based on the analysis, this score reflects how likely AI agents are to cite this website when answering questions in your domain.

---

## What your score means

| Range | Rating | What it means |
|-------|--------|---------------|
| 0–30 | Poor | AI engines will almost never cite this site |
| 31–50 | Below Average | Major gaps — AI may find the site but won't trust it as a source |
| 51–70 | Okay / Fair | Foundational elements exist but content lacks the specificity AI needs to cite confidently |
| 71–85 | Good | Strong structure + content — AI will cite this for many relevant queries |
| 86–100 | Excellent | Source of Truth — AI engines actively prefer this site as a primary reference |

Your score of ${analysisResult.score}/100 with ${analysisResult.citationProbability}% citation probability places you in the **${scoreRating}** range.

---

## What is JSON-LD and why does it matter?

JSON-LD (JavaScript Object Notation for Linked Data) is a small block of structured code placed in your website's <head> section. It acts as a machine-readable "business card" — telling AI engines exactly what your business does, what products and services you offer, and how to cite you.

**How AI Answer Engines use JSON-LD:**

When an AI engine like Google Gemini, ChatGPT, or Perplexity answers a user's question, it scans websites for structured, trustworthy data it can quote. JSON-LD gives the AI a pre-organized summary of your business — no guessing required. Without it, AI has to infer your offerings from unstructured page content, which leads to incomplete or inaccurate citations.

Sites with comprehensive JSON-LD are significantly more likely to be cited as the authoritative source because the AI can extract exact service names, descriptions, and capabilities with high confidence.

---

## Why this matters

AI-powered search engines like Google Gemini, ChatGPT, and Perplexity are replacing traditional search results with direct answers. When a potential customer asks an AI a question about your industry, the AI pulls its answer from websites it considers authoritative and well-structured. If your website is not optimized for these AI engines, your competitors get cited instead — and you lose the customer without ever knowing it.

This is not about traditional SEO. This is about making your website readable, trustworthy, and citable by AI systems.

---

## Executive summary

${analysisResult.summary}

${weakAreas.length > 0 ? `The main areas that need improvement are:\n\n${weakAreas.map(c => `* **${c.name}** (${c.score}/10): ${c.feedback}`).join('\n')}` : 'The site performs well across most dimensions.'}

${strongAreas.length > 0 ? `\nAreas of strength:\n\n${strongAreas.map(c => `* **${c.name}** (${c.score}/10): ${c.feedback}`).join('\n')}` : ''}

---

## Top priorities

${topPriorities.map((c, i) => `### ${i + 1}) ${c.name} (Score: ${c.score}/10)\n\n${c.feedback}`).join('\n\n')}

---

## Key findings from the audit

${findingsSection}

---

## Specific implementation instructions

### A. Structured data tasks (JSON-LD)

JSON-LD is a small block of code that goes in your website's <head> section. It acts as a "business card" for AI — telling search engines and AI agents exactly what your business does, what you offer, and how to cite you. Without it, AI has to guess, and it usually guesses wrong.

**What to implement:**
* Service schema on solution and services pages
* Product schema on product pages
* FAQPage schema on pages with Q&A content
* Organization schema with detailed attributes
* OfferCatalog schema where multiple solutions are grouped

**Generated JSON-LD for ${siteUrl}:**

This complete schema lists all detected products, services, and capabilities. Paste it into the <head> section of your main Services or Solutions page.

\`\`\`
${(() => { const s = analysisResult.schemaSnippet || ''; try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s || 'See the AEO Analyzers report for the generated snippet.'; } })()}
\`\`\`

**Where to paste it:**
* WordPress: Install "Insert Headers and Footers" plugin, paste in Header section
* Shopify: Edit theme.liquid, paste above </head>
* HubSpot: Settings > Website > Pages > Site Header HTML
* Wix: Settings > Custom Code > Add Code > Head > All Pages
* Custom sites: Paste directly in your HTML <head> tag

### B. Content architecture tasks

AI systems prefer pages that clearly answer questions. For major pages, reorganize content to include:

* A clear H1 heading that defines the offering
* A concise intro paragraph stating what the page is about
* Logical H2/H3 subheadings
* Short sections answering common questions
* Lists or tables for specifications and capabilities
* FAQ content near the bottom where appropriate

### C. Semantic HTML tasks

Review your templates and ensure content uses meaningful HTML elements:

* <main> for primary content
* <article> for self-contained content blocks
* <section> for thematic groupings
* <header> and <footer> for page/section headers and footers
* <nav> for navigation

This helps AI engines understand your content hierarchy and extract information more accurately.

### D. Content guidance

When revising copy, follow this rule:

**Reduce:** broad adjectives, generic claims, purely promotional phrasing

**Increase:** definitions, use cases, technical specifics, measurable facts, supported technologies, deployment context, operational benefits tied to real capabilities

The goal is to make each page useful not only for visitors, but also for AI systems that need explicit, quotable answers.

---

${(analysisResult.verifiedSchema || analysisResult.comprehensiveSchema) ? `## Verified schema — safe to paste

The following JSON-LD contains ONLY values detected on your page, and only user-facing services (internal modules excluded). It is ready to deploy as-is — paste it into your site's <head> section.

\`\`\`
${analysisResult.verifiedSchema || analysisResult.comprehensiveSchema}
\`\`\`

---

` : ''}${analysisResult.candidateSchema && analysisResult.candidateSchema.trim() ? `## Candidate schema — VERIFY BEFORE PASTING

These fields were inferred, not detected on your page. Confirm every value is accurate before publishing — pasting unverified values can teach AI engines wrong facts about your business.

\`\`\`
${analysisResult.candidateSchema}
\`\`\`

---

` : ''}${analysisResult.schemaDensityRecommendations && analysisResult.schemaDensityRecommendations.length > 0 ? `## Schema-density opportunities

Your brand voice is an asset — keep it. Raise your AEO score by adding structured data instead of rewriting prose:

${analysisResult.schemaDensityRecommendations.map(rec => `* **${rec.schemaType}** — ${rec.reason} (${rec.benefit})`).join('\n')}

---

` : ''}${analysisResult.contentRewrites && analysisResult.contentRewrites.length > 0 ? `## Content rewrite examples (Adjective-to-Metric)

AI engines cite specific, measurable claims over vague marketing language. Here are before/after rewrites from your actual content:

${analysisResult.contentRewrites.map(rw => `**${rw.page}**
* Current (Low Citation): "${rw.current}"
* Proposed (High Citation): "${rw.proposed}"`).join('\n\n')}

---

` : ''}${analysisResult.queryContentGap && analysisResult.queryContentGap.generatedQuestions.length > 0 ? `## Knowledge gap FAQ

These are the questions AI agents are most likely to ask about your business. "Schema only" means the answer is already on your page and just needs FAQPage schema — do NOT write new content for those.

| Question | Status | Action |
|----------|--------|--------|
${analysisResult.queryContentGap.generatedQuestions.map(q => {
    const cat = q.gapCategory || categoryFromAnswerQuality(q.answerQuality, !!q.sourceQuote);
    const action = gapAction(cat);
    return `| ${q.question} | ${gapStatusLabel(cat)} | ${action} |`;
  }).join('\n')}

---

` : ''}${analysisResult.implementationChecklist && analysisResult.implementationChecklist.length > 0 ? `## Implementation checklist

${analysisResult.implementationChecklist.map(item => `- [ ] [${item.priority.toUpperCase()}] ${item.category}: ${item.action}`).join('\n')}

---

` : ''}## Recommended rollout order

### Phase 1: High-impact technical changes (1-2 days)
* Add JSON-LD structured data to priority pages
* Improve semantic HTML structure
* Review titles, meta descriptions, and alt text

### Phase 2: Core page rewrites (1-2 weeks)
* Homepage content optimization
* Main product and service pages
* About page with specific company facts

### Phase 3: Citation-building content (ongoing)
* Publish FAQ pages with structured data
* Create technical explainer content
* Add use-case and deployment documentation

---

## Success criteria

This effort is successful when:
* AI agents can clearly identify your products and services
* Key pages contain direct, factual answers to common questions
* Structured data is page-specific and valid
* Product and service pages are more likely to be cited as primary references

---

You can re-run this audit at any time: https://www.aeoanalyzers.com

Best regards,
${cleanDisplayName}`;

  if (!isPaid) {
    return (
      <div className="relative mt-12">
        {/* Blurred Preview */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-8 text-center rounded-[3rem] border-2 border-dashed border-zinc-200">
          <div className="bg-zinc-900 p-4 rounded-2xl mb-6 shadow-2xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-4 tracking-tight">Unlock the Implementation Roadmap</h3>
          <p className="text-zinc-500 max-w-md mb-8 text-lg">
            You have the score, now get the solution. Unlock step-by-step instructions, platform-specific guides, and copy-paste code snippets.
          </p>
          <button 
            onClick={onUpgrade}
            className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 flex items-center gap-2 text-lg"
          >
            Upgrade to Pro <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mock Content for Visual Structure */}
        <div className="opacity-20 pointer-events-none select-none">
          <div className="bg-white border border-zinc-200 rounded-[3rem] p-12 space-y-8">
            <div className="h-8 w-1/3 bg-zinc-100 rounded-full" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-32 bg-zinc-50 rounded-2xl" />
              <div className="h-32 bg-zinc-50 rounded-2xl" />
              <div className="h-32 bg-zinc-50 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-zinc-100 rounded-full" />
              <div className="h-4 w-5/6 bg-zinc-100 rounded-full" />
              <div className="h-4 w-4/6 bg-zinc-100 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-sm">
      <div className="bg-zinc-50 border-b border-zinc-100 p-8 md:p-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
              <Check className="w-3 h-3" />
              Premium Roadmap Unlocked
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Implementation Roadmap</h2>
            <p className="text-zinc-500 mt-2">Step-by-step instructions to achieve a perfect 100 AEO score.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm">
              <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<FileText className="w-4 h-4" />} label="Summary" />
              <TabButton active={activeTab === 'handoff'} onClick={() => setActiveTab('handoff')} icon={<Mail className="w-4 h-4" />} label="Handoff" />
              <TabButton active={activeTab === 'platforms'} onClick={() => setActiveTab('platforms')} icon={<Layout className="w-4 h-4" />} label="Platforms" />
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg disabled:opacity-60"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12">
        {activeTab === 'summary' && (
          <div className="space-y-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-zinc-400" />
                  Executive Summary
                </h3>
                <p className="text-zinc-600 leading-relaxed">
                  Your website currently has an AEO score of <strong>{analysisResult.score}/100</strong>. To become a "Source of Truth" for AI, you need to focus on <strong>Semantic Density</strong> and <strong>Technical Attribution</strong>.
                </p>
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-4">Top 3 Priorities</h4>
                  <ul className="space-y-4">
                    {analysisResult.criteria.filter(c => c.score < 7).slice(0, 3).map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          <p className="text-xs text-zinc-500">{c.feedback}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Code className="w-5 h-5 text-zinc-400" />
                  Verified Schema <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Safe to paste</span>
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  This JSON-LD contains only values detected on your page and only user-facing services (internal modules excluded). Paste it into your site's &lt;head&gt; section.
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-900 text-zinc-300 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed max-h-[400px]">
                    {(() => {
                      const schema = analysisResult.verifiedSchema || analysisResult.comprehensiveSchema || analysisResult.schemaSnippet || '';
                      if (!schema) return 'No snippet generated.';
                      try { return JSON.stringify(JSON.parse(schema), null, 2); } catch { return schema; }
                    })()}
                  </pre>
                  <button
                    onClick={() => handleCopy(analysisResult.verifiedSchema || analysisResult.comprehensiveSchema || analysisResult.schemaSnippet || '', 'snippet')}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    {copied === 'snippet' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Change 2: inferred fields are quarantined into a separate, clearly-labeled block. */}
                {analysisResult.candidateSchema && analysisResult.candidateSchema.trim() && (
                  <div>
                    <h4 className="text-base font-bold flex items-center gap-2 text-amber-700">
                      <Code className="w-4 h-4" />
                      Candidate Schema <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Verify before pasting</span>
                    </h4>
                    <p className="text-xs text-zinc-500 my-2">
                      These fields were <strong>inferred</strong>, not detected on your page. Confirm each value is accurate before publishing — do not paste blind.
                    </p>
                    <div className="relative group">
                      <pre className="bg-amber-950/90 text-amber-100 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed max-h-[300px]">
                        {(() => {
                          const schema = analysisResult.candidateSchema || '';
                          try { return JSON.stringify(JSON.parse(schema), null, 2); } catch { return schema; }
                        })()}
                      </pre>
                      <button
                        onClick={() => handleCopy(analysisResult.candidateSchema || '', 'candidate')}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        {copied === 'candidate' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'handoff' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Web Team Handoff</h3>
              <p className="text-zinc-500">Copy this template and send it to your developer or hosting agency.</p>
            </div>
            <div className="relative group">
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 font-mono text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed">
                {emailTemplate}
              </div>
              <button 
                onClick={() => handleCopy(emailTemplate, 'email')}
                className="absolute top-6 right-6 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl"
              >
                {copied === 'email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'email' ? 'Copied!' : 'Copy Template'}
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-3">
              <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                <Code className="w-4 h-4" />
                What is JSON-LD?
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>JSON-LD</strong> (JavaScript Object Notation for Linked Data) is a small block of code that you paste into your website's <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> section. It tells AI agents and search engines <em>what</em> your business is, <em>what</em> you offer, and <em>how</em> to cite you — in a language machines can read. Think of it as a "business card" for AI.
              </p>
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>How to add it:</strong> Copy the generated snippet from the Summary tab and paste it into your site's header. In <strong>WordPress</strong>, use the "Insert Headers and Footers" plugin. In <strong>Shopify</strong>, edit <code className="bg-blue-100 px-1 rounded">theme.liquid</code>. In <strong>HubSpot</strong>, go to Settings &gt; Website &gt; Pages &gt; Site Header HTML. In <strong>Wix</strong>, go to Settings &gt; Custom Code &gt; Head. For <strong>custom sites</strong>, paste it directly into your HTML <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> tag.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
              <Info className="w-6 h-6 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 leading-relaxed">
                <strong>Pro Tip:</strong> Most hosting agencies will charge 1-2 hours of work to implement these changes. Providing them with this specific roadmap reduces their research time and ensures the job is done correctly.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'platforms' && (
          <div className="space-y-12">
            <div className="flex flex-wrap justify-center gap-3">
              <PlatformButton active={platform === 'wordpress'} onClick={() => setPlatform('wordpress')} icon={<Layout className="w-5 h-5" />} label="WordPress" />
              <PlatformButton active={platform === 'shopify'} onClick={() => setPlatform('shopify')} icon={<ShoppingBag className="w-5 h-5" />} label="Shopify" />
              <PlatformButton active={platform === 'hubspot'} onClick={() => setPlatform('hubspot')} icon={<Globe className="w-5 h-5" />} label="HubSpot" />
              <PlatformButton active={platform === 'wix'} onClick={() => setPlatform('wix')} icon={<Palette className="w-5 h-5" />} label="Wix" />
              <PlatformButton active={platform === 'custom'} onClick={() => setPlatform('custom')} icon={<Code className="w-5 h-5" />} label="Custom Code" />
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <h3 className="text-2xl font-bold capitalize">{platform} Implementation</h3>
                <div className="space-y-6">
                  {platform === 'wordpress' && (
                    <>
                      <Step number={1} title="Install a Header/Footer Plugin">
                        Install a plugin like "Insert Headers and Footers" or "Code Snippets" from the WordPress repository.
                      </Step>
                      <Step number={2} title="Paste the AEO Snippet">
                        Navigate to the plugin settings and paste your JSON-LD snippet into the <strong>Header</strong> section.
                      </Step>
                      <Step number={3} title="Update Page Content">
                        Ensure your pages are using Gutenberg blocks or a modern page builder that outputs semantic HTML.
                      </Step>
                    </>
                  )}
                  {platform === 'shopify' && (
                    <>
                      <Step number={1} title="Edit theme.liquid">
                        Go to Online Store &gt; Themes &gt; Actions &gt; Edit Code. Open the <code>theme.liquid</code> file.
                      </Step>
                      <Step number={2} title="Inject the Snippet">
                        Find the <code>&lt;/head&gt;</code> tag and paste your AEO JSON-LD snippet directly above it.
                      </Step>
                      <Step number={3} title="Audit Product Schema">
                        Shopify has built-in schema, but it's often incomplete. Use our snippet to supplement missing fields.
                      </Step>
                    </>
                  )}
                  {platform === 'hubspot' && (
                    <>
                      <Step number={1} title="Open Site Header Settings">
                        Go to <strong>Settings &gt; Website &gt; Pages</strong>. Scroll to the <strong>Site Header HTML</strong> section.
                      </Step>
                      <Step number={2} title="Paste JSON-LD Snippet">
                        Paste your AEO JSON-LD snippet wrapped in <code>&lt;script type="application/ld+json"&gt;</code> tags into the Site Header HTML box.
                      </Step>
                      <Step number={3} title="Add FAQ Schema to Blog Posts">
                        Use HubSpot's Custom Modules or HubL templates to add FAQ structured data to your knowledge base and blog content.
                      </Step>
                    </>
                  )}
                  {platform === 'wix' && (
                    <>
                      <Step number={1} title="Open Custom Code Settings">
                        Go to <strong>Settings &gt; Custom Code</strong> (or <strong>Advanced &gt; Custom Code</strong> in the Wix dashboard).
                      </Step>
                      <Step number={2} title="Add JSON-LD to Head">
                        Click <strong>"+ Add Code"</strong>, paste your AEO JSON-LD snippet, set placement to <strong>"Head"</strong> and apply to <strong>"All Pages"</strong>.
                      </Step>
                      <Step number={3} title="Enable Wix SEO Tools">
                        Use Wix's built-in SEO panel on each page to add meta descriptions and structured data markup for individual pages.
                      </Step>
                    </>
                  )}
                  {platform === 'custom' && (
                    <>
                      <Step number={1} title="Locate Main Template">
                        Find your root layout or main HTML template file.
                      </Step>
                      <Step number={2} title="Add JSON-LD">
                        Place the generated <code>&lt;script type="application/ld+json"&gt;</code> block inside the <code>&lt;head&gt;</code>.
                      </Step>
                      <Step number={3} title="Refactor Divs">
                        Audit your components and replace generic <code>&lt;div&gt;</code> tags with semantic elements like <code>&lt;main&gt;</code>, <code>&lt;article&gt;</code>, and <code>&lt;section&gt;</code>.
                      </Step>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-zinc-900 rounded-[2rem] p-8 text-white">
                <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                  Validation Tools
                </h4>
                <p className="text-zinc-400 text-sm mb-8">After implementing, use these official tools to verify your AEO readiness.</p>
                <div className="space-y-4">
                  <ValidationLink title="Google Rich Results Test" url="https://search.google.com/test/rich-results" />
                  <ValidationLink title="Schema Markup Validator" url="https://validator.schema.org/" />
                  <ValidationLink title="AEO Analyzers (Re-run)" url="#" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${active ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-900'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PlatformButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 border transition-all ${active ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Step({ number, title, children }: { number: number, title: string, children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-900 shrink-0">
        {number}
      </div>
      <div className="space-y-2">
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-zinc-500 text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ValidationLink({ title, url }: { title: string, url: string }) {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
    >
      <span className="text-sm font-medium">{title}</span>
      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all" />
    </a>
  );
}
