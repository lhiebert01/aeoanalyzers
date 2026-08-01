import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, Target, AlertCircle, Zap, ChevronDown, ChevronUp, Users, HelpCircle, ShieldCheck, ShoppingCart, Code, Building2 } from 'lucide-react';
import { SCORE_VS_SWEEP } from '../content/scoreVsSweep';

interface Persona {
  id: number;
  name: string;
  role: string;
  goal: string;
  painPoint: string;
  benefit: string;
  icon: React.ReactNode;
  color: string;
}

const personas: Persona[] = [
  {
    id: 1,
    name: "Sarah",
    role: "Agency SEO Lead",
    goal: "Retain clients by proving her agency is at the forefront of the AI shift.",
    painPoint: "Clients are seeing a drop in organic traffic and are asking, 'Why aren't we showing up in ChatGPT or Gemini?'",
    benefit: "Sarah uses the platform to provide clients with a 'Citation Readiness' score and a technical roadmap. It transforms a vague 'AI is changing things' conversation into a concrete strategy.",
    icon: <Users className="w-6 h-6" />,
    color: "bg-blue-500"
  },
  {
    id: 2,
    name: "David",
    role: "Local Expert (Small Business)",
    goal: "To be the 'recommended' answer when local users ask AI agents for help.",
    painPoint: "AI agents are citing national chains or generic directories instead of his local business, even though he is the true expert in his area.",
    benefit: "David uses the tool to identify missing local Schema.org and semantic clarity issues. It helps him understand that his site is 'too complex' for an AI agent to quickly extract his service area.",
    icon: <Building2 className="w-6 h-6" />,
    color: "bg-emerald-500"
  },
  {
    id: 3,
    name: "Elena",
    role: "Gov Comms Director",
    goal: "Ensure official, accurate information is the primary source for AI-generated answers.",
    painPoint: "AI agents are summarizing third-party blogs or outdated news articles instead of the official, current guidelines.",
    benefit: "Elena uses the tool to audit the official site for 'AI Readability.' It provides the Schema.org fixes to ensure that AI agents recognize the official source as the 'Source of Truth'.",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "bg-amber-500"
  },
  {
    id: 4,
    name: "Marco",
    role: "Shopify Store Owner",
    goal: "To have his products recommended by AI shopping assistants.",
    painPoint: "When users ask 'What are the best bamboo sheets?', AI agents cite major retailers like Amazon or Target, even though Marco's products have better reviews.",
    benefit: "Marco uses the tool to audit his product pages. He discovers his Shopify theme is missing critical 'Product' and 'Review' Schema that AI agents use to verify quality.",
    icon: <ShoppingCart className="w-6 h-6" />,
    color: "bg-rose-500"
  },
  {
    id: 5,
    name: "Alex",
    role: "Full-Stack Developer",
    goal: "To deliver 'future-proof' websites that rank well in the AI era.",
    painPoint: "He knows how to build fast, beautiful apps, but he doesn't know the specific Meta Tags or JSON-LD structures required for AEO.",
    benefit: "Alex uses the tool as a 'QA step' before handover. It tells him exactly what meta-information is missing, allowing him to charge a premium for 'AI-Optimized Development.'",
    icon: <Code className="w-6 h-6" />,
    color: "bg-indigo-500"
  }
];

interface FAQItem {
  question: string;
  answer: string;
}

const userFaqs: FAQItem[] = [
  {
    question: "What is AEO and why does it matter now?",
    answer: "Answer Engine Optimization (AEO) is the evolution of SEO for the AI era. It's the process of optimizing your site so AI agents like Gemini, ChatGPT, and Perplexity can easily find and cite your content. With AI-generated answers replacing traditional search results, being the 'cited source' is the only way to maintain traffic."
  },
  {
    question: "AEO, GEO, LLMO, 'AI SEO' — what's the difference?",
    answer: "They're overlapping names for the same goal: getting your business cited when AI engines answer questions. AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) are the two most common — GEO comes from a 2023 research paper, AEO from the SEO world — and you'll also see LLMO, AIO, and 'AI SEO'. Despite the different branding, what you actually optimize is identical: structured data (JSON-LD), citable facts, clear entity identity, crawlability, and authority signals engines trust. There is no fundamental difference between GEO and AEO in practice — being 'the generative answer an LLM gives' is exactly what AEO targets. We use AEO as the umbrella term, and everything this tool measures and fixes applies equally whether you call it GEO, LLMO, or AEO."
  },
  {
    question: "How does the 'Citation Readiness' score work?",
    answer: "Our analysis uses a frontier LLM to reason through your website's semantic structure — your JSON-LD Schema, content density, and technical meta-tags — and returns a technical-readiness estimate of how citable your page is. It is a readiness score, not a measured or guaranteed real-world citation rate: it tells you how well-prepared the page is to be cited, not the odds an engine will cite it. To measure what engines actually do, run a live Citation Sweep, which queries real answer engines and reports whether your site is cited."
  },
  {
    question: SCORE_VS_SWEEP.faq.q,
    answer: SCORE_VS_SWEEP.faq.a
  },
  {
    question: "I'm a developer. What are the technical requirements for AEO?",
    answer: "AEO requires more than just fast code. It demands high-quality JSON-LD Schema (Product, FAQ, Article, etc.), semantic HTML5 tags, and a high content-to-code ratio. Our tool provides a specific technical roadmap for developers to implement these fixes."
  },
  {
    question: "Does this work for Shopify, WordPress, or custom apps?",
    answer: "Yes. Whether you use a CMS or a custom React/Next.js app, the principles of machine readability are the same. We audit your public-facing HTML and metadata regardless of the underlying tech stack."
  },
  {
    question: "Is this just for Google Gemini?",
    answer: "No. While we use Gemini for our heavy-duty reasoning, the optimizations we recommend (Schema.org, Semantic Clarity) are universal standards used by all major AI agents, including OpenAI's SearchGPT and Perplexity."
  },
  {
    question: "How often should I run an analysis?",
    answer: "We recommend running an analysis after every content update or structural change. AI models are updated frequently, and your 'AI Readability' can shift as your competitors optimize their own sites."
  }
];

const measurementFaqs: FAQItem[] = [
  {
    question: "What's the difference between the AEO Score and a Citation Sweep?",
    answer: "The AEO Score is a fast diagnostic — it analyzes your page and predicts how citable you are, then hands you the fixes. A Citation Sweep is live proof: it actually asks ChatGPT, Claude, Perplexity, and Gemini your buyers' questions and shows whether they cite you, who they cite instead, and the exact answers they gave — every result backed by a stored transcript you can read."
  },
  {
    question: "What does a Citation Sweep actually measure?",
    answer: "Three separate things — because collapsing them into one number hides the truth. (1) Retrievability: can AI find you when someone asks about your brand by name (should be ~100%). (2) Fidelity: does the AI's answer match the real facts about you. (3) Citation Win: when someone asks an unbranded category question like 'best [category] tools,' does the AI pick you. Each layer has its own fix path."
  },
  {
    question: "What is Answer Fidelity — how do you catch facts AI gets wrong about me?",
    answer: "We build a 'truth record' from your own structured data and site, then compare each engine's answer against it. If an engine invents a fact — a wrong founder, a stale price, a feature you don't have — we flag it with the correct value and the source to fix it. No other AEO tool measures whether AI is telling the truth about you."
  },
  {
    question: "Who gets 'cited instead' of me?",
    answer: "On category queries, a sweep records exactly which competitors the AI names in your place, and how often — so you see your real competitive gap in AI answers, not just a score in a vacuum."
  },
  {
    question: "Can you show me when AI bots crawl my site?",
    answer: "Yes. AI crawlers don't run JavaScript, so normal analytics never see them. Our telemetry captures them server-side and sorts them into three tiers: Live (a person just asked an AI and it fetched your page to answer them), Search (indexing for answer engines), and Training (knowledge ingestion) — so you know whether you're actually being read, and for what."
  },
  {
    question: "How many Citation Sweeps do I get, and what do they cost me?",
    answer: "Sweeps are included with paid plans: Day Pass includes 3, Pro includes 8 per month, and Business includes 20 per month. Anyone — even signed-out visitors — can run a free single-engine Quick Check on Google/Gemini to preview their citability before upgrading."
  },
  {
    question: "How is this different from other AEO tools?",
    answer: "Most tools hand you a score and stop — and some report a scary 'you're invisible to AI' that falls apart the moment you test it live. We report three separable layers, each backed by the actual engine transcript. Our promise: run the query yourself and you'll get what our report says."
  }
];

const glossary: { term: string; def: string }[] = [
  { term: "AEO (Answer Engine Optimization)", def: "Optimizing your site so AI answer engines — ChatGPT, Gemini, Perplexity, Claude — find, trust, and cite it as the source." },
  { term: "Citation Sweep", def: "A live test that asks the real AI engines your buyers' questions, multiple times each, and measures whether they cite you." },
  { term: "Retrievability", def: "Whether AI returns a real answer when someone asks about your brand by name. A health check — should be ~100%." },
  { term: "Fidelity", def: "Whether the AI's answer about you is factually correct, checked against your canonical truth record." },
  { term: "Citation Win", def: "Whether AI picks you for an unbranded category question ('best [category] tools'). The competitive metric." },
  { term: "Cited Instead", def: "The competitors an AI names in your place on a category query." },
  { term: "Truth Record", def: "The canonical facts about you (from your schema and llms.txt) that AI answers are checked against." },
  { term: "Quick Check", def: "The free, single-engine (Google/Gemini) citability preview available to everyone." },
  { term: "AI Crawler Tiers", def: "Live (a human just asked, the engine fetched your page now), Search (indexing), Training (knowledge ingestion) — each means something different for your visibility." },
];

export default function PersonasAndFAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-24 pb-24">
      {/* Header */}
      <section className="text-center space-y-6 pt-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <HelpCircle className="w-3 h-3" />
          Knowledge Base
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase">
          User Personas <span className="text-zinc-300 italic font-serif lowercase">&</span> FAQ
        </h1>
        <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
          Understanding the human impact of Answer Engine Optimization across industries.
        </p>
      </section>

      {/* Personas Section */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">01</span>
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">User Personas</h2>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((persona) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group bg-white border border-zinc-300 shadow-sm rounded-[2.5rem] p-8 hover:shadow-lg hover:border-zinc-400 transition-all duration-500"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className={`${persona.color} w-14 h-14 rounded-2xl text-white shadow-lg flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform`}>
                  {persona.icon}
                </div>
                <div>
                  <h3 className="font-black text-xl text-zinc-900 leading-tight">{persona.name}</h3>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{persona.role}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">The Challenge</div>
                  <p className="text-sm text-zinc-600 leading-relaxed italic border-l-2 border-zinc-200 pl-4">"{persona.painPoint}"</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">The AEO Solution</div>
                  <p className="text-sm text-zinc-900 font-bold leading-relaxed">{persona.benefit}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">02</span>
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">Frequently Asked Questions</h2>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="max-w-3xl mx-auto space-y-16">
          {/* User FAQ */}
          <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 px-4">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
              For Users & Clients
            </h3>
            <div className="space-y-3">
              {userFaqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx}
                  idx={idx}
                  isOpen={openFaq === idx}
                  onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
                  {...faq}
                />
              ))}
            </div>
          </div>

          {/* Measurement & Monitoring FAQ */}
          <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 px-4">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Measurement &amp; Monitoring (Citation Sweeps)
            </h3>
            <div className="space-y-3">
              {measurementFaqs.map((faq, idx) => (
                <AccordionItem
                  key={idx + 200}
                  idx={idx + 200}
                  isOpen={openFaq === idx + 200}
                  onToggle={() => setOpenFaq(openFaq === idx + 200 ? null : idx + 200)}
                  {...faq}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Glossary Section */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">03</span>
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">Glossary</h2>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {glossary.map((g) => (
            <div key={g.term} className="bg-white border border-zinc-300 shadow-sm rounded-2xl p-5">
              <div className="font-black text-sm text-zinc-900">{g.term}</div>
              <p className="text-sm text-zinc-600 leading-relaxed mt-1.5">{g.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Quote */}
      <footer className="text-center pt-16 border-t border-zinc-100">
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
          AEO Analyzers // The Answer Engine Era
        </p>
      </footer>
    </div>
  );
}

function AccordionItem({ question, answer, isOpen, onToggle }: FAQItem & { isOpen: boolean, onToggle: () => void, idx: number }) {
  return (
    <div className={`group border rounded-[1.5rem] transition-all duration-500 ${isOpen ? 'bg-white border-zinc-900 shadow-2xl shadow-zinc-900/5' : 'bg-white border-zinc-300 shadow-sm hover:border-zinc-400'}`}>
      <button 
        onClick={onToggle}
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
