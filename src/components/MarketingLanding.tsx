import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, Zap, BarChart3, AlertCircle, CheckCircle2, ArrowRight, Globe, Cpu, Swords, User as UserIcon, BookOpen, Code, ShoppingBag, Building2, HelpCircle, ShieldAlert, Target, ChevronDown, Share2, Linkedin, Copy, ExternalLink } from 'lucide-react';
import SEO from './SEO';
import { getFAQJsonLd, getGraphJsonLd } from '../lib/json-ld';

interface MarketingLandingProps {
  onGetStarted: () => void;
}

export default function MarketingLanding({ onGetStarted }: MarketingLandingProps) {
  const personas = [
    {
      icon: <Building2 className="w-6 h-6 text-indigo-500" />,
      name: "Sarah, Agency SEO Lead",
      role: "Digital Marketing Agency",
      goal: "Retain clients by proving her agency is at the forefront of the AI shift.",
      pain: "Clients are seeing a drop in organic traffic and are asking, 'Why aren't we showing up in ChatGPT or Gemini?'",
      solution: "Sarah uses the platform to provide clients with a 'Citation Probability' score and a technical roadmap."
    },
    {
      icon: <ShoppingBag className="w-6 h-6 text-emerald-500" />,
      name: "Marco, Shopify Store Owner",
      role: "E-commerce Business",
      goal: "To have his products recommended by AI shopping assistants.",
      pain: "AI agents cite major retailers like Amazon or Target, even though Marco's products have better reviews.",
      solution: "Marco uses the tool to audit his product pages and discovers missing 'Product' and 'Review' Schema."
    },
    {
      icon: <Code className="w-6 h-6 text-orange-500" />,
      name: "Alex, Full-Stack Developer",
      role: "Freelance Web Developer",
      goal: "To deliver 'future-proof' websites that rank well in the AI era.",
      pain: "He knows how to build fast apps, but doesn't know the specific Meta Tags or JSON-LD required for AEO.",
      solution: "Alex uses the tool as a 'QA step' before handover to ensure 'AI-Optimized Development'."
    }
  ];

  const faqs = [
    {
      q: "What is AEO and why is it the 'New SEO'?",
      a: "Answer Engine Optimization (AEO) is the process of making your site 'AI-Readable'. As users move from typing keywords into Google to asking questions to AI agents like ChatGPT, Gemini, and Perplexity, your site must be semantically structured to be cited as the primary source of truth."
    },
    {
      q: "What does AEO Analyzers actually do?",
      a: "Two things. First, it diagnoses your site — an AEO Score, a Citation Probability, and the exact fixes (paste-ready JSON-LD schema, content rewrites, a developer-ready report). Second, it proves the result with live Citation Sweeps: it asks the real AI engines — ChatGPT, Claude, Perplexity, and Gemini — your buyers' questions and shows whether they actually cite you, who they cite instead, and the exact answers they gave."
    },
    {
      q: "What is a Citation Sweep and what does it measure?",
      a: "A Citation Sweep runs your buyers' questions against the real answer engines, multiple times each, and measures three separate things — Retrievability (does AI find you when asked about your brand), Fidelity (does AI's answer about you match the facts), and Citation Win (does AI pick you for category questions like 'best [category] tools'). Every result is backed by a stored transcript you can read."
    },
    {
      q: "How do you catch facts AI gets wrong about my business?",
      a: "We build a 'truth record' from your own structured data and site, then compare each AI engine's answer against it. If an engine invents a fact — a wrong founder, a stale price, a feature you don't have — we flag it with the correct value and the fix. No other AEO tool measures whether AI is telling the truth about you."
    },
    {
      q: "How much does AEO Analyzers cost, and what are Citation Sweeps limited to?",
      a: "Start free — a full AEO analysis plus a single-engine Quick Check on Google/Gemini. Day Pass is $24 for 24 hours (includes 3 sweeps), Pro is $49/month (unlimited analysis + 8 sweeps/month), and Business is $199/month (20 sweeps/month). A full sweep runs across all four engines with stored transcripts."
    },
    {
      q: "How is this different from other AEO tools?",
      a: "Most tools hand you a score and stop — and some report a scary 'you're invisible to AI' that falls apart the moment you test it live. We report three separable, honest layers, each backed by the actual engine transcript. Our promise: run the query yourself and you'll get what our report says."
    },
    {
      q: "Does AEO Analyzers support e-commerce, Shopify, WordPress, or custom apps?",
      a: "Yes. AI shopping assistants rely on 'Product' and 'Review' Schema, and machine-readability is the same whether you run a CMS or a custom React/Next.js app. We audit your public HTML and metadata regardless of your stack, and sweeps work for any domain."
    }
  ];

  return (
    <div className="space-y-24 pb-24">
      <SEO
        title="Be the Answer AI Gives"
        description="AEO Analyzers scores how citable your site is by AI answer engines like Gemini, ChatGPT, and Perplexity — powered by Google Gemini frontier models — and gives you the exact fixes, in 90 seconds."
        ogType="website"
        author="Lindsay Hiebert"
        publishedDate="2026-03-22T00:00:00Z"
        jsonLd={[
          getGraphJsonLd(),
          getFAQJsonLd(faqs.map(f => ({ question: f.q, answer: f.a })))
        ]}
      />

      {/* Official Platform Banner */}
      <div className="bg-emerald-100 border-y border-emerald-200 py-3.5 px-6 text-center sticky top-0 z-50 backdrop-blur-md bg-emerald-100/90">
        <p className="text-xs sm:text-sm font-black text-emerald-900 uppercase tracking-[0.15em] flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Measurement honesty — every score backed by the real AI transcript. Run the query yourself.
        </p>
      </div>

      {/* Hero Section */}
      <section className="text-center max-w-5xl mx-auto px-6 pt-10 pb-24" aria-labelledby="hero-title">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block px-5 py-2 bg-zinc-900 text-white rounded-full text-xs sm:text-sm font-black mb-8 uppercase tracking-[0.2em]"
        >
          The Fixes — Not Just a Score. In 90 Seconds.
        </motion.div>
        <motion.h1 
          id="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-8xl font-bold tracking-tight mb-10 leading-tight"
        >
          Become the <br />
          <span className="text-zinc-400 italic font-serif">Source of Truth</span> <br />
          for AI.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-500 text-xl md:text-2xl max-w-2xl mx-auto mb-16 leading-relaxed font-medium"
        >
          Search is becoming answers — AI names <strong>one</strong> source, and if it isn't you, your customers never see you. Most AEO tools hand you a score and walk away. AEO Analyzers shows you exactly <em>why</em> AI overlooks you and gives you the fixes — then <strong>proves it worked</strong> with live Citation Sweeps across ChatGPT, Claude, Perplexity, and Gemini, showing who they actually cite. Diagnose in ~90 seconds; measure the outcome for real.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <button 
            onClick={onGetStarted}
            aria-label="Get your AEO score now"
            className="w-full sm:w-auto bg-zinc-900 text-white px-12 py-6 rounded-2xl font-black hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-900/20 flex items-center justify-center gap-3 text-xl uppercase tracking-tight"
          >
            Get My Free AEO Score
            <ArrowRight className="w-6 h-6" />
          </button>
          <a 
            href="#why-aeo"
            aria-label="Learn why AEO matters"
            className="w-full sm:w-auto px-12 py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 text-xl uppercase tracking-tight"
          >
            Learn Why It Matters
          </a>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-zinc-400 text-sm mt-6 max-w-2xl mx-auto"
        >
          Your AEO score and gaps are <strong>free</strong>. Unlock every fix — paste-ready schema, content rewrites, and the full Word report — with a <strong>$24 Day Pass</strong> (24 hours, no subscription) or a plan.
        </motion.p>
      </section>

      {/* The Attribution Gap Section */}
      <section id="why-aeo" className="max-w-6xl mx-auto px-6" aria-labelledby="gap-title">
        <div className="bg-zinc-900 text-white rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20 opacity-5">
            <ShieldAlert className="w-96 h-96" />
          </div>
          <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 id="gap-title" className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                The <span className="text-emerald-400">Attribution Gap</span> is costing you traffic.
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed mb-8">
                When AI agents like Gemini or ChatGPT answer a user's question using your content but <strong>fail to cite you</strong>, you lose the customer.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-zinc-800 p-3 rounded-xl h-fit">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">The Problem</h4>
                    <p className="text-zinc-500">AI uses your expertise but sends you zero traffic. Keyword-era tools can't see how answer engines choose what to cite — and score-only AEO tools just tell you you're losing, without telling you how to win.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-zinc-800 p-3 rounded-xl h-fit">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">The Solution</h4>
                    <p className="text-zinc-500">AEO Analyzers doesn't stop at a number. Your free audit pinpoints <em>why</em> AI overlooks you; a $24 Day Pass (or a plan) unlocks the cure — paste-ready JSON-LD (verified vs. guessed), content rewrites, a prioritized checklist, and a Word report your developer can ship today.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-zinc-500 ml-2 uppercase tracking-widest">AEO Analysis</span>
              </div>
              <div className="space-y-6">
                <div className="h-4 w-3/4 bg-white/10 rounded-full animate-pulse" />
                <div className="h-4 w-1/2 bg-white/10 rounded-full animate-pulse" />
                <div className="h-32 w-full bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center">
                  <span className="text-zinc-500 font-mono text-xs uppercase tracking-tighter">Analyzing Semantic Density...</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-24 bg-emerald-500/20 rounded-full border border-emerald-500/30" />
                  <div className="h-8 w-32 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Measurement Loop Section — the new "prove it" layer */}
      <section className="max-w-6xl mx-auto px-6 py-24" aria-labelledby="measure-title">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <BarChart3 className="w-3 h-3" /> New — Citation Sweeps
          </div>
          <h2 id="measure-title" className="text-4xl md:text-6xl font-black tracking-tight mb-6">Don't just optimize — <span className="text-zinc-400 italic font-serif">prove it.</span></h2>
          <p className="text-zinc-500 text-xl max-w-3xl mx-auto leading-relaxed">
            A score predicts. A <strong>Citation Sweep</strong> proves. We ask the real engines — ChatGPT, Claude, Perplexity, Gemini — your buyers' questions, multiple times each, and measure three separable layers. Every result is backed by the actual transcript.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6"><Search className="w-6 h-6" /></div>
            <h3 className="text-xl font-black mb-4">Retrievability</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">When someone asks AI about your brand by name, does it return a real answer? A health check that should be ~100%. A miss here is an indexing emergency.</p>
          </div>
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6"><ShieldCheck className="w-6 h-6" /></div>
            <h3 className="text-xl font-black mb-4">Fidelity</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Does AI's answer match the real facts about you? We catch fabricated founders, stale prices, and invented features — with the correct value and the fix. <em>No other tool measures this.</em></p>
          </div>
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6"><Swords className="w-6 h-6" /></div>
            <h3 className="text-xl font-black mb-4">Citation Win</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">For unbranded category questions ("best [category] tools"), does AI pick you — and if not, exactly who is <strong>cited instead</strong>? Your real competitive gap, in AI answers.</p>
          </div>
        </div>
        <p className="text-center text-zinc-400 text-sm mt-8 max-w-2xl mx-auto">Plus AI-crawler telemetry (Live / Search / Training bot hits) and drift monitoring — so you know you're being read, and stay that way. <strong className="text-zinc-600">Free visitors</strong> get a single-engine Quick Check; <strong className="text-zinc-600">paid plans</strong> unlock the full multi-engine sweep with stored transcripts.</p>
      </section>

      {/* Trust & Authority Section */}
      <section className="max-w-6xl mx-auto px-6 py-24" aria-labelledby="trust-title">
        <div className="text-center mb-16">
          <h2 id="trust-title" className="text-4xl md:text-6xl font-black tracking-tight mb-6">Why <span className="text-zinc-400">Analyzers</span>, Plural?</h2>
          <p className="text-zinc-500 text-xl max-w-3xl mx-auto leading-relaxed">
            Legacy tools check keywords. We analyze the universal signals every major answer engine — Gemini, ChatGPT, Perplexity — uses to decide what to cite. That's why it's Analyzer<strong>s</strong>.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black mb-4">The Cure, Not Just a Score</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Other tools hand you a number and stop. We hand you the fixes — verified JSON-LD, content rewrites, and a deploy-ready Word report — so you actually <em>move</em> your AI visibility, not just measure it.</p>
          </div>
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white mb-6">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black mb-4">Built for Every Answer Engine</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Powered by Google Gemini, we analyze the universal signals every major answer engine — Gemini, ChatGPT, Perplexity — uses to decide what to cite. ~90 seconds, not hundreds of manual hours.</p>
          </div>
          <div className="p-10 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black mb-4">Visibility That Pays</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">More AI citations means more qualified traffic and easier discovery of your pages, products, and storefronts — growth you can trace to revenue, not vanity metrics.</p>
          </div>
        </div>
      </section>

      {/* Personas Section */}
      <section className="max-w-6xl mx-auto px-6" aria-labelledby="personas-title">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Users className="w-3 h-3" />
            Target Personas
          </div>
          <h2 id="personas-title" className="text-4xl md:text-6xl font-bold tracking-tight">Who is AEO Analyzers for?</h2>
          <p className="text-zinc-500 text-xl max-w-2xl mx-auto">Whether you're a brand, a business, or a developer, we have you covered.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {personas.map((p, i) => (
            <motion.article 
              key={i}
              whileHover={{ y: -12 }}
              className="group bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm hover:shadow-2xl hover:border-zinc-900 transition-all duration-500 flex flex-col"
            >
              <div className="bg-zinc-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform duration-500">
                {p.icon}
              </div>
              <h3 className="text-2xl font-bold mb-1 text-zinc-900">{p.name}</h3>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-8">{p.role}</p>
              
              <div className="space-y-8 text-sm flex-1">
                <div className="space-y-2">
                  <h4 className="font-black text-zinc-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    The Pain Point
                  </h4>
                  <p className="text-zinc-500 leading-relaxed italic border-l-2 border-red-100 pl-4 py-1">"{p.pain}"</p>
                </div>
                <div className="pt-8 border-t border-zinc-100">
                  <h4 className="font-black text-emerald-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    AEO Solution
                  </h4>
                  <p className="text-zinc-900 font-bold leading-relaxed">{p.solution}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Developer's Corner */}
      <section className="max-w-6xl mx-auto px-6" aria-labelledby="dev-title">
        <div className="bg-indigo-50 border border-indigo-100 rounded-[3rem] p-12 md:p-20 flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-600/20">
              <Code className="w-8 h-8 text-white" />
            </div>
            <h2 id="dev-title" className="text-4xl font-bold mb-6 text-indigo-900">Developer's Corner</h2>
            <p className="text-xl text-indigo-700/80 leading-relaxed mb-8">
              Beautiful code isn't enough anymore. If your app isn't semantically structured, it's invisible to AI.
            </p>
            <ul className="space-y-4">
              {[
                "Missing JSON-LD Schema structures",
                "Non-semantic HTML tags (div-soup)",
                "Lack of clear Metadata for AI extractors",
                "Poor content-to-code ratio"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-indigo-900 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-zinc-900 rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <pre className="text-[10px] sm:text-xs text-indigo-300 font-mono overflow-x-auto leading-relaxed">
{`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AEO Analyzers",
  "operatingSystem": "Web",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "49.00",
    "priceCurrency": "USD"
  }
}`}
            </pre>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">AEO Optimized</span>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6" aria-labelledby="faq-title">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <HelpCircle className="w-3 h-3" />
            Knowledge Base
          </div>
          <h2 id="faq-title" className="text-4xl md:text-6xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-zinc-500 text-xl">Everything you need to know about the AEO era.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <LandingAccordionItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* Share Section */}
      <ShareSection />

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-zinc-900 text-white rounded-[3rem] p-16 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to close the gap?</h2>
            <p className="text-xl text-zinc-400 mb-12">Join the brands, businesses, and developers securing their AI future.</p>
            <button 
              onClick={onGetStarted}
              aria-label="Start your free AEO analysis"
              className="bg-white text-zinc-900 px-12 py-5 rounded-2xl font-bold hover:bg-zinc-100 transition-all text-xl shadow-xl shadow-white/10"
            >
              Start Free Analysis
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LandingAccordionItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className={`group border rounded-[1.5rem] transition-all duration-500 ${isOpen ? 'bg-white border-zinc-900 shadow-2xl shadow-zinc-900/5' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className={`font-bold text-base transition-colors ${isOpen ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>{question}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-zinc-900 text-white rotate-180' : 'bg-zinc-50 text-zinc-300 group-hover:bg-zinc-100 group-hover:text-zinc-900'}`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 text-zinc-500 text-sm leading-relaxed border-t border-zinc-50 pt-5">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareSection() {
  const [copied, setCopied] = React.useState(false);
  const shareUrl = "https://aeoanalyzers.com";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-24 border-t border-zinc-100">
      <div className="bg-zinc-900 rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest mb-8">
            <Share2 className="w-3 h-3" />
            Spread the Word
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Help Others Secure Their <br />
            <span className="text-emerald-400">AI Citations</span>
          </h2>
          
          <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            AEO is the next frontier of digital marketing. Share this platform with your network and help them become the cited source of truth for AI agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={shareOnLinkedIn}
              className="w-full sm:w-auto px-8 py-4 bg-[#0077b5] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-blue-900/20"
            >
              <Linkedin className="w-5 h-5" />
              Share on LinkedIn
            </button>
            
            <button 
              onClick={handleCopy}
              className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Link Copied!' : 'Copy Site Link'}
            </button>
          </div>

          <div className="mt-12 pt-12 border-t border-white/10 flex flex-col items-center gap-4">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Created by</p>
            <a 
              href="https://www.linkedin.com/in/lindsayhiebert/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl transition-all border border-white/5"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform">
                LH
              </div>
              <div className="text-left">
                <div className="text-white font-bold text-sm">Lindsay Hiebert</div>
                <div className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  Connect on LinkedIn
                  <ExternalLink className="w-2 h-2" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
