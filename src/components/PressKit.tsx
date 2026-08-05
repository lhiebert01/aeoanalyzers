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
# The next generation of AEO Analyzers: prove it, don't just score it

**By Lindsay Hiebert · PI GenAI LLC**
*July 2026*

Search is becoming answers. When someone asks ChatGPT, Gemini, Perplexity, or Claude about your category, they get one answer — one or two names. If it isn't you, your customers never see you.

A score predicts. A Citation Sweep proves.

The new AEO Analyzers asks the real answer engines your buyers' questions — multiple times each, across ChatGPT, Claude, Perplexity, and Gemini — and stores every transcript. Then it measures three separable layers:

- **Retrievability** — ask AI about your brand by name; does it return a real answer? A health check that should sit near 100%.
- **Fidelity** — is what AI says about you actually true? We flag fabricated founders, stale prices, and invented features, with the correct value and the fix.
- **Citation Win** — on the unbranded category questions that sell ("best [category] tools"), does AI pick you — and if not, exactly who is cited instead?

And we don't stop at the number. We hand you the fixes — paste-ready JSON-LD, content rewrites, and a developer-ready report — plus a crawler-access check so you know AI can even read you.

Every result is backed by the actual transcript. Run the query yourself and you'll get what the report says.

Re-run your sweep monthly and track your share of the AI answer over time. Inputs are the checklist. Citation rate is the score.

Start free at https://aeoanalyzers.com
`;

  const pressReleaseContent = `
FOR IMMEDIATE RELEASE

# AEO Analyzers adds real-time Citation Sweeps — measuring whether AI answer engines actually cite your brand

**PI GenAI LLC — July 2026** — AEO Analyzers today released the next generation of its Answer Engine Optimization platform, adding live Citation Sweeps that ask real AI answer engines — ChatGPT, Claude, Perplexity, and Google Gemini — a brand's buyer questions and record what each one answers.

As buyers increasingly ask AI assistants for recommendations instead of scrolling search results, being the source an engine cites has become a growth priority. AEO Analyzers measures that outcome directly, with stored transcripts a customer can reproduce.

"A score predicts; a sweep proves," said Lindsay Hiebert, founder of PI GenAI LLC. "We ask the real engines your buyers' questions, show whether they cite you or a competitor, and hand you the specific fixes. Our promise is simple — run the query yourself and you'll get what the report says."

### What the platform does
*   **Citation Sweeps:** buyers' questions run across four live answer engines, multiple times each, with every transcript stored.
*   **Three separable layers:** Retrievability (does AI find you by name), Fidelity (is its answer about you accurate), and Citation Win (does AI pick you for category questions — and who's cited instead).
*   **The fixes, not just a score:** paste-ready JSON-LD, content rewrites, and a developer-ready report; plus a crawler-access audit of robots.txt and llms.txt.
*   **Progressive monitoring:** re-run monthly to track share of the AI answer over time.

### About PI GenAI LLC
AEO Analyzers (aeoanalyzers.com) is built and maintained by Lindsay Hiebert, founder of PI GenAI LLC. It is unaffiliated with any similarly named browser extension, plugin, or tool.

**Media Contact:**
Lindsay Hiebert
Lindsay.Hiebert@gmail.com
https://aeoanalyzers.com
`;

  const linkedinPostContent = `
Search is becoming answers.

When a buyer asks ChatGPT, Gemini, Perplexity, or Claude for the best option in your category, they get one answer. If it isn't you, a competitor just won the customer.

Today we're releasing the next generation of AEO Analyzers — real-time Citation Sweeps.

A score predicts. A sweep proves. We ask the real engines your buyers' questions, store every transcript, and measure three things:
• Retrievability — does AI find you by name?
• Fidelity — is what it says about you true?
• Citation Win — on category questions, does it pick you, or name a competitor instead?

Then we hand you the fixes — paste-ready schema, rewrites, and a developer-ready report — and you can re-run monthly to track your progress.

Run the query yourself and you'll get what the report says.

Start free: https://aeoanalyzers.com

#AEO #AnswerEngineOptimization #AISearch
`;

  const twitterPostContent = `
1/ Search is becoming answers.

Ask ChatGPT, Gemini, Perplexity, or Claude for the best option in a category and you get one answer. If it isn't your brand, a competitor just won the customer.

The next generation of AEO Analyzers is here: real-time Citation Sweeps. 🧵

2/ A score predicts. A sweep proves.

We ask the real engines your buyers' questions — multiple times each — and store every transcript. You can re-run any answer and get the same result.

3/ Three separable layers:
• Retrievability — does AI find you by name?
• Fidelity — is what it says about you true?
• Citation Win — does it pick you for category questions, or name a competitor instead?

4/ We don't stop at the number. Paste-ready JSON-LD, content rewrites, a developer-ready report, and a crawler-access check — so you can move your AI visibility, then track it monthly.

5/ Run the query yourself and you'll get what the report says.

Start free: https://aeoanalyzers.com

#AEO #AISearch #AEOAnalyzers
`;

  const facebookPostContent = `
Is your business the answer AI gives?

More people are asking ChatGPT, Gemini, Perplexity, and Claude for recommendations instead of scrolling search results. If those assistants don't name you, your customers may never find you.

The new AEO Analyzers measures it directly. We ask the real engines your buyers' questions and show whether they cite you or a competitor — with the transcripts to prove it. Then we hand you the exact fixes.

✅ See whether AI names you or a competitor
✅ Catch when AI gets your facts wrong
✅ Get paste-ready fixes and re-check monthly

Start free: https://aeoanalyzers.com
`;

  const slackBlurbContent = `
🚀 New: the next generation of AEO Analyzers adds real-time Citation Sweeps — it asks ChatGPT, Claude, Perplexity, and Gemini your buyers' questions and shows whether they cite you or a competitor, with stored transcripts and the exact fixes. Start free at https://aeoanalyzers.com.
`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <SEO
        title="Press Kit & Announcements - AEO Analyzers"
        description="Announcement and press resources for AEO Analyzers — real-time Citation Sweeps across ChatGPT, Claude, Perplexity, and Gemini, backed by stored transcripts, plus the exact fixes."
        author="Lindsay Hiebert"
        publishedDate="2026-07-28T00:00:00Z"
      />

      <div className="flex flex-col md:flex-row items-start gap-12">
        {/* Sidebar */}
        <div className="md:w-64 shrink-0 space-y-8">
          <div className="p-6 bg-zinc-900 rounded-3xl text-white">
            <Megaphone className="w-8 h-8 mb-4 text-emerald-400" />
            <h2 className="text-xl font-black mb-2 tracking-tight">Press Kit</h2>
            <p className="text-zinc-400 text-xs leading-relaxed">Announcement resources for media, partners, and early adopters.</p>
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
            <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">Media Contact</p>
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
              <div className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest">
                <FileText className="w-3 h-3" />
                Official Blog
              </div>
              <button
                onClick={() => handleCopy(blogContent, 'blog')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
              >
                {copied === 'blog' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied === 'blog' ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="prose prose-zinc prose-sm md:prose-base max-w-none bg-white border border-zinc-300 rounded-[3rem] p-10 md:p-16 shadow-sm">
              <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-none">
                The next generation of AEO Analyzers: <span className="text-zinc-400">prove it, don't just score it</span>
              </h1>

              <div className="flex items-center gap-4 mb-12 pb-12 border-b border-zinc-100">
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white font-black">LH</div>
                <div>
                  <div className="font-bold text-zinc-900">Lindsay Hiebert · PI GenAI LLC</div>
                  <div className="text-xs text-zinc-400">July 2026 • 4 min read</div>
                </div>
              </div>

              <div className="space-y-6 text-zinc-600 leading-relaxed">
                <p className="text-xl font-medium text-zinc-900">Search is becoming answers. When someone asks ChatGPT, Gemini, Perplexity, or Claude about your category, they get one answer — one or two names. If it isn't you, your customers never see you.</p>
                <p className="font-bold text-zinc-900">A score predicts. A Citation Sweep proves.</p>
                <p>The new AEO Analyzers asks the real answer engines your buyers' questions — multiple times each, across ChatGPT, Claude, Perplexity, and Gemini — and stores every transcript. Then it measures three separable layers.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-300">
                    <h4 className="font-black text-zinc-900 mb-2">Retrievability</h4>
                    <p className="text-sm">Ask AI about your brand by name — does it return a real answer? A health check that should sit near 100%.</p>
                  </div>
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-300">
                    <h4 className="font-black text-zinc-900 mb-2">Fidelity</h4>
                    <p className="text-sm">Is what AI says about you actually true? We flag fabricated founders, stale prices, and invented features — with the correct value and the fix.</p>
                  </div>
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-300">
                    <h4 className="font-black text-zinc-900 mb-2">Citation Win</h4>
                    <p className="text-sm">On the category questions that sell, does AI pick you — and if not, exactly who is cited instead?</p>
                  </div>
                </div>

                <p>And we don't stop at the number. We hand you the fixes — paste-ready JSON-LD, content rewrites, and a developer-ready report — plus a crawler-access check so you know AI can even read you.</p>
                <p className="font-bold text-zinc-900">Every result is backed by the actual transcript. Run the query yourself and you'll get what the report says.</p>
                <p>Re-run your sweep monthly and track your share of the AI answer over time. Inputs are the checklist. Citation rate is the score.</p>
              </div>
            </div>
          </section>

          {/* Press Release Section */}
          <section id="press" className="scroll-mt-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest">
                <Newspaper className="w-3 h-3" />
                Press Release
              </div>
              <button
                onClick={() => handleCopy(pressReleaseContent, 'press')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
              >
                {copied === 'press' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied === 'press' ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-300 rounded-[3rem] p-10 md:p-16 font-mono text-sm text-zinc-600 space-y-8">
              <div className="text-center space-y-2 mb-12">
                <div className="font-black text-zinc-900 uppercase tracking-[0.3em]">For Immediate Release</div>
                <div className="text-xs">July 2026</div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight leading-tight uppercase">
                AEO Analyzers adds real-time Citation Sweeps — measuring whether AI answer engines actually cite your brand
              </h2>

              <p><strong>PI GenAI LLC — July 2026</strong> — AEO Analyzers today released the next generation of its Answer Engine Optimization platform, adding live Citation Sweeps that ask real AI answer engines — ChatGPT, Claude, Perplexity, and Google Gemini — a brand's buyer questions and record what each one answers.</p>

              <p>As buyers increasingly ask AI assistants for recommendations instead of scrolling search results, being the source an engine cites has become a growth priority. AEO Analyzers measures that outcome directly, with stored transcripts a customer can reproduce.</p>

              <p>"A score predicts; a sweep proves," said Lindsay Hiebert, founder of PI GenAI LLC. "We ask the real engines your buyers' questions, show whether they cite you or a competitor, and hand you the specific fixes. Our promise is simple — run the query yourself and you'll get what the report says."</p>

              <div className="space-y-4">
                <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">What the platform does:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Citation Sweeps:</strong> buyers' questions run across four live answer engines, multiple times each, with every transcript stored.</li>
                  <li><strong>Three separable layers:</strong> Retrievability (does AI find you by name), Fidelity (is its answer about you accurate), and Citation Win (does AI pick you for category questions — and who's cited instead).</li>
                  <li><strong>The fixes, not just a score:</strong> paste-ready JSON-LD, content rewrites, and a developer-ready report; plus a crawler-access audit of robots.txt and llms.txt.</li>
                  <li><strong>Progressive monitoring:</strong> re-run monthly to track share of the AI answer over time.</li>
                </ul>
              </div>

              <div className="pt-12 border-t border-zinc-200 space-y-4">
                <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">About PI GenAI LLC</p>
                <p>AEO Analyzers (aeoanalyzers.com) is built and maintained by Lindsay Hiebert, founder of PI GenAI LLC. It is unaffiliated with any similarly named browser extension, plugin, or tool.</p>
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
            <div className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest mb-8">
              <Share2 className="w-3 h-3" />
              Social Media Announcements
            </div>

            {/* LinkedIn */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-zinc-900">LinkedIn Post</div>
                <button
                  onClick={() => handleCopy(linkedinPostContent, 'linkedin')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  {copied === 'linkedin' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'linkedin' ? 'Copied' : 'Copy Post'}
                </button>
              </div>
              <div className="bg-white border border-zinc-300 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {linkedinPostContent}
                </div>
              </div>
            </div>

            {/* X / Twitter */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-zinc-900">X / Twitter Thread</div>
                <button
                  onClick={() => handleCopy(twitterPostContent, 'twitter')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  {copied === 'twitter' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'twitter' ? 'Copied' : 'Copy Thread'}
                </button>
              </div>
              <div className="bg-white border border-zinc-300 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {twitterPostContent}
                </div>
              </div>
            </div>

            {/* Facebook */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-zinc-900">Facebook Post</div>
                <button
                  onClick={() => handleCopy(facebookPostContent, 'facebook')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  {copied === 'facebook' ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied === 'facebook' ? 'Copied' : 'Copy Post'}
                </button>
              </div>
              <div className="bg-white border border-zinc-300 rounded-[3rem] p-10 shadow-sm">
                <div className="space-y-4 text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {facebookPostContent}
                </div>
              </div>
            </div>

            {/* Slack / Newsletter */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-zinc-900">Slack / Newsletter Blurb</div>
                <button
                  onClick={() => handleCopy(slackBlurbContent, 'slack')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
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
