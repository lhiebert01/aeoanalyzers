import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Target, Swords, Code, CheckCircle2, Zap, ArrowRight, ShieldCheck, Globe, Cpu, AlertCircle } from 'lucide-react';

export default function UserGuideDashboard() {
  return (
    <div className="space-y-24 pb-24">
      {/* Header */}
      <section className="text-center space-y-6 pt-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <BarChart3 className="w-3 h-3" />
          User Guide
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase">
          Mastering the <span className="text-zinc-300 italic font-serif lowercase">&</span> Answer Engine Era
        </h1>
        <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
          How to optimize your website for the next generation of search: Gemini, GPT-4, and Perplexity.
        </p>
      </section>

      {/* 1. AEO Score */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">01</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">The AEO Score</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScoreLevel 
            range="80-100" 
            label="Excellent" 
            color="bg-emerald-500" 
            description="AI agents can easily parse and cite your site as a primary source."
          />
          <ScoreLevel 
            range="50-79" 
            label="Good" 
            color="bg-amber-500" 
            description="Solid foundation, but needs improvement in structured data or semantic clarity."
          />
          <ScoreLevel 
            range="Below 50" 
            label="Poor" 
            color="bg-red-500" 
            description="AI agents may struggle to find, parse, or trust your content."
          />
        </div>
      </section>

      {/* 2. Citation Probability */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">02</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">Citation Probability</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="bg-zinc-900 text-white rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20 opacity-5">
            <Target className="w-64 h-64" />
          </div>
          <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h3 className="text-3xl font-black tracking-tight leading-tight">
                Our most <span className="text-emerald-400 italic font-serif lowercase">critical</span> metric.
              </h3>
              <p className="text-zinc-400 text-lg leading-relaxed">
                This predicts the likelihood of an AI agent attributing a specific claim or answer directly to your website.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Use clear, authoritative language
                </div>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Avoid jargon and complex sentence structures
                </div>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Maintain high "Trust & Authority" scores
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Probability</div>
                  <div className="text-5xl font-black tracking-tighter text-emerald-400">94%</div>
                </div>
                <div className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-2">High Confidence</div>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: '94%' }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                "The AI agent has identified this entity as the primary source of truth for the query."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Competitive Duel */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">03</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">The Competitive Duel</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Step 
            number="01" 
            title="Enter URLs" 
            description="Input your website and your primary competitor's URL for a head-to-head audit."
            icon={<Globe className="w-5 h-5" />}
          />
          <Step 
            number="02" 
            title="Analyze Verdict" 
            description="Our AI simulates a 'choice' between the two sources based on semantic clarity."
            icon={<Swords className="w-5 h-5" />}
          />
          <Step 
            number="03" 
            title="Close the Gap" 
            description="Identify exactly where they are beating you—usually in Schema implementation."
            icon={<Zap className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* 4. JSON-LD Fix */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">04</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">The Instant Fix</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Code className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-black tracking-tight text-indigo-900">Implementing JSON-LD</h3>
            <p className="text-indigo-700/80 text-lg leading-relaxed">
              After every analysis, we generate a custom "machine-readable" layer. This is the single most effective way to improve your AEO score.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0 mt-1">1</div>
                <p className="text-indigo-900 font-medium">Copy the generated code snippet from your analysis result.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0 mt-1">2</div>
                <p className="text-indigo-900 font-medium">Paste it into the <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-sm">&lt;head&gt;</code> section of your site.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full bg-zinc-900 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <pre className="text-[10px] sm:text-xs text-indigo-300 font-mono overflow-x-auto leading-relaxed">
{`{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is AEO?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Answer Engine Optimization..."
    }
  }]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* 5. Best Practices */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">05</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">AEO Best Practices</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PracticeCard 
            title="Direct Answers" 
            description="Structure content with clear H1/H2 tags and provide concise answers to common questions early in the page."
            icon={<Cpu className="w-5 h-5" />}
          />
          <PracticeCard 
            title="Structured Data" 
            description="Always implement Schema.org (Article, FAQ, Organization) to provide a machine-readable data layer."
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <PracticeCard 
            title="Authoritative Tone" 
            description="AI models favor content that sounds expert, objective, and unbiased. Avoid marketing fluff."
            icon={<AlertCircle className="w-5 h-5" />}
          />
          <PracticeCard 
            title="Mobile Speed" 
            description="AI crawlers prioritize fast-loading, technically sound sites. Performance is a ranking factor for AEO."
            icon={<Zap className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pt-16 border-t border-zinc-100">
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
          AEO Analyzers // The Answer Engine Era
        </p>
      </footer>
    </div>
  );
}

function ScoreLevel({ range, label, color, description }: { range: string, label: string, color: string, description: string }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-3xl p-8 space-y-4 hover:border-zinc-900 transition-all group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{range}</span>
        <div className={`${color} px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest`}>
          {label}
        </div>
      </div>
      <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-900 transition-colors">
        {description}
      </p>
    </div>
  );
}

function Step({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center text-xs font-black">
          {number}
        </div>
        <div className="h-px flex-1 bg-zinc-100" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-zinc-900">
          {icon}
          <h3 className="font-black text-lg uppercase tracking-tight">{title}</h3>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PracticeCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="flex gap-6 p-8 bg-zinc-50/50 border border-zinc-100 rounded-3xl hover:bg-white hover:border-zinc-900 transition-all group">
      <div className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:border-zinc-900 transition-all shrink-0">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="font-black text-zinc-900 uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
