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
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface ImplementationRoadmapProps {
  isPaid: boolean;
  onUpgrade: () => void;
  analyzedUrl?: string;
  analysisResult: {
    score: number;
    summary: string;
    criteria: { name: string; score: number; feedback: string }[];
    schemaSnippet?: string;
  };
}

export default function ImplementationRoadmap({ isPaid, onUpgrade, analyzedUrl, analysisResult }: ImplementationRoadmapProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'handoff' | 'platforms'>('summary');
  const [platform, setPlatform] = useState<'wordpress' | 'shopify' | 'custom'>('wordpress');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const siteUrl = analyzedUrl || 'our website';
  const findings = analysisResult.criteria.filter(c => c.score < 7);
  const allFindings = findings.length > 0
    ? findings.map(c => `- ${c.name} (Score: ${c.score}/10): ${c.feedback}`).join('\n')
    : analysisResult.criteria.slice(0, 3).map(c => `- ${c.name} (Score: ${c.score}/10): ${c.feedback}`).join('\n');

  const emailTemplate = `Subject: Technical Request: AEO Optimization for ${siteUrl}

Dear Web Team,

We recently conducted an Answer Engine Optimization (AEO) audit of ${siteUrl} using AEO Analyzers (https://www.aeoanalyzers.com).

Overall AEO Score: ${analysisResult.score}/100

Summary: ${analysisResult.summary}

Key Findings:
${allFindings}

Required Actions:
1. Implement Structured Data (JSON-LD): We need specific Schema.org markup to help AI agents parse our content. A generated snippet is included below.
2. Semantic HTML Updates: Ensure we are using proper <article>, <section>, and <main> tags instead of generic divs.
3. Metadata Optimization: Update our meta tags to include AI-specific hints.

Generated JSON-LD Snippet:
${analysisResult.schemaSnippet || 'See the AEO Analyzer report for the generated snippet.'}

You can re-run this analysis at: https://www.aeoanalyzers.com

Please let me know when we can schedule these updates.

Best regards,
[Your Name]`;

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
          <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm">
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<FileText className="w-4 h-4" />} label="Summary" />
            <TabButton active={activeTab === 'handoff'} onClick={() => setActiveTab('handoff')} icon={<Mail className="w-4 h-4" />} label="Handoff" />
            <TabButton active={activeTab === 'platforms'} onClick={() => setActiveTab('platforms')} icon={<Layout className="w-4 h-4" />} label="Platforms" />
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
                  Your AEO Snippet
                </h3>
                <p className="text-xs text-zinc-500 mb-4">Copy and paste this JSON-LD block into your site's &lt;head&gt; section.</p>
                <div className="relative group">
                  <pre className="bg-zinc-900 text-zinc-300 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed max-h-[300px]">
                    {analysisResult.schemaSnippet || 'No snippet generated.'}
                  </pre>
                  <button 
                    onClick={() => handleCopy(analysisResult.schemaSnippet || '', 'snippet')}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    {copied === 'snippet' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
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
            <div className="flex justify-center gap-4">
              <PlatformButton active={platform === 'wordpress'} onClick={() => setPlatform('wordpress')} icon={<Layout className="w-5 h-5" />} label="WordPress" />
              <PlatformButton active={platform === 'shopify'} onClick={() => setPlatform('shopify')} icon={<ShoppingBag className="w-5 h-5" />} label="Shopify" />
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
                  <ValidationLink title="AEO Analyzer (Re-run)" url="#" />
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
