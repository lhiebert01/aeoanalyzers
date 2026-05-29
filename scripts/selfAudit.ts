// Self-audit smoke test (Part 6 of the brief): re-run the analyzer against
// getmacrolens.com and print the score + the specific pitfalls that should now
// be avoided. Run with:  npx vite-node scripts/selfAudit.ts
//
// Requires GEMINI_API_KEY in the environment (loaded from .env by the runner).

import { analyzeWebsite } from '../src/services/geminiService';

const TARGET = process.argv[2] || 'https://www.getmacrolens.com/';

const browserHeaders: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.google.com/',
};

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, { headers: browserHeaders, redirect: 'follow', signal: AbortSignal.timeout(45000) });
  if (!resp.ok) throw new Error(`fetch ${url} -> ${resp.status}`);
  return resp.text();
}

(async () => {
  console.log(`\n→ Fetching ${TARGET} ...`);
  const html = await fetchHtml(TARGET);
  console.log(`  got ${html.length} bytes`);

  console.log('→ Analyzing ...');
  const r = await analyzeWebsite(TARGET, html);

  console.log('\n========== SELF-AUDIT RESULT ==========');
  console.log(`Score:            ${r.score}/100  (brief target: 92–94)`);
  console.log(`Detected type:    ${r.siteType}   signals=${JSON.stringify(r.brandTypeSignals)}`);

  // Failure 1 — no voice rewrites for editorial
  console.log(`\n[Failure 1] contentRewrites: ${r.contentRewrites?.length ?? 0} (expect 0 for editorial)`);
  console.log(`            schemaDensityRecommendations: ${r.schemaDensityRecommendations?.length ?? 0} (expect >0 for editorial)`);

  // Failure 2 — inferred not in verified block
  const verified = r.verifiedSchema || r.comprehensiveSchema || '';
  console.log(`\n[Failure 2] verified schema mentions 'Mixed, Watch, or Action': ${/Mixed, Watch, or Action/i.test(verified)} (expect false)`);
  console.log(`            candidateSchema present: ${!!(r.candidateSchema && r.candidateSchema.trim())}`);

  // Failure 3 — offer cap
  let offers = 0;
  try { offers = JSON.parse(verified)?.hasOfferCatalog?.itemListElement?.length ?? 0; } catch { /* */ }
  console.log(`\n[Failure 3] verified OfferCatalog services: ${offers} (expect <= 4; brief expects ~2)`);
  console.log(`            removed offers: ${JSON.stringify(r.offerCatalogRemoved?.map((o) => o.name) ?? [])}`);

  // Failure 4 — pricing not flagged missing
  const pricingQ = r.queryContentGap?.generatedQuestions.find((q) => /cost|free|price|pricing/i.test(q.question));
  console.log(`\n[Failure 4] pricing question category: ${pricingQ?.gapCategory ?? 'n/a'} (expect schema_only or strong, NOT missing)`);

  // Failure 5 — no non-capability queries
  const badQ = r.queryContentGap?.generatedQuestions.filter((q) => /mobile app|international market/i.test(q.question)) ?? [];
  console.log(`\n[Failure 5] mobile-app / international-market questions: ${badQ.length} (expect 0)`);
  console.log(`            detectedCapabilities: ${JSON.stringify(r.queryContentGap?.detectedCapabilities ?? [])}`);

  console.log('\n--- all generated questions ---');
  for (const q of r.queryContentGap?.generatedQuestions ?? []) {
    console.log(`  [${q.gapCategory}] ${q.question}${q.sourceQuote ? `  «${q.sourceQuote.slice(0, 60)}»` : ''}`);
  }
  console.log(`\nscoreBreakdown: ${JSON.stringify(r.scoreBreakdown)}`);
  console.log('\n=======================================\n');
})().catch((e) => {
  console.error('Self-audit failed:', e?.message || e);
  process.exit(1);
});
