// WO-4 — Crawl-vs-Cite Pick Rate. A cheap join once WO-1 (citation win %) and
// WO-3 (crawl hits) both exist: per AI company, how much it CRAWLS you vs how
// often it CITES you. The explicit point is analytical honesty — heavy crawling
// is NOT endorsement, and this keeps clients from celebrating the wrong number
// (a training crawler hammering the site while never citing it).

export interface PickRateRow {
  company: string;
  crawlHits: number;
  crawlSharePct: number;
  /** Category citation-win % for this company (null if not measured). */
  citationWinPct: number | null;
}

export interface PickRateReport {
  rows: PickRateRow[];
  caption: string;
}

export const PICK_RATE_CAPTION =
  'Crawl volume is not endorsement. A company can crawl you heavily for training while rarely citing you in answers — and a light crawler can still cite you often. Compare the two columns; a high-crawl / low-cite row is a content-fit or authority gap, not a crawl-access problem.';

/**
 * Join crawl counts (by AI company) with citation-win rates (by company).
 * Both maps are keyed by a company label (e.g. "OpenAI (ChatGPT)"). Companies
 * present in either map appear in the output.
 */
export function computePickRate(
  crawlByCompany: Record<string, number>,
  citeByCompany: Record<string, number | null>
): PickRateReport {
  const totalCrawl = Object.values(crawlByCompany).reduce((s, n) => s + (n || 0), 0);
  const companies = new Set([...Object.keys(crawlByCompany), ...Object.keys(citeByCompany)]);

  const rows: PickRateRow[] = [...companies].map((company) => {
    const crawlHits = crawlByCompany[company] || 0;
    const cite = citeByCompany[company];
    return {
      company,
      crawlHits,
      crawlSharePct: totalCrawl ? Math.round((crawlHits / totalCrawl) * 100) : 0,
      citationWinPct: cite === undefined ? null : cite,
    };
  });

  rows.sort((a, b) => b.crawlHits - a.crawlHits);
  return { rows, caption: PICK_RATE_CAPTION };
}
