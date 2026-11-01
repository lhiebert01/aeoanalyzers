// /aeo-checker (1 Nov 2026): the free AEO Score, on its own page, named the way people search
// for it ("aeo checker", "best aeo checking tools"). The form and results are the analyzer's own
// (App.tsx renders them for both views); this file holds the page's explanation and FAQ.
//
// Accuracy rule (memory: aeo-score-one-model): the AEO Score reads the page with ONE model per
// analysis and checks crawler access for each engine's bots. It does not ask the engines anything;
// that is a Citation Sweep. The copy below must never imply otherwise. No prices on this page.

export const CHECKER_TITLE = 'Free AEO Checker';
export const CHECKER_SEO_TITLE = 'Free AEO Checker';
export const CHECKER_DESCRIPTION =
  'Free AEO checker: see whether ChatGPT, Claude, Perplexity and Gemini can read your page, and what to fix so answer engines can cite it.';

export const CHECKS: { name: string; what: string }[] = [
  { name: 'AI crawler access', what: 'Reads your live robots.txt and llms.txt and checks whether the bots behind ChatGPT, Claude, Perplexity and Gemini are allowed in. A blocked bot caps the score, because a page an engine cannot read cannot be cited.' },
  { name: 'Index coverage', what: 'Checks for a Bing verification signal (Bing feeds ChatGPT search) and whether your content is in the HTML a non-JavaScript crawler receives.' },
  { name: 'Structured data and identity', what: 'Reads your JSON-LD: whether your organization is stated with a stable @id, linked profiles and an unambiguous name, so an engine resolves you to one entity.' },
  { name: 'Answerable content', what: 'Looks for clear headings, self-contained passages and specific, quotable facts that an engine can lift into an answer, and flags long unbroken blocks.' },
  { name: 'The score and the gaps', what: 'A 0 to 100 AEO Score with its breakdown (entity, density, clarity, structure), and every gap named. The step-by-step fixes come with a paid plan.' },
];

export const CHECKER_FAQ: { q: string; a: string }[] = [
  { q: 'Is the AEO checker free?', a: 'Yes. Create a free account and you get free checks, each with the full score and every gap named. The step-by-step fixes and Citation Sweeps are on paid plans.' },
  { q: 'Does the AEO checker ask ChatGPT or Claude about my site?', a: 'No. It reads your page and checks whether those engines can reach and understand it. To see what the engines actually say when buyers ask, run a Citation Sweep, which asks them and stores every answer.' },
  { q: 'What is the difference between an AEO checker and AEO Analyzers?', a: 'AEO Analyzers is the product; the free AEO checker is its first step. It shows whether your site is ready to be cited. Citation Sweeps then measure whether you are found, described accurately and recommended.' },
  { q: 'Does a high score mean AI will recommend me?', a: 'No. A high score means engines can read and cite your page. Whether they recommend you depends mostly on what other pages say about your category, which is what a Citation Sweep shows.' },
];

export function checkerFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://aeoanalyzers.com/aeo-checker#faq',
    mainEntity: CHECKER_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function CheckerExplainer() {
  return (
    <section className="max-w-3xl mx-auto mt-20 text-left">
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-4">What the free AEO checker looks at</h2>
      <p className="text-zinc-700 leading-relaxed mb-6">
        Answer engines can only cite a page they can reach, read and attribute. The checker reads your live page the way their crawlers do and reports what stands in the way.
      </p>
      <dl className="space-y-5">
        {CHECKS.map((c) => (
          <div key={c.name}>
            <dt className="font-bold text-zinc-900">{c.name}</dt>
            <dd className="text-zinc-700 leading-relaxed mt-1">{c.what}</dd>
          </div>
        ))}
      </dl>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-14 mb-4">Questions</h2>
      <div className="space-y-6">
        {CHECKER_FAQ.map((f) => (
          <div key={f.q}>
            <h3 className="font-bold text-zinc-900">{f.q}</h3>
            <p className="text-zinc-700 leading-relaxed mt-1">{f.a}</p>
          </div>
        ))}
      </div>
      <p className="text-zinc-700 leading-relaxed mt-10">
        Want the method behind the measurement? Read <a className="underline underline-offset-2 text-zinc-900" href="/monitor-brand-in-chatgpt-and-claude">how to monitor whether your brand appears in ChatGPT and Claude</a>, or see <a className="underline underline-offset-2 text-zinc-900" href="/evidence">our own numbers, every month</a>.
      </p>
    </section>
  );
}
