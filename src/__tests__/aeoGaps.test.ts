// Regression suite for the AEO-gap fixes (the shortcomings Claude.ai flagged in
// the pigenai.com report): crawler access, connected-@graph schema guards,
// entity-graph sameAs grounding, passage-rewrite grounding, and platform
// detection. These pin the DETERMINISTIC layers; the LLM calls are not tested.

import { describe, it, expect } from 'vitest';
import {
  evaluateCrawlerAccess,
  parseRobots,
  AI_BOTS,
} from '../lib/crawlerAccess';
import { detectPlatform } from '../lib/platformDetect';
import { evaluateIndexCoverage, extractVisibleText, THIN_TEXT_THRESHOLD } from '../lib/indexCoverage';
import { filterOfferCatalogObject, MAX_SERVICES } from '../lib/offerCatalog';
import { applyAccuracyGuards, hasNoindexMeta, type AnalysisResult } from '../services/geminiService';
import { classifySiteType } from '../lib/brandType';
import { SAAS_HTML, MACROLENS_SEVEN_OFFERS } from './fixtures';

// --- Crawler access --------------------------------------------------------
describe('crawler access: robots.txt parsing + AI-bot gate', () => {
  it('flags a catch-all Disallow: / as a critical block for all engines', () => {
    const ca = evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nDisallow: /', llmsTxtFound: true });
    expect(ca.catchAllBlocksRoot).toBe(true);
    expect(ca.criticalBlock).toBe(true);
    expect(ca.score).toBeLessThanOrEqual(40);
  });

  it('flags a specific critical AI bot being disallowed', () => {
    const robots = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /';
    const ca = evaluateCrawlerAccess({ robotsTxt: robots, llmsTxtFound: true });
    expect(ca.criticalBlock).toBe(true);
    expect(ca.blockedBots.some((b) => b.name === 'GPTBot' && b.critical)).toBe(true);
    // The catch-all still allows everyone else.
    expect(ca.catchAllBlocksRoot).toBe(false);
    expect(ca.allowedCriticalBots).toContain('ClaudeBot');
  });

  it('treats a fully open site as passing but dings a missing llms.txt', () => {
    const open = evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nAllow: /', llmsTxtFound: true });
    expect(open.criticalBlock).toBe(false);
    expect(open.score).toBe(100);
    const noLlms = evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nAllow: /', llmsTxtFound: false });
    expect(noLlms.criticalBlock).toBe(false);
    expect(noLlms.score).toBeLessThan(100);
    expect(noLlms.recommendations.join(' ')).toMatch(/llms\.txt/i);
  });

  it('no robots.txt means default-allow (good), not a block', () => {
    const ca = evaluateCrawlerAccess({ robotsTxt: null, llmsTxtFound: true });
    expect(ca.robotsFound).toBe(false);
    expect(ca.criticalBlock).toBe(false);
  });

  it('only blocks the exact path, not a longer unrelated Disallow', () => {
    const robots = 'User-agent: *\nDisallow: /admin\nDisallow: /dashboard';
    const ca = evaluateCrawlerAccess({ robotsTxt: robots, llmsTxtFound: true });
    // Root is not blocked; /admin and /dashboard are irrelevant to homepage crawl.
    expect(ca.catchAllBlocksRoot).toBe(false);
    expect(ca.criticalBlock).toBe(false);
  });

  it('longest-match with Allow winning re-opens the root for a bot', () => {
    // Disallow: / but Allow: / for the same agent → allow wins on the tie.
    const { groups } = parseRobots('User-agent: GPTBot\nDisallow: /\nAllow: /');
    expect(groups.has('gptbot')).toBe(true);
    const ca = evaluateCrawlerAccess({ robotsTxt: 'User-agent: GPTBot\nDisallow: /\nAllow: /', llmsTxtFound: true });
    expect(ca.blockedBots.some((b) => b.name === 'GPTBot')).toBe(false);
  });

  it('AI_BOTS includes the major citation engines as critical', () => {
    const critical = AI_BOTS.filter((b) => b.critical).map((b) => b.name);
    expect(critical).toEqual(expect.arrayContaining(['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot']));
  });
});

// --- Edge-level / indexing blocks (FIX 0 / PHASE 1) ------------------------
describe('crawler access: edge blocks and noindex', () => {
  it('flags an X-Robots-Tag: noindex header as a critical block', () => {
    const ca = evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nAllow: /', llmsTxtFound: true, xRobotsTag: 'noindex, nofollow' });
    expect(ca.noindexDetected).toBe(true);
    expect(ca.criticalBlock).toBe(true);
    expect(ca.score).toBeLessThanOrEqual(40);
    expect(ca.recommendations.join(' ')).toMatch(/noindex/i);
  });

  it('flags a <meta robots noindex> passed via metaRobotsNoindex', () => {
    const ca = evaluateCrawlerAccess({ robotsTxt: null, llmsTxtFound: true, metaRobotsNoindex: true });
    expect(ca.noindexDetected).toBe(true);
    expect(ca.criticalBlock).toBe(true);
  });

  it('detects the Cloudflare managed-robots.txt edge block and hands over dashboard steps', () => {
    const robots = '# Cloudflare Managed robots.txt\nUser-agent: GPTBot\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /';
    const ca = evaluateCrawlerAccess({ robotsTxt: robots, llmsTxtFound: true, isCloudflare: true });
    expect(ca.edgeBlockSuspected).toBe(true);
    expect(ca.criticalBlock).toBe(true);
    expect(ca.recommendations[0]).toMatch(/Cloudflare dashboard/i);
  });

  it('warns on a Content-Signal ai-train=no even when crawling is allowed', () => {
    const ca = evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nAllow: /', llmsTxtFound: true, contentSignal: 'ai-train=no' });
    expect(ca.criticalBlock).toBe(false);
    expect(ca.recommendations.join(' ')).toMatch(/ai-train|Content-Signal/i);
  });

  it('hasNoindexMeta detects the meta tag in raw HTML', () => {
    expect(hasNoindexMeta('<meta name="robots" content="noindex, follow">')).toBe(true);
    expect(hasNoindexMeta('<meta name="googlebot" content="none">')).toBe(true);
    expect(hasNoindexMeta('<meta name="robots" content="index, follow">')).toBe(false);
  });
});

// --- Score cap in applyAccuracyGuards --------------------------------------
describe('crawler-access score cap', () => {
  it('caps the headline score at 40 and preserves the original when a critical bot is blocked', () => {
    const brand = classifySiteType(SAAS_HTML);
    const result: AnalysisResult = {
      score: 92, summary: 'Great site.', criteria: [], recommendations: ['Do a thing'], citationProbability: 88,
      crawlerAccess: evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nDisallow: /', llmsTxtFound: false }),
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.score).toBe(40);
    expect(guarded.scoreBeforeCrawlerCap).toBe(92);
    expect(guarded.summary).toMatch(/blocked/i);
    // The fix is surfaced at the top of the recommendations.
    expect(guarded.recommendations[0]).toMatch(/robots\.txt|crawler/i);
  });

  it('does NOT cap when crawlers are allowed', () => {
    const brand = classifySiteType(SAAS_HTML);
    const result: AnalysisResult = {
      score: 92, summary: '', criteria: [], recommendations: [], citationProbability: 88,
      crawlerAccess: evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nAllow: /', llmsTxtFound: true }),
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.score).toBe(92);
    expect(guarded.scoreBeforeCrawlerCap).toBeUndefined();
  });
});

// --- Connected @graph: offer filter still applies when nested ---------------
describe('offer-catalog filter traverses @graph', () => {
  it('filters a hasOfferCatalog nested inside an @graph node', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': 'https://x.com/#website' },
        { '@type': 'Organization', '@id': 'https://x.com/#organization', hasOfferCatalog: { '@type': 'OfferCatalog', itemListElement: MACROLENS_SEVEN_OFFERS } },
      ],
    };
    const { schema: out, removed } = filterOfferCatalogObject(schema);
    const org = out['@graph'].find((n: any) => n['@type'] === 'Organization');
    expect(org.hasOfferCatalog.itemListElement.length).toBeLessThanOrEqual(MAX_SERVICES);
    expect(removed.some((r) => r.reason === 'architecture')).toBe(true);
  });
});

// --- Entity-graph sameAs grounding -----------------------------------------
describe('entity-graph audit grounding', () => {
  it('strips sameAs URLs that do not appear on the page', () => {
    const brand = classifySiteType(SAAS_HTML);
    const html = SAAS_HTML + '<a href="https://www.linkedin.com/company/realco">LinkedIn</a>';
    const result: AnalysisResult = {
      score: 70, summary: '', criteria: [], recommendations: [], citationProbability: 60,
      entityGraphAudit: {
        sameAsFound: true,
        sameAsUrls: ['https://www.linkedin.com/company/realco', 'https://twitter.com/fabricated_handle'],
        founderEntityFound: false, founderName: null, napConsistencyNote: '', recommendations: [], score: 50,
      },
    };
    const guarded = applyAccuracyGuards(result, brand, html);
    expect(guarded.entityGraphAudit!.sameAsUrls).toContain('https://www.linkedin.com/company/realco');
    expect(guarded.entityGraphAudit!.sameAsUrls).not.toContain('https://twitter.com/fabricated_handle');
  });
});

// --- Passage rewrite grounding ---------------------------------------------
describe('passage extractability grounding', () => {
  it('strips an invented number from an entity-anchor rewrite', () => {
    const brand = classifySiteType(SAAS_HTML);
    const result: AnalysisResult = {
      score: 70, summary: '', criteria: [], recommendations: [], citationProbability: 60,
      passageExtractability: {
        selfContainedScore: 55, guidance: '',
        pronounHeavyPassages: [
          { excerpt: 'We build developer tools.', issue: 'no anchor', suggestedRewrite: 'Acme builds developer tools for 5000 teams.' },
        ],
      },
    };
    const guarded = applyAccuracyGuards(result, brand, SAAS_HTML);
    expect(guarded.passageExtractability!.pronounHeavyPassages[0].suggestedRewrite).not.toContain('5000');
  });
});

// --- Platform detection ----------------------------------------------------
describe('platform detection', () => {
  it('detects WordPress from wp-content', () => {
    const d = detectPlatform('<link href="/wp-content/themes/x/style.css">');
    expect(d.platform).toBe('wordpress');
    expect(d.isCustomCoded).toBe(false);
  });

  it('detects Shopify', () => {
    expect(detectPlatform('<script src="https://cdn.shopify.com/s/x.js"></script>').platform).toBe('shopify');
  });

  it('classifies a Next.js/React app as custom-coded', () => {
    const d = detectPlatform('<div id="__next"></div><script>window.__NEXT_DATA__={}</script>');
    expect(d.platform).toBe('custom');
    expect(d.isCustomCoded).toBe(true);
    expect(d.signals.length).toBeGreaterThan(0);
  });

  it('returns unknown for an unrecognizable page', () => {
    expect(detectPlatform('<html><body><p>hello</p></body></html>').platform).toBe('unknown');
  });

  it('CMS fingerprint wins over incidental markup', () => {
    // A WordPress page that also has a #root div should still be WordPress.
    expect(detectPlatform('<div id="root"></div><link href="/wp-includes/x.css">').platform).toBe('wordpress');
  });
});

// --- Index coverage & discoverability (WO-8) --------------------------------
const SPA_SHELL =
  '<html><head><title>App</title></head><body><div id="root"></div><script type="module" src="/assets/index-abc123.js"></script></body></html>';
// A content-rich page: comfortably above the non-JS visibility threshold.
const RICH_HTML =
  '<html><head><meta name="msvalidate.01" content="ABC123" /></head><body><main>' +
  'Macro Lens is a calibrated daily market brief. '.repeat(40) +
  '</main></body></html>';

describe('index coverage: non-JS render test', () => {
  it('flags a custom-coded client-rendered shell as invisible to AI bots', () => {
    const ic = evaluateIndexCoverage({ html: SPA_SHELL, url: 'https://example.com', isCustomCoded: true });
    expect(ic.clientRenderedShell).toBe(true);
    expect(ic.status).toBe('critical');
    expect(ic.score).toBeLessThanOrEqual(40);
    expect(ic.recommendations.join(' ')).toMatch(/JavaScript|client-rendered|prerender|SSR/i);
  });

  it('does NOT flag a content-rich page even when custom-coded (SSR/prerendered)', () => {
    const ic = evaluateIndexCoverage({ html: RICH_HTML, url: 'https://example.com', isCustomCoded: true });
    expect(ic.renderedTextLength).toBeGreaterThan(THIN_TEXT_THRESHOLD);
    expect(ic.clientRenderedShell).toBe(false);
  });

  it('a thin page that is NOT custom-coded is not a critical shell (needs both signals)', () => {
    const ic = evaluateIndexCoverage({ html: '<html><body><p>Hi</p></body></html>', url: 'https://x.com', isCustomCoded: false });
    expect(ic.renderedTextLength).toBeLessThan(THIN_TEXT_THRESHOLD);
    expect(ic.clientRenderedShell).toBe(false);
    expect(ic.status).not.toBe('critical');
  });

  it('extractVisibleText strips scripts, styles, and noscript (the JS-less view)', () => {
    const html = '<html><head><style>.a{color:red}</style></head><body><noscript>Enable JavaScript</noscript><script>var x=1</script><p>Real content here</p></body></html>';
    const text = extractVisibleText(html);
    expect(text).toContain('Real content here');
    expect(text).not.toMatch(/Enable JavaScript|color:red|var x/);
  });
});

describe('index coverage: Bing verification + entity disambiguation', () => {
  it('detects a Bing verification meta tag and flags its absence', () => {
    expect(evaluateIndexCoverage({ html: RICH_HTML, url: 'https://x.com' }).bingVerificationMetaFound).toBe(true);
    const noBing = evaluateIndexCoverage({ html: '<html><body>' + 'content '.repeat(120) + '</body></html>', url: 'https://x.com' });
    expect(noBing.bingVerificationMetaFound).toBe(false);
    expect(noBing.recommendations.join(' ')).toMatch(/Bing/i);
  });

  it('recommends disambiguation + independent authority when no sameAs links exist', () => {
    const ic = evaluateIndexCoverage({ html: RICH_HTML, url: 'https://example.com', sameAsUrls: [] });
    expect(ic.sameAsCount).toBe(0);
    expect(ic.recommendations.join(' ')).toMatch(/sameAs/i);
    expect(ic.recommendations.join(' ')).toMatch(/independent/i);
  });

  it('does not push disambiguation advice when the entity has 3+ controlled profiles', () => {
    const ic = evaluateIndexCoverage({
      html: RICH_HTML,
      url: 'https://example.com',
      sameAsUrls: ['https://linkedin.com/company/x', 'https://twitter.com/x', 'https://github.com/x'],
    });
    expect(ic.sameAsCount).toBe(3);
    expect(ic.recommendations.join(' ')).not.toMatch(/sameAs/i);
    expect(ic.status).toBe('ok');
  });
});

describe('index coverage: wired through applyAccuracyGuards', () => {
  it('attaches indexCoverage (grounded sameAs) and keeps crawler recs first', () => {
    const brand = classifySiteType(SAAS_HTML);
    const result: AnalysisResult = {
      score: 90, summary: '', criteria: [], recommendations: [], citationProbability: 80,
      detectedPlatform: { platform: 'custom', isCustomCoded: true, signals: ['React root element'] },
      crawlerAccess: evaluateCrawlerAccess({ robotsTxt: 'User-agent: *\nDisallow: /', llmsTxtFound: false }),
    };
    const guarded = applyAccuracyGuards(result, brand, SPA_SHELL, 'https://example.com');
    expect(guarded.indexCoverage).toBeDefined();
    expect(guarded.indexCoverage!.clientRenderedShell).toBe(true);
    // Crawler-block fix stays first; index-coverage advice is surfaced too.
    expect(guarded.recommendations[0]).toMatch(/robots\.txt|crawler/i);
    expect(guarded.recommendations.join(' ')).toMatch(/client-rendered|JavaScript/i);
  });
});
