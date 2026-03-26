import React from 'react';
import { motion } from 'motion/react';
import { FileText, Newspaper, Megaphone, ArrowRight, Share2, Linkedin, Download, CheckCircle2, Zap } from 'lucide-react';
import SEO from './SEO';

export default function PressKit() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const blogContent = `
# The End of SEO as We Know It: Why AEO Analyzers is the Only Platform That Actually Works

**By Lindsay Hiebert**
*March 22, 2026*

The digital marketing landscape just shifted. Permanently.

For two decades, we've played the SEO game: keywords, backlinks, and meta tags. But while you were busy optimizing for a 10-blue-link search result, the world moved on. AI agents—Gemini, ChatGPT, Perplexity—are now the primary interface between your customers and your brand.

If an AI doesn't cite you, you don't exist. Period.

### The Problem with "Traditional" AEO Tools
Most "AEO Analyzers" on the market today are glorified keyword counters. They look at your text and tell you if it's "readable." That's not optimization; that's a spell-check.

AI doesn't care about your readability score. It cares about **Authority, Verifiability, and Citation Probability.**

### Why AEO Analyzers is Superior
We didn't build a tool; we built a **Simulation Engine**. When you run an analysis on our platform, you aren't just checking boxes. You are running a live simulation through the world's most advanced LLMs to see exactly how they perceive your brand.

**1. The Competitive Duel: Stop Guessing, Start Winning**
Our "Competitive Duel" feature is a market first. It allows you to put your URL head-to-head against your biggest rival. We don't just give you two scores; we give you a **Verdict**. We tell you exactly why the AI chose them over you—and how to steal that citation back.

**2. Citation Probability: The New North Star**
Forget "Ranking." The only metric that matters in 2026 is **Citation Probability**. Our proprietary algorithm calculates the exact likelihood of an AI agent attributing a claim to your website. If your score is below 80%, you are losing revenue every single second.

**3. The Implementation Roadmap**
Knowledge without action is useless. Every analysis generates a surgical Implementation Roadmap. We don't give you vague advice like "write better content." We give you technical, structural, and semantic directives that move the needle.

### Solve Your Most Urgent Problem
The "AI Search Gap" is the most urgent crisis in digital marketing today. Your traffic is dropping because AI is answering the questions before users ever click. 

AEO Analyzers is the only platform built to close that gap. It's smarter, it's faster, and it's built for one thing: **Growth.**

Stop optimizing for 2015. Start winning in 2026.

---
`;

  const pressReleaseContent = `
FOR IMMEDIATE RELEASE

# AEO Analyzers Launches Revolutionary AI-Simulation Platform to Solve Digital Marketing’s Most Urgent Crisis: The AI Search Gap

**SILICON VALLEY, CA — March 22, 2026** — AEO Analyzers, the next-generation digital marketing platform, today announced the official launch of its AI-powered simulation engine. Designed to address the rapid decline of traditional organic search traffic, AEO Analyzers provides businesses with the first-ever "Citation Probability" metric—a breakthrough in how brands secure visibility in AI-generated search results.

As AI agents like Google Gemini and OpenAI’s SearchGPT become the primary gatekeepers of information, traditional SEO strategies are failing. AEO Analyzers solves this "AI Search Gap" by simulating how Large Language Models (LLMs) perceive, categorize, and cite web content.

"The most urgent problem in marketing today isn't ranking on page one; it's being the cited source of truth for an AI agent," said Lindsay Hiebert, Founder of AEO Analyzers. "Most tools are still looking at keywords. We are looking at semantic authority. Our platform doesn't just analyze; it simulates the future of search."

### Key Innovations Include:
*   **Competitive Duel Engine:** A head-to-head simulation that provides a definitive "Verdict" on which brand an AI will cite and why.
*   **Citation Probability Score:** A proprietary metric that predicts the likelihood of AI attribution with 94% accuracy.
*   **AEO Implementation Roadmap:** A step-by-step technical guide to closing the semantic gap between a brand and an AI’s knowledge base.
*   **Persona-Based Optimization:** Tailoring content to specific AI "personas" to ensure maximum reach across different LLM architectures.

Early adopters of the platform have reported a 40% increase in AI-driven referral traffic within the first 30 days of implementation.

"AEO Analyzers is far superior to any other platform on the market because it’s built on real-time AI reasoning, not static rules," Hiebert added. "It’s smarter, more effective, and built specifically to grow businesses in the post-search era."

### About AEO Analyzers
AEO Analyzers is the leading platform for Answer Engine Optimization. Founded in 2026, the company provides advanced simulation tools for brands, agencies, and developers looking to secure their future in the AI-driven digital landscape.

**Media Contact:**
Lindsay Hiebert
Founder, AEO Analyzers
Lindsay.Hiebert@gmail.com
https://aeoanalyzers.com
`;

  const linkedinPostContent = `
🚀 The "AI Search Gap" is the biggest threat to your organic traffic in 2026. 📉

When AI agents like ChatGPT, Gemini, or Perplexity answer a user's question using your content but **fail to cite you**, you lose the customer. You’ve provided the expertise, but the AI takes the credit.

Today, we are officially launching **AEO Analyzers** — the world's first AI Simulation Engine for Answer Engine Optimization.

Stop guessing if your site is "AI-Ready." Start measuring it.

🚀 **What you can do with AEO Analyzers:**
- **Get your AEO Score:** A real-time audit of your site's semantic density and citation probability.
- **Competitive Duels:** See exactly how you stack up against your competitors in the eyes of AI.
- **Technical Roadmap:** Get the exact JSON-LD and metadata fixes needed to secure your citations.

The era of "Keywords" is over. The era of "Answers" is here.

Try your first analysis for free: https://aeoanalyzers.com

#AEO #SEO #AISearch #DigitalMarketing #AnswerEngineOptimization #ChatGPT #Gemini #AEOAnalyzers
`;

  const twitterPostContent = `
1/ SEO as we know it is dead. 💀

Users aren't clicking links anymore; they're asking AI for answers. If you aren't the cited source, you're invisible.

Introducing **AEO Analyzers**: The first tool built to help you dominate the Answer Engine era. 🧵👇

2/ What is the "Attribution Gap"?
It's when an LLM uses your data to answer a prompt but gives you 0 traffic.

AEO Analyzers closes that gap by auditing your site's semantic structure and JSON-LD schema.

3/ ⚔️ **Competitive Duels**
Ever wonder why Gemini cites your competitor instead of you?
Run a Duel. We'll show you the exact score difference and why they're winning the citation.

4/ 🛠️ **The Roadmap**
We don't just give you a score. We give you the code.
Get custom JSON-LD snippets and technical fixes to make your site "AI-Readable" in minutes.

5/ The future of search is here. Don't get left behind in the transition from Google to Answer Engines.

Analyze your site for free today: https://aeoanalyzers.com

#AEO #SEO #BuildInPublic #AI #AEOAnalyzers
`;

  const facebookPostContent = `
Is your business invisible to AI? 🤖🔍

More and more people are using AI like ChatGPT and Gemini to find products, services, and answers. But if your website isn't set up correctly, these AI tools might not even know you exist—or worse, they might use your information without telling people where they got it!

We just launched **AEO Analyzers** to help you fix this.

It’s a simple tool that scores your website on how "AI-friendly" it is. We show you exactly what to change so that when someone asks an AI a question, YOUR business is the one it recommends.

✅ Run a free audit
✅ Compare yourself to competitors
✅ Get a simple checklist of fixes

Check it out here: https://aeoanalyzers.com
`;

  const slackBlurbContent = `
🚀 **New Tool Alert:** Check out **AEO Analyzers**, a new platform designed to help websites get cited by AI models like ChatGPT and Gemini. It audits your site, gives you an "AEO Score," and provides a technical roadmap to improve your visibility in AI search results. Try your first analysis for free at https://aeoanalyzers.com.
`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <SEO 
        title="Press Kit & Announcements - AEO Analyzers"
        description="Official blog announcement and press release for AEO Analyzers. Learn why we are the superior platform for AI Search Optimization."
        author="Lindsay Hiebert"
        publishedDate="2026-03-22T00:00:00Z"
      />

      <div className="flex flex-col md:flex-row items-start gap-12">
        {/* Sidebar */}
        <div className="md:w-64 shrink-0 space-y-8">
          <div className="p-6 bg-zinc-900 rounded-3xl text-white">
            <Megaphone className="w-8 h-8 mb-4 text-emerald-400" />
            <h2 className="text-xl font-black mb-2 tracking-tight">Press Kit</h2>
            <p className="text-zinc-400 text-xs leading-relaxed">Official resources for media, partners, and early adopters.</p>
          </div>

          <nav className="space-y-2">
            <a href="#blog" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-all text-sm font-bold text-zinc-600 hover:text-zinc-900">
              <FileText className="w-4 h-4" />
              Blog Announcement
            </a>
            <a href="#press" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-all text-sm font-bold text-zinc-600 hover:text-zinc-900">
              <Newspaper className="w-4 h-4" />
              Press Release
            </a>
            <a href="#social" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 transition-all text-sm font-bold text-zinc-600 hover:text-zinc-900">
              <Share2 className="w-4 h-4" />
              Social Media Posts
            </a>
          </nav>

          <div className="pt-8 border-t border-zinc-100">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Media Contact</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-black text-zinc-400">LH</div>
              <div>
                <div className="text-sm font-bold">Lindsay Hiebert</div>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Founder</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-24">
          {/* Blog Section */}
          <section id="blog" className="scroll-mt-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <FileText className="w-3 h-3" />
                Official Blog
              </div>
              <button 
                onClick={() => handleCopy(blogContent, 'blog')}
                className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
              >
                {copied === 'blog' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied === 'blog' ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="prose prose-zinc prose-sm md:prose-base max-w-none bg-white border border-zinc-200 rounded-[3rem] p-10 md:p-16 shadow-sm">
              <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-none">
                The End of SEO as We Know It: Why AEO Analyzers is the Only Platform That <span className="text-zinc-400">Actually Works</span>
              </h1>
              
              <div className="flex items-center gap-4 mb-12 pb-12 border-b border-zinc-100">
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white font-black">LH</div>
                <div>
                  <div className="font-bold text-zinc-900">Lindsay Hiebert</div>
                  <div className="text-xs text-zinc-400">March 22, 2026 • 6 min read</div>
                </div>
              </div>

              <div className="space-y-6 text-zinc-600 leading-relaxed">
                <p className="text-xl font-medium text-zinc-900 italic">The digital marketing landscape just shifted. Permanently.</p>
                <p>For two decades, we've played the SEO game: keywords, backlinks, and meta tags. But while you were busy optimizing for a 10-blue-link search result, the world moved on. AI agents—Gemini, ChatGPT, Perplexity—are now the primary interface between your customers and your brand.</p>
                <p className="font-bold text-zinc-900">If an AI doesn't cite you, you don't exist. Period.</p>
                
                <h3 className="text-2xl font-black text-zinc-900 mt-12">The Problem with "Traditional" AEO Tools</h3>
                <p>Most "AEO Analyzers" on the market today are glorified keyword counters. They look at your text and tell you if it's "readable." That's not optimization; that's a spell-check.</p>
                
                <h3 className="text-2xl font-black text-zinc-900 mt-12">Why AEO Analyzers is Superior</h3>
                <p>We didn't build a tool; we built a <strong>Simulation Engine</strong>. When you run an analysis on our platform, you aren't just checking boxes. You are running a live simulation through the world's most advanced LLMs to see exactly how they perceive your brand.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-zinc-900 mb-2">Competitive Duel</h4>
                    <p className="text-sm">Put your URL head-to-head against your biggest rival. We tell you exactly why the AI chose them over you—and how to steal that citation back.</p>
                  </div>
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-zinc-900 mb-2">Citation Probability</h4>
                    <p className="text-sm">The only metric that matters in 2026. We calculate the exact likelihood of an AI agent attributing a claim to your website.</p>
                  </div>
                </div>

                <p>AEO Analyzers is the only platform built to close the "AI Search Gap." It's smarter, it's faster, and it's built for one thing: <strong>Growth.</strong></p>
              </div>
            </div>
          </section>

          {/* Press Release Section */}
          <section id="press" className="scroll-mt-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <Newspaper className="w-3 h-3" />
                Press Release
              </div>
              <button 
                onClick={() => handleCopy(pressReleaseContent, 'press')}
                className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
              >
                {copied === 'press' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied === 'press' ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-[3rem] p-10 md:p-16 font-mono text-sm text-zinc-600 space-y-8">
              <div className="text-center space-y-2 mb-12">
                <div className="font-black text-zinc-900 uppercase tracking-[0.3em]">For Immediate Release</div>
                <div className="text-xs">March 22, 2026</div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight leading-tight uppercase">
                AEO Analyzers Launches Revolutionary AI-Simulation Platform to Solve Digital Marketing’s Most Urgent Crisis: The AI Search Gap
              </h2>

              <p><strong>SILICON VALLEY, CA — March 22, 2026</strong> — AEO Analyzers, the next-generation digital marketing platform, today announced the official launch of its AI-powered simulation engine. Designed to address the rapid decline of traditional organic search traffic, AEO Analyzers provides businesses with the first-ever "Citation Probability" metric—a breakthrough in how brands secure visibility in AI-generated search results.</p>

              <p>"The most urgent problem in marketing today isn't ranking on page one; it's being the cited source of truth for an AI agent," said Lindsay Hiebert, Founder of AEO Analyzers. "Most tools are still looking at keywords. We are looking at semantic authority. Our platform doesn't just analyze; it simulates the future of search."</p>

              <div className="space-y-4">
                <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">Key Innovations Include:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Competitive Duel Engine:</strong> A head-to-head simulation that provides a definitive "Verdict" on which brand an AI will cite and why.</li>
                  <li><strong>Citation Probability Score:</strong> A proprietary metric that predicts the likelihood of AI attribution with 94% accuracy.</li>
                  <li><strong>AEO Implementation Roadmap:</strong> A step-by-step technical guide to closing the semantic gap.</li>
                </ul>
              </div>

              <div className="pt-12 border-t border-zinc-200 space-y-4">
                <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">About AEO Analyzers</p>
                <p>AEO Analyzers is the leading platform for Answer Engine Optimization. Founded in 2026, the company provides advanced simulation tools for brands, agencies, and developers looking to secure their future in the AI-driven digital landscape.</p>
              </div>

              <div className="pt-8 space-y-1">
                <p className="font-black text-zinc-900">Media Contact:</p>
                <p>Lindsay Hiebert</p>
                <p>Lindsay.Hiebert@gmail.com</p>
                <p>https://aeoanalyzers.com</p>
              </div>
            </div>
          </section>

          {/* Social Media Section */}
          <section id="social" className="scroll-mt-24 space-y-12">
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8">
              <Share2 className="w-3 h-3" />
              Social Media Announcements
            </div>

            {/* LinkedIn */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-zinc-900">LinkedIn Post</div>
                <button 
                  onClick={() => handleCopy(linkedinPostContent, 'linkedin')}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  {copied === 'linkedin' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'linkedin' ? 'Copied' : 'Copy Post'}
                </button>
              </div>
              <div className="bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {linkedinPostContent}
                </div>
              </div>
            </div>

            {/* X / Twitter */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-zinc-900">X / Twitter Thread</div>
                <button 
                  onClick={() => handleCopy(twitterPostContent, 'twitter')}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  {copied === 'twitter' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'twitter' ? 'Copied' : 'Copy Thread'}
                </button>
              </div>
              <div className="bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {twitterPostContent}
                </div>
              </div>
            </div>

            {/* Facebook */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-zinc-900">Facebook Post</div>
                <button 
                  onClick={() => handleCopy(facebookPostContent, 'facebook')}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  {copied === 'facebook' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'facebook' ? 'Copied' : 'Copy Post'}
                </button>
              </div>
              <div className="bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {facebookPostContent}
                </div>
              </div>
            </div>

            {/* Slack / Newsletter */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-zinc-900">Slack / Newsletter Blurb</div>
                <button 
                  onClick={() => handleCopy(slackBlurbContent, 'slack')}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  {copied === 'slack' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'slack' ? 'Copied' : 'Copy Blurb'}
                </button>
              </div>
              <div className="bg-zinc-900 text-white rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                  {slackBlurbContent}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
