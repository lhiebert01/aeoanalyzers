// PART B — turn correct advice into something a non-expert can execute.
// WO-AEO-REPORT-INTEGRITY-003 Rev B §3.1–§3.4.
//
// The measurement was already good. The failure was entirely in the layer where the
// product stops reporting and starts advising: it did not say which of two completely
// different problems the customer has, and its recommendations were a list of nouns with
// no links, no times, and no statement of what would NOT change.
//
// Three rules run through this module.
//
//  1. **Name the problem before prescribing.** A customer with a discovery problem who is
//     handed a schema checklist will do the work and see no change. That is how a tool
//     loses a renewal.
//  2. **Say what does NOT change.** Overpromising is how this category earned its
//     reputation, and the honest line costs nothing.
//  3. **Recommend from the customer's own data.** A generic directory checklist is noise;
//     a directory the engines demonstrably cite for THEIR category is a finding. As steps
//     are added, each new one must earn its place from the customer's own evidence. The
//     day this becomes the same eight bullets for everyone, it is a listicle.
//  4. **Every step must move a measured layer, and it says which one.** Founder ruling,
//     Sep 18 2026: "if it does not do that, do not give an instruction to do steps that
//     accomplishes nothing useful." So each step carries `moves` — discovery, accuracy or
//     citation — and a step that moves none of the three is not a step. Two consequences
//     already applied: the markup validator was removed from this list (by its own
//     admission it changed "anything an engine says: nothing" — it is a correctness check
//     on OUR output, so it now travels with the markup it guards), and a directory is only
//     a numbered action once the customer's own data cites it three times or more. Below
//     that it is a lead, and our own evidence says review platforms attract almost no
//     citations, so printing it as an action would be selling motion as progress.
//  5. **Information belongs where it is read, not where it is filed.** Every caveat lives
//     ON the step it qualifies — the Wikidata person-item warning sits in that step's
//     doesNotChange, the Reddit guardrail in Reddit's, the G2 review-ranking caveat in
//     G2's. None is a footnote, an appendix, or a general note at the end, because a
//     reader acting on step five does not scroll back for a caution filed under step one.
//     This principle was reached independently by three sessions in one week and is
//     recorded here so a later refactor does not tidy the caveats into a block.
//
// Tier: the step-by-step with links and pre-filled values is PAID. Free and public
// surfaces teach principles only (standing founder ruling).

export interface EngineRetrieval {
  engine: string;
  /** Branded runs where the engine actually retrieved the site. */
  found: number;
  /** Branded runs scored for this engine. */
  total: number;
}

export interface DoNowInputs {
  domain: string;
  perEngine: EngineRetrieval[];
  /** Third-party entities the engines confused them with. */
  collisions?: string[];
  /** Domains the engines cite for THIS customer's category, with counts. */
  authorityGap?: { domain: string; citations: number }[];
  /** The "earn" tier of that same list — third-party pages that already answer the
   *  customer's category questions and could include them. Pitching these is the only
   *  action on the whole list with direct evidence of moving CITATION, so it must be
   *  passed in; when it is absent the plan simply cannot offer its best step. */
  pitchTargets?: { domain: string; citations: number }[];
  /** Paid tiers get the recipe; free gets the principle. */
  paid: boolean;
}

export type Problem = 'not-found' | 'found-but-misdescribed' | 'mixed' | 'unmeasured';

export interface DoNowStep {
  n: number;
  what: string;
  why: string;
  link: string | null;
  time: string;
  /** The honest half. Never optional. */
  changes: string;
  doesNotChange: string;
  /** §3.4 — impact rank. Lower sorts first. Set from the customer's own measurement,
   *  never from which section the step happens to live in. */
  impact: number;
  /** §3.3 — one plain sentence a marketing manager can act on and defend internally.
   *  No bare directives: the customer is buying understanding as much as a fix. */
  explainer: string;
  /** Which of the three measured layers this step actually moves. A step that moves
   *  none of them does not belong on the list at all (rule 4). Rendered to the customer,
   *  so they can see why a step is where it is in the order. */
  moves: 'discovery' | 'accuracy' | 'citation';
}

export interface DoNowPlan {
  problem: Problem;
  /** Per-engine, plain: which engines found them and which did not. */
  foundBy: string[];
  notFoundBy: string[];
  /** §3.1 — the opening paragraph naming their actual situation. */
  situation: string[];
  /** §3.2 — the steps, already filtered to what applies to them. */
  steps: DoNowStep[];
  /** Stated plainly where no submission channel exists at all. */
  noChannelNote: string | null;
  /** Free tier gets this instead of the steps. */
  gatedNote: string | null;
}

/** Travels WITH the emitted markup rather than as a step of its own — it guards our
 *  output, it is not customer work, and it moves no measured layer (rule 4). */
export const VALIDATE_MARKUP_NOTE =
  'Structured data is a block of machine-readable facts about your business. ' +
  'Before you rely on this block, paste it into https://validator.schema.org/ and ' +
  'https://search.google.com/test/rich-results. A single syntax error makes an engine skip ' +
  'the whole block silently — no warning, it simply reads nothing. This checks our output ' +
  'parses; it does not change anything an engine says.';

/** The honest rule, in the words the order asks for. */
export const STRUCTURED_DATA_RULE =
  'Structured data improves accuracy for engines that already find you. It cannot improve discovery for engines that do not.';

export function classifyProblem(perEngine: EngineRetrieval[]): Problem {
  const scored = perEngine.filter((e) => e.total > 0);
  if (!scored.length) return 'unmeasured';
  const anyFound = scored.some((e) => e.found > 0);
  const anyMissing = scored.some((e) => e.found === 0);
  if (anyFound && anyMissing) return 'mixed';
  return anyFound ? 'found-but-misdescribed' : 'not-found';
}

/** How often a source was cited, in words. The Sep 18 report said "g2.com was cited
 *  1 times", which is the grammar; the same sentence then claimed the engines
 *  "demonstrably use" that source, off a single observation, which was the real defect.
 *  The count is phrased here and the strength claim now lives with the citation
 *  THRESHOLD on the step itself — a directory only renders at three or more, so the
 *  claim is true whenever it is printed rather than hedged after the fact. */
function citedPhrase(n: number): { count: string } {
  return { count: n === 1 ? 'once' : `${n} times` };
}

export function buildDoNowPlan(input: DoNowInputs): DoNowPlan {
  const scored = input.perEngine.filter((e) => e.total > 0);
  const foundBy = scored.filter((e) => e.found > 0).map((e) => e.engine);
  const notFoundBy = scored.filter((e) => e.found === 0).map((e) => e.engine);
  const problem = classifyProblem(input.perEngine);
  const verb = (list: string[]) => (list.length === 1 ? 'says' : 'say');
  const does = (list: string[]) => (list.length === 1 ? 'does' : 'do');

  const situation: string[] = [];
  if (problem === 'unmeasured') {
    situation.push('We could not measure retrieval on any engine in this sweep, so we are not going to tell you which problem you have.');
  } else if (problem === 'not-found') {
    situation.push(`**You have a discovery problem.** No engine in this sweep retrieved ${input.domain} when asked for you by name.`);
    situation.push(`Nothing you put on your own page fixes this. A page cannot invite a crawler that never arrives. ${STRUCTURED_DATA_RULE}`);
    situation.push(
      input.paid
        ? 'The steps below are about getting into an index. Schema work is not on this list, and doing it now would cost you time and change nothing.'
        : 'The fix is about getting into an index. Schema work will not do it, and doing it now would cost you time and change nothing.'
    );
  } else if (problem === 'found-but-misdescribed') {
    situation.push(`**You have an accuracy problem, not a discovery problem.** Every engine in this sweep retrieved ${input.domain} when asked for you by name.`);
    situation.push(`They can find you. What they say about you is the thing to fix, and that is what structured data is for. ${STRUCTURED_DATA_RULE}`);
  } else {
    situation.push(`**You have both problems, split by engine.** ${foundBy.join(', ')} retrieved ${input.domain} when asked for you by name. ${notFoundBy.join(', ')} did not.`);
    situation.push(`Those need different fixes and the difference matters: ${STRUCTURED_DATA_RULE}`);
    // Free tier renders no steps, so this must not refer to "the steps below".
    situation.push(
      input.paid
        ? `So the schema steps below will improve what ${foundBy.join(' and ')} ${verb(foundBy)} about you, and will do nothing at all for ${notFoundBy.join(' and ')} until ${notFoundBy.length === 1 ? 'that engine' : 'those engines'} can retrieve you.`
        : `So schema work will improve what ${foundBy.join(' and ')} ${verb(foundBy)} about you, and will do nothing at all for ${notFoundBy.join(' and ')} until ${notFoundBy.length === 1 ? 'that engine' : 'those engines'} can retrieve you.`
    );
  }

  // §3.2 tier rule — the recipe is paid.
  if (!input.paid) {
    return {
      problem, foundBy, notFoundBy, situation, steps: [],
      noChannelNote: null,
      gatedNote:
        'The step-by-step — every link, the order to do them in, how long each takes, and what each one will and will not change — is included with a Day Pass and above. The paragraph above is the diagnosis, and it is yours either way.',
    };
  }

  const steps: DoNowStep[] = [];
  const add = (s: Omit<DoNowStep, 'n'>) => steps.push({ n: 0, ...s });

  const discovery = problem === 'not-found' || problem === 'mixed';

  if (discovery) {
    add({
      what: 'Submit to Bing Webmaster Tools',
      impact: 1,
      moves: 'discovery',
      explainer: 'A search index is a list of pages an engine knows exist. If your site is not on that list, the engine cannot quote you no matter how good the page is — so this is the one action that has to happen before any other action can help.',
      why: "Bing's index feeds both ChatGPT search and Microsoft Copilot. It is free, and it is the most-neglected action in this category.",
      link: 'https://www.bing.com/webmasters',
      time: '10 minutes, once',
      changes: 'Whether ChatGPT and Copilot can retrieve you at all.',
      doesNotChange: 'Whether they recommend you. Being retrievable is not being recommended.',
    });
    add({
      what: 'Submit to Google Search Console',
      impact: 2,
      moves: 'discovery',
      explainer: 'Google keeps its own index, and Gemini draws on it. Verifying the site tells Google the pages exist and, just as usefully, shows you which pages it has decided not to keep — information you cannot get any other way.',
      why: 'Feeds Google and, through it, Gemini. It is also the only free view of what Google thinks of your pages.',
      link: 'https://search.google.com/search-console',
      time: '10 minutes, once',
      changes: 'Indexation, and you get diagnostics you cannot get anywhere else.',
      doesNotChange: 'Citation. If you submit and expect to start being cited, you will conclude this tool was wrong.',
    });
    add({
      what: 'Set up IndexNow',
      impact: 6,
      moves: 'discovery',
      explainer: 'Normally you publish and wait for a crawler to come back. IndexNow reverses that: your site tells the index a page changed, so the gap between shipping something and an engine seeing it shrinks from weeks to days.',
      why: 'Supported by Bing. A one-time key file plus a ping when you publish, which shortens the lag between shipping a change and Bing seeing it.',
      link: 'https://www.indexnow.org/',
      time: '20 minutes to wire up, then automatic',
      changes: 'How quickly Bing sees a change you publish.',
      doesNotChange: 'Whether the change earns a citation. It only shortens the wait.',
    });
  }

  // REMOVED, Sep 18 2026 — "Validate the markup this report gave you" used to be step
  // three here. Its own doesNotChange read "Anything an engine says. This is a
  // correctness check on our output, not an improvement," which is rule 4 failing out
  // loud: a numbered action in a plan for becoming the answer, that by its own admission
  // moves no layer. It is a guard on the schema we emit, not work the customer chose, so
  // it now ships as one line beside that schema (see VALIDATE_MARKUP_NOTE) where a person
  // pasting the block will actually read it. Do not restore it as a step.

  if ((input.collisions || []).length) {
    add({
      what: 'Create a Wikidata item for the organization',
      impact: 2,
      moves: 'accuracy',
      explainer: 'Wikidata is the shared reference that search engines and AI assistants use to decide which real-world thing a name refers to. When several companies share your name, an entry there is what tells them you are a distinct one — which is why it is the strongest fix available for a confusion problem.',
      why: `Engines confused you with ${(input.collisions || []).slice(0, 3).join(', ')}. A Wikidata item is a machine-readable statement that you are a distinct entity from the similarly-named ones, and for a misattribution finding it is the highest-value action available.`,
      link: 'https://www.wikidata.org/wiki/Special:NewItem · notability rules at https://www.wikidata.org/wiki/Wikidata:Notability',
      time: '30–40 minutes',
      changes: 'The anchor engines and knowledge graphs resolve your name against.',
      doesNotChange: 'Your category-win number — there is no published evidence a Wikidata item produces AI citations, so watch the accuracy layer afterwards, not citation. Do the organization item only: a person item with no independent published coverage tends to be flagged for deletion.',
    });
  }

  // THE STEP THAT WAS MISSING, added Sep 18 2026.
  //
  // Every other action on this list is something the customer does to a surface they
  // control, and the evidence for those moving CITATION is weak to absent. The action
  // with the strongest evidence was not on the list at all: getting named on the specific
  // third-party pages the engines already retrieved for this customer's own questions.
  // Across 75,000 brands, branded web mentions correlated with AI brand mentions at
  // ρ = 0.664 while backlinks managed 0.218; the top mention quartile averaged 169 AI
  // mentions against 14 for the next.
  //
  // It is deliberately the named pages from THEIR sweep, not "listicles" as a category. A
  // page no engine retrieved for their questions is a page nobody's engine reads, however
  // authoritative it looks — which is the difference between this step and the generic
  // advice the whole category sells.
  const pitch = (input.pitchTargets || []).filter((t) => t.citations >= 2).slice(0, 6);
  if (pitch.length) {
    add({
      what: `Get named on the pages that already answer your category questions — start with ${pitch.slice(0, 3).map((t) => t.domain).join(', ')}`,
      impact: 3,
      moves: 'citation',
      explainer:
        'When an engine is asked what the best tools are, it summarises pages that already compare them — so the way into that answer is to be named on those pages. It is the only action here with direct evidence of moving your category number, and the only one you cannot do alone.',
      why:
        `The engines returned these for YOUR questions in this sweep: ` +
        pitch.map((t) => `${t.domain} (${citedPhrase(t.citations).count})`).join(', ') +
        `. Work them in that order, and buy no placement on a page absent from this list — no engine retrieved it for your questions.`,
      link: null,
      time: '1–2 hours per pitch, ongoing; expect 4–12 weeks before anything moves',
      changes:
        'Your presence in the set of sources the engines choose from. Watch the cited-source set, not your rank — appearing in the corpus at all is measurable months before winning, and it moves first.',
      doesNotChange:
        'Anything quickly, and most pitches are declined — send them anyway and log the date, so the next sweep is readable against it. Send a fact block and a reason the reader benefits, never a favour request, and skip any competitor on that list.',
    });
  }

  // §3.2 — recommend a directory only when the customer's OWN data cites it.
  for (const d of input.authorityGap || []) {
    // Rule 4: a directory becomes a numbered ACTION only once their own data cites it
    // three times or more. Our own evidence is that review platforms attract almost no
    // citations (233 ChatGPT software recommendations, aggregators 0.9% of citations), so
    // at one or two hits this is a lead, and printing it as an action sells motion.
    if (/(^|\.)g2\.com$/i.test(d.domain) && d.citations >= 3) {
      add({
        what: 'Claim or create your G2 vendor listing',
      impact: 8,
      moves: 'citation',
      explainer: 'Engines answer category questions largely by summarising pages that already compare products. G2 is one of the pages yours is answered from, so being absent there means being absent from the summary — though a listing is a foot in the door, not a place in the answer.',
        why: `g2.com was cited ${citedPhrase(d.citations).count} in your own category results — a source the engines repeatedly used for your category, not a generic directory suggestion.`,
        link: 'https://sell.g2.com',
        time: '30 minutes to create; reviews take longer',
        changes: 'An indexed page carrying your canonical description, on a domain the engines already cite for you.',
        doesNotChange: "Whether an engine recommends you — the cited page is G2's review-ranked category page, and getting onto it needs real customer reviews. Expect this to put you in the corpus without yet putting you in an answer.",
      });
    }
    if (/(^|\.)linkedin\.com$/i.test(d.domain)) {
      add({
        what: 'Point your LinkedIn company page and founder profile at the domain',
      impact: 5,
      moves: 'citation',
      explainer: 'A LinkedIn page is a page you control on a domain engines already trust, which makes it cheap corroboration: it independently confirms your company name, what you do, and which website is yours.',
        why: `linkedin.com appeared ${citedPhrase(d.citations).count} in your own cited sources, and it is the cheapest owned-and-controlled entity signal there is.`,
        link: 'https://www.linkedin.com/company/setup/new/',
        time: '20 minutes',
        changes: 'A controlled, indexed profile that corroborates your identity.',
        doesNotChange: 'Category recommendation by itself.',
      });
    }
    if (/(^|\.)reddit\.com$/i.test(d.domain)) {
      add({
        what: 'Participate where the question is already being asked on Reddit',
      impact: 4,
      moves: 'citation',
      explainer: 'Engines lean heavily on Reddit because it is where people ask the questions your buyers ask. Being present in those threads as a genuine participant puts you in the material an engine reads when it answers — and being present dishonestly gets you removed from it.',
        why: `reddit.com was cited ${citedPhrase(d.citations).count} in your category, and it is the most-cited domain across answer engines generally.`,
        link: 'https://www.reddit.com/',
        time: 'ongoing, a few minutes a day',
        changes: 'Presence in a source the engines already retrieve for your category.',
        doesNotChange: 'Nothing if you do it wrong, and it can cost you — no astroturfing, no seeded questions, never the same text to several subreddits at once. Participate as yourself and link only when someone asks.',
      });
    }
  }

  // §3.4 — ONE ranked list, ordered by impact on THIS customer's measurement, not by
  // which section a step came from. Renumber after sorting so the numbers a customer
  // reads match the order they should work in.
  steps.sort((a, b) => a.impact - b.impact);
  steps.forEach((s2, i) => { s2.n = i + 1; });

  const noChannelNote = notFoundBy.length
    ? `One thing worth knowing before you go looking: **${notFoundBy.join(' and ')} have no submission mechanism.** There is no equivalent of Search Console for them. Claude's search is reportedly Brave-backed, and Brave takes no submissions either. The only route into those indexes is links from pages they already crawl, which is why the steps above are about being cited elsewhere rather than about filling in a form.`
    : null;

  return { problem, foundBy, notFoundBy, situation, steps, noChannelNote, gatedNote: null };
}
