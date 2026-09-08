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
//     a directory the engines demonstrably cite for THEIR category is a finding.
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

export function buildDoNowPlan(input: DoNowInputs): DoNowPlan {
  const scored = input.perEngine.filter((e) => e.total > 0);
  const foundBy = scored.filter((e) => e.found > 0).map((e) => e.engine);
  const notFoundBy = scored.filter((e) => e.found === 0).map((e) => e.engine);
  const problem = classifyProblem(input.perEngine);

  const situation: string[] = [];
  if (problem === 'unmeasured') {
    situation.push('We could not measure retrieval on any engine in this sweep, so we are not going to tell you which problem you have.');
  } else if (problem === 'not-found') {
    situation.push(`**You have a discovery problem.** No engine in this sweep retrieved ${input.domain} when asked for you by name.`);
    situation.push(`Nothing you put on your own page fixes this. A page cannot invite a crawler that never arrives. ${STRUCTURED_DATA_RULE}`);
    situation.push('The steps below are about getting into an index. Schema work is not on this list, and doing it now would cost you time and change nothing.');
  } else if (problem === 'found-but-misdescribed') {
    situation.push(`**You have an accuracy problem, not a discovery problem.** Every engine in this sweep retrieved ${input.domain} when asked for you by name.`);
    situation.push(`They can find you. What they say about you is the thing to fix, and that is what structured data is for. ${STRUCTURED_DATA_RULE}`);
  } else {
    situation.push(`**You have both problems, split by engine.** ${foundBy.join(', ')} retrieved ${input.domain} when asked for you by name. ${notFoundBy.join(', ')} did not.`);
    situation.push(`Those need different fixes and the difference matters: ${STRUCTURED_DATA_RULE}`);
    situation.push(`So the schema steps below will improve what ${foundBy.join(' and ')} say about you, and will do nothing at all for ${notFoundBy.join(' and ')} until those engines can retrieve you.`);
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
  const add = (s: Omit<DoNowStep, 'n'>) => steps.push({ n: steps.length + 1, ...s });

  const discovery = problem === 'not-found' || problem === 'mixed';

  if (discovery) {
    add({
      what: 'Submit to Bing Webmaster Tools',
      why: "Bing's index feeds both ChatGPT search and Microsoft Copilot. It is free, and it is the most-neglected action in this category.",
      link: 'https://www.bing.com/webmasters',
      time: '10 minutes, once',
      changes: 'Whether ChatGPT and Copilot can retrieve you at all.',
      doesNotChange: 'Whether they recommend you. Being retrievable is not being recommended.',
    });
    add({
      what: 'Submit to Google Search Console',
      why: 'Feeds Google and, through it, Gemini. It is also the only free view of what Google thinks of your pages.',
      link: 'https://search.google.com/search-console',
      time: '10 minutes, once',
      changes: 'Indexation, and you get diagnostics you cannot get anywhere else.',
      doesNotChange: 'Citation. If you submit and expect to start being cited, you will conclude this tool was wrong.',
    });
    add({
      what: 'Set up IndexNow',
      why: 'Supported by Bing. A one-time key file plus a ping when you publish, which shortens the lag between shipping a change and Bing seeing it.',
      link: 'https://www.indexnow.org/',
      time: '20 minutes to wire up, then automatic',
      changes: 'How quickly Bing sees a change you publish.',
      doesNotChange: 'Whether the change earns a citation. It only shortens the wait.',
    });
  }

  if (problem !== 'not-found') {
    add({
      what: 'Validate the markup this report gave you',
      why: 'We handed you JSON-LD. These two checkers tell you whether it parses before you rely on it.',
      link: 'https://validator.schema.org/ and https://search.google.com/test/rich-results',
      time: '5 minutes',
      changes: 'Confidence that what you pasted is actually readable.',
      doesNotChange: 'Anything an engine says. This is a correctness check on our output, not an improvement.',
    });
  }

  if ((input.collisions || []).length) {
    add({
      what: 'Create a Wikidata item for the organization',
      why: `Engines confused you with ${(input.collisions || []).slice(0, 3).join(', ')}. A Wikidata item is a machine-readable statement that you are a distinct entity from the similarly-named ones, and for a misattribution finding it is the highest-value action available.`,
      link: 'https://www.wikidata.org/wiki/Special:NewItem · notability rules at https://www.wikidata.org/wiki/Wikidata:Notability',
      time: '30–40 minutes',
      changes: 'The anchor engines and knowledge graphs resolve your name against.',
      doesNotChange: 'Anything immediately. And note the caveat: an organization or product item with a real website and a registry record is usually fine, but a person item without independent published coverage is likely to be flagged for deletion. Do the organization item; the person item can wait.',
    });
  }

  // §3.2 — recommend a directory only when the customer's OWN data cites it.
  for (const d of input.authorityGap || []) {
    if (/(^|\.)g2\.com$/i.test(d.domain)) {
      add({
        what: 'Claim or create your G2 vendor listing',
        why: `g2.com was cited ${d.citations} times in your own category results. This is not a generic directory suggestion — it is a source the engines demonstrably use for your category.`,
        link: 'https://sell.g2.com',
        time: '30 minutes to create; reviews take longer',
        changes: 'An indexed page carrying your canonical description, on a domain the engines already cite for you.',
        doesNotChange: 'Category placement on its own. G2 category pages generally need real customer reviews, so expect the profile to sit outside them until you have some.',
      });
    }
    if (/(^|\.)linkedin\.com$/i.test(d.domain)) {
      add({
        what: 'Point your LinkedIn company page and founder profile at the domain',
        why: `linkedin.com appeared ${d.citations} times in your own cited sources. It is the cheapest owned-and-controlled entity signal there is.`,
        link: 'https://www.linkedin.com/company/setup/new/',
        time: '20 minutes',
        changes: 'A controlled, indexed profile that corroborates your identity.',
        doesNotChange: 'Category recommendation by itself.',
      });
    }
    if (/(^|\.)reddit\.com$/i.test(d.domain)) {
      add({
        what: 'Participate where the question is already being asked on Reddit',
        why: `reddit.com was cited ${d.citations} times in your category. Engines lean on it heavily.`,
        link: 'https://www.reddit.com/',
        time: 'ongoing, a few minutes a day',
        changes: 'Presence in a source the engines already retrieve for your category.',
        doesNotChange: 'Nothing, if you do it wrong — and it can cost you. No astroturfing, no seeded questions, and never post the same thing to several subreddits at once. Participate as yourself, and link only when someone asks.',
      });
    }
  }

  const noChannelNote = notFoundBy.length
    ? `One thing worth knowing before you go looking: **${notFoundBy.join(' and ')} have no submission mechanism.** There is no equivalent of Search Console for them. Claude's search is reportedly Brave-backed, and Brave takes no submissions either. The only route into those indexes is links from pages they already crawl, which is why the steps above are about being cited elsewhere rather than about filling in a form.`
    : null;

  return { problem, foundBy, notFoundBy, situation, steps, noChannelNote, gatedNote: null };
}
