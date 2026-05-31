import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, Target, AlertCircle, Zap, ChevronDown, ChevronUp, Users, HelpCircle, ShieldCheck, ShoppingCart, Code, Building2 } from 'lucide-react';

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
    benefit: "Sarah uses the platform to provide clients with a 'Citation Probability' score and a technical roadmap. It transforms a vague 'AI is changing things' conversation into a concrete strategy.",
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
    question: "How does the 'Citation Probability' score work?",
    answer: "Our analysis uses a frontier LLM to reason through your website's semantic structure. We analyze your JSON-LD Schema, content density, and technical meta-tags to determine the mathematical likelihood of an AI agent choosing your site as its primary reference."
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

const adminFaqs: FAQItem[] = [
  {
    question: "How do I manage users who have lost their passwords?",
    answer: "Go to the Admin Dashboard (accessible via the sidebar if you are logged in as an admin). You can search for the user and click 'Reset Password' to send them an automated email."
  },
  {
    question: "How can I see how many people are using the app right now?",
    answer: "The Admin Dashboard provides real-time metrics on total users and subscription status. For detailed real-time traffic, click the 'Open GA4' link in the dashboard."
  },
  {
    question: "What should I do if the AI analysis seems slow?",
    answer: "The analysis speed depends on the Gemini API. If it's consistently slow, check the 'Admin Guide' for instructions on monitoring API quotas and latency in the Google Cloud Console."
  }
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
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">01</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">User Personas</h2>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((persona) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group bg-zinc-50/50 border border-zinc-100 rounded-[2.5rem] p-8 hover:bg-white hover:border-zinc-900 hover:shadow-2xl transition-all duration-500"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className={`${persona.color} w-14 h-14 rounded-2xl text-white shadow-lg flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform`}>
                  {persona.icon}
                </div>
                <div>
                  <h3 className="font-black text-xl text-zinc-900 leading-tight">{persona.name}</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{persona.role}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">The Challenge</div>
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
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">02</span>
          <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.3em] whitespace-nowrap">Frequently Asked Questions</h2>
          <div className="h-px flex-1 bg-zinc-100" />
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

          {/* Admin FAQ */}
          <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 px-4">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              For Administrators
            </h3>
            <div className="space-y-3">
              {adminFaqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx + 100}
                  idx={idx + 100}
                  isOpen={openFaq === idx + 100}
                  onToggle={() => setOpenFaq(openFaq === idx + 100 ? null : idx + 100)}
                  {...faq}
                />
              ))}
            </div>
          </div>
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
    <div className={`group border rounded-[1.5rem] transition-all duration-500 ${isOpen ? 'bg-white border-zinc-900 shadow-2xl shadow-zinc-900/5' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
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
