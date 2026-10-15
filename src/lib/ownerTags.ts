// WO-012 C — every action carries exactly one owner tag, so a report handed to a client routes
// itself, and one line naming the figure to watch on the next measurement. The line names a
// figure; it never promises an outcome or an improvement.
//
// Import-free: the serverless exec-report path and the client both use it.

export type OwnerTag = 'Site' | 'Content' | 'Outreach';
export const OWNER_ORDER: OwnerTag[] = ['Site', 'Content', 'Outreach'];
export const OWNER_DESC: Record<OwnerTag, string> = {
  Site: 'your web team: markup, pages, crawl access',
  Content: 'your writers: copy, new pages, answer-first rewrites',
  Outreach: 'PR and partnerships: listings, pitches, the pages in Source coverage',
};

export type WatchFigure = 'discovery' | 'accuracy' | 'citation' | 'coverage' | 'readiness';
const WATCH: Record<WatchFigure, string> = {
  discovery: 'found when asked by name, on the same engine panel',
  accuracy: 'described accurately when named, on the same engine panel',
  citation: 'recommended on category questions, on the same engine panel',
  coverage: 'Source coverage: named on X of N recurring pages engines read for your category questions',
  readiness: 'the AEO Score on your next analysis, and found when asked by name on the same panel',
};
export function nextSweepLine(f: WatchFigure): string {
  return `What the next sweep shows: ${WATCH[f]}.`;
}

/** AEO Score checklist items carry a category from the analysis; map it, with the action text
 *  as the tie-breaker. */
export function ownerForChecklist(category: string, action: string): OwnerTag {
  const c = String(category || '').toLowerCase(), a = String(action || '').toLowerCase();
  if (/authority|outreach|pr\b|listing|review|citation-building|mention/.test(c) || /\b(listing|directory|wikidata|g2|crunchbase|pitch|reciprocal link|third-party|review)\b/.test(a)) return 'Outreach';
  if (/content|copy|clarity|answer/.test(c) || /\b(rewrite|write|copy|faq page|new page|paragraph|heading text|answer-first)\b/.test(a)) return 'Content';
  return 'Site';
}

/** The watch figure for an AEO Score checklist item. */
export function watchForChecklist(owner: OwnerTag): WatchFigure {
  return owner === 'Outreach' ? 'coverage' : owner === 'Content' ? 'citation' : 'readiness';
}

/** An AEO Score checklist, grouped Site → Content → Outreach, each item tagged once. */
export function groupChecklist<T extends { category: string; action: string }>(items: T[]): { owner: OwnerTag; items: T[]; watch: WatchFigure }[] {
  return OWNER_ORDER
    .map((owner) => ({ owner, items: items.filter((i) => ownerForChecklist(i.category, i.action) === owner), watch: watchForChecklist(owner) }))
    .filter((g) => g.items.length > 0);
}
