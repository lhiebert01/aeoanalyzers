import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** THE PUBLICATION GATE.
 *
 *  /blog/i-scored-zero tells readers, in its own corrections block, that "a publication
 *  gate now blocks any measured figure that cannot be recomputed from [the stored
 *  transcripts] at publish time." This file is that gate. Until it existed the claim was
 *  aspirational, and the first thing it would have caught was our own mistake:
 *
 *  The ledger was published at 82% branded for September, taken from the stored
 *  `domainCited` flag. That flag is the PRE-correction value. One Claude run is stored as
 *  a hit while its own answer reads "I couldn't find information specifically about
 *  aeoanalyzers.com" — a search that ran, failed, and said so. Under the corrected rule
 *  that is a miss, the month is 32/40, and the corrections block three sections above the
 *  ledger already said 80%. The page contradicted itself.
 *
 *  So: recompute every published figure from the stored runs, applying the corrected
 *  rule, and fail if the page disagrees. Never trust a stored score field. */

const root = (rel: string) => resolve(__dirname, '..', '..', rel);
const load = (f: string) => JSON.parse(readFileSync(root(`docs/baselines/${f}`), 'utf8'));

/** An engine that ran a search, did not find the site, and said so is a MISS — even if
 *  the stored flag counted it. WO-AEO-SWEEP-INTEGRITY-002 Lane A2. */
const NOT_FOUND =
  /(could ?n'?t find|couldn.t find|unable to find|no (?:specific )?(?:website|information|results?) (?:specifically )?(?:at|about|for)|don'?t have (?:any )?(?:specific )?information)/i;

type Run = { queryType: string; domainCited?: boolean; transcript?: string };

function brandedPct(file: string) {
  const runs: Run[] = load(file).runs.filter((r: Run) => r.queryType === 'branded');
  const hits = runs.filter(r => r.domainCited && !NOT_FOUND.test(r.transcript ?? ''));
  return { pct: Math.round((100 * hits.length) / runs.length), n: runs.length };
}

function categoryPct(file: string) {
  const runs: Run[] = load(file).runs.filter((r: Run) => r.queryType === 'category');
  const hits = runs.filter(r => r.domainCited);
  return { pct: Math.round((100 * hits.length) / runs.length), n: runs.length };
}

const AUG = 'aeoanalyzers-SERIES-ANCHOR-2026-08-01.json';
const SEP = 'aeoanalyzers-2026-09-01.json';
const page = readFileSync(root('public/blog/i-scored-zero/index.html'), 'utf8');

describe('the ledger matches what the stored transcripts actually say', () => {
  it('recomputes September branded under the CORRECTED rule, not the stored flag', () => {
    const { pct, n } = brandedPct(SEP);
    expect(pct).toBe(80);           // 32/40 — the stored flag says 33/40
    expect(n).toBe(40);
  });

  it('recomputes August branded (the restated anchor)', () => {
    expect(brandedPct(AUG)).toEqual({ pct: 55, n: 40 });
  });

  it('recomputes both category figures', () => {
    expect(categoryPct(AUG)).toEqual({ pct: 0, n: 200 });
    expect(categoryPct(SEP)).toEqual({ pct: 0, n: 200 });
  });

  it('publishes the recomputed September figure, in the card AND in the table', () => {
    const { pct } = brandedPct(SEP);
    expect(page).toContain(`<div class="num">${pct}%</div>`);
    expect(page).toContain(`<span class="fig up">${pct}%</span>`);
  });

  it('publishes the recomputed August figure in the table', () => {
    expect(page).toContain(`<span class="fig flat">${brandedPct(AUG).pct}%</span>`);
  });

  it('states the month-over-month move as the arithmetic actually gives it', () => {
    const move = brandedPct(SEP).pct - brandedPct(AUG).pct;
    expect(page).toContain(`rose ${move} points`);
    expect(page).not.toContain('rose 27 points');   // the figure we nearly shipped
  });

  it('never states a branded figure the transcripts cannot produce', () => {
    // 82% was the pre-correction number. It may appear ONLY where the page is
    // explaining that it was corrected — never as a live figure in the ledger.
    const ledger = page.slice(page.indexOf('id="the-ledger"'));
    expect(ledger).not.toMatch(/<div class="num">82%<\/div>/);
    expect(ledger).not.toMatch(/<span class="fig[^"]*">82%<\/span>/);
  });

  it('prints N beside every published figure — a number without its N is uncheckable', () => {
    expect(page).toContain('N=40');
    expect(page).toContain('N=200');
  });
});

/** The crawler window. Part 1's corrections block retracts "thirty days to July 31" —
 *  the telemetry did not exist before July 22, so the window was ten days and the crawl
 *  RATE is about three times what we first published. Part 2's prose was corrected in
 *  seven places; its stat tile was missed and still said "30 days", on the same page.
 *  A retracted figure may appear only where a page is quoting its own retraction. */
describe('the retracted crawler window does not survive anywhere as a live figure', () => {
  const pages = ['public/blog/reading-isnt-citing/index.html',
                 'public/blog/how-it-works/index.html'];

  it('never states a thirty-day window on a page that is not retracting it', () => {
    for (const p of pages) {
      const src = readFileSync(root(p), 'utf8');
      expect(src, `${p} still claims the retracted 30-day crawler window`)
        .not.toMatch(/(30|thirty) days to July 31/i);
    }
  });

  it('Part 1 keeps the phrase ONLY inside the corrections block', () => {
    const src = readFileSync(root('public/blog/i-scored-zero/index.html'), 'utf8');
    const corrections = src.slice(src.indexOf('id="corrections"'));
    expect(src.match(/thirty days to July 31/g) || []).toHaveLength(1);
    expect(corrections).toContain('thirty days to July 31');
  });
});
