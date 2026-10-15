import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Packer } from 'docx';
import { buildGuide, guideRecordActions, guideBodyHtml, businessTypeFrom, descriptionDrafts, CATALOG, FILL, NO_GUARANTEE, PRICE_RULE, type GuideInput } from '../lib/stepGuide';
import { buildGuideDocument } from '../services/guideDocx';
import { extractSiteFacts } from '../lib/truthRecord';
import { pageTitleAndByline, type SourceCoverage } from '../lib/sourceCoverage';
import type { RecordEntry } from '../lib/theRecord';

/** WO-AEO-STEP-BY-STEP-GUIDES-014 — the personalized step-by-step guide. */
const HOME = `<html><head><meta name="description" content="Acme Books makes invoicing software for freelancers. It sends invoices, tracks payments and runs on any browser. Built in Austin."><meta name="generator" content="Webflow">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Acme Books Inc","address":{"@type":"PostalAddress","addressLocality":"Austin","addressCountry":"US"}},{"@type":"SoftwareApplication","name":"Acme Books","description":"Invoicing software for freelancers and small firms."}]}</script></head><body></body></html>`;
const site = extractSiteFacts(HOME);
const coverage: SourceCoverage = {
  fetchedAt: '2026-10-15T10:00:00Z', distinctSites: 40,
  rows: [
    { host: 'g2.com', timesCited: 7, engines: ['perplexity'], url: 'https://www.g2.com/categories/invoicing', verdict: 'no', title: 'Best Invoicing Software', byline: 'G2 Research' },
    { host: 'example-blog.com', timesCited: 4, engines: ['openai'], url: 'https://example-blog.com/invoicing-tools', verdict: 'no', title: 'Invoicing tools we tried' },
    { host: 'named.com', timesCited: 3, engines: ['claude'], url: 'https://named.com/x', verdict: 'yes' },
  ],
};
const base: GuideInput = {
  domain: 'acmebooks.com', date: '2026-10-16T12:00:00Z', brand: 'Acme', site, coverage, category: 'invoicing software',
  score: { score: 88, at: '2026-10-14T12:00:00Z', verifiedSchema: '{"@type":"Organization"}', metaSuggested: 'Acme Books: invoicing for freelancers.', platform: null,
    checklist: [{ category: 'Technical', action: 'Add Organization JSON-LD schema to the homepage', priority: 'High' }, { category: 'Content', action: 'Rewrite the intro answer-first', priority: 'High' }, { category: 'Technical', action: 'Update the meta description', priority: 'Low' }] },
  split: { readiness: { score: 88 }, recommended: { pct: 3, line: '1 of 40 category answers, four engines, October 13th' } },
  record: [],
};
const text = (g: ReturnType<typeof buildGuide>) => guideBodyHtml(g).replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('personalization from stored data only', () => {
  it('fills names, drafts, category, place and platform from the site; no Fill in for them', () => {
    const g = buildGuide(base);
    const t = text(g);
    expect(site.orgName).toBe('Acme Books Inc');
    expect(t).toContain('Company: Acme Books Inc');
    expect(t).toContain('Name: Acme Books');
    expect(t).toContain('Short: Acme Books makes invoicing software for freelancers.');
    expect(t).toContain('Category: invoicing software');
    expect(t).toContain('Draft from your own website. Check every fact before you paste it.');
    expect(t).toContain('In Webflow:');
    expect(g.businessType).toBe('software');
    expect(g.fillIns).toEqual(['legal form', 'author of example-blog.com']);
  });
  it('anything unknown prints "Fill in:" and is never guessed', () => {
    const g = buildGuide({ ...base, site: null, brand: null, category: null, score: null, coverage: null, businessType: null });
    const t = text(g);
    expect(t).toContain(`${FILL} company name`);
    expect(t).toContain(`${FILL} Short text`);
    expect(t).toContain(`${FILL} category`);
    expect(g.needsBusinessType).toBe(true);
    for (const f of ['company name', 'Short text', 'Long text', 'category', 'business type', 'site fixes', 'pages engines read']) expect(g.fillIns).toContain(f);
  });
  it('business type comes from structured data, else the customer\'s confirmed choice', () => {
    expect(businessTypeFrom(['Organization', 'SoftwareApplication'])).toBe('software');
    expect(businessTypeFrom(['Dentist'])).toBe('local');
    expect(businessTypeFrom(['LegalService'])).toBe('professional_services');
    expect(businessTypeFrom(['Organization'])).toBeNull();
    const local = buildGuide({ ...base, site: { ...site, ldTypes: ['Organization'] }, businessType: 'local' });
    expect(local.businessType).toBe('local');
    expect(local.parts[1].steps.map((s) => s.key)).toContain('guide:listing:google_business');
    expect(local.parts[1].steps.map((s) => s.key)).not.toContain('guide:listing:g2');
    expect(local.parts[2].tables).toHaveLength(1); // a local business is one Wikidata item
  });
  it('the Short draft is 120 characters or fewer; the Long draft about 60 words', () => {
    const d = descriptionDrafts({ ...site, metaDescription: `${'Very long opening sentence '.repeat(8)}ends here. Second.` });
    expect(d.short!.length).toBeLessThanOrEqual(120);
    expect(descriptionDrafts(site).long!.split(/\s+/).length).toBeLessThanOrEqual(70);
  });
});

describe('the five parts', () => {
  const g = buildGuide(base);
  it('Start here carries both numbers, coverage, the order and the no-guarantee sentence', () => {
    const t = text(g);
    expect(t).toContain('Ready to be cited: 88/100');
    expect(t).toContain('Recommended by engines: 3%, 1 of 40 category answers, four engines, October 13th.');
    expect(t).toContain('You are named on 1 of 3 recurring pages');
    expect(t).toContain(NO_GUARANTEE);
    expect(g.parts.map((p) => [p.title, p.owner])).toEqual([['Part 1, Your website', 'Site'], ['Part 2, Your listings', 'Outreach'], ['Part 3, Your knowledge-base entry', 'Outreach'], ['Part 4, The pages engines read', 'Outreach']]);
  });
  it('Part 1 holds only Site actions, highest priority first, with paste-ready code and the price rule', () => {
    expect(g.parts[0].steps.map((s) => s.title)).toEqual(['Add Organization JSON-LD schema to the homepage', 'Update the meta description']);
    expect(g.parts[0].steps[0].code).toBe('{"@type":"Organization"}');
    expect(g.parts[0].steps[1].copy).toEqual(['Acme Books: invoicing for freelancers.']);
    expect(text(g)).toContain(PRICE_RULE);
  });
  it('Part 2 puts the directories the engines cite first, labeled, and prints the check date', () => {
    expect(g.parts[1].steps[0].title).toBe('G2 — the engines read this for your category: cited 7 times');
    expect(text(g)).toContain(`Sign-up pages change; checked October 15th, 2026.`);
    expect(g.parts[1].boxes[1].lines).toEqual(['One description everywhere, word for word.', 'Describe yourself plainly and name no other company.', 'Reviews only from real customers, never in exchange for anything.']);
  });
  it('Part 3 says sources first, neutral descriptions, and that Wikipedia is different', () => {
    const notes = g.parts[2].steps[0].notes!.join(' ');
    expect(notes).toMatch(/independent sources/); expect(notes).toMatch(/never promotional/); expect(notes).toMatch(/Wikipedia is different/);
  });
  it('Part 4 lists only "No" pages, most-cited first, with byline or Fill in, and an email that never asks to be ranked', () => {
    const p4 = g.parts[3].steps;
    expect(p4.map((s) => s.where)).toEqual(['g2.com', 'example-blog.com']);
    expect(p4[0].copy![1]).toBe('Hello G2 Research,');
    expect(p4[1].steps.join(' ')).toContain(FILL);
    expect(p4.flatMap((s) => s.copy!).join(' ')).not.toMatch(/\brank|\blist us|include us|add us/i);
    expect(g.parts[3].outro).toEqual(['Mark each one in your Record when you send it, and again if the page is updated.']);
  });
  it('no outcome promise, no price figure, no cost anywhere in the guide', () => {
    const t = text(g).replace(NO_GUARANTEE, '');
    expect(t).not.toMatch(/will be recommended|will rank|\bimproves?\b|guarantee(d|s)? (that|you)/i);
    expect(t).not.toMatch(/\$\d|cost|fetch(es|ed)? count/i);
  });
});

describe('Record round trip', () => {
  it('a step marked done with a URL fills its tracking row on the next build; building marks nothing', () => {
    const before = buildGuide(base);
    const row0 = before.tracking.find((r) => r.where === 'G2')!;
    expect(row0).toMatchObject({ address: '', date: '', inRecord: 'No' });
    const actions = guideRecordActions(before);
    const g2 = actions.find((a) => a.key === 'guide:listing:g2')!;
    expect(g2.owner).toBe('Outreach');
    expect(before.parts[1].steps.find((s) => s.key === g2.key)!.title).toBe(g2.title); // same wording
    const record: RecordEntry[] = [{ domain: 'acmebooks.com', title: g2.title, owner_tag: 'Outreach', source: 'plan', action_key: g2.key, done_at: '2026-10-16', link: 'https://www.g2.com/products/acme-books' }];
    const frozen = JSON.stringify(record);
    const after = buildGuide({ ...base, record });
    expect(after.tracking.find((r) => r.where === 'G2')).toMatchObject({ address: 'https://www.g2.com/products/acme-books', date: 'October 16th', inRecord: 'Yes' });
    expect(JSON.stringify(record)).toBe(frozen);
    expect(buildGuide({ ...base, record: null }).tracking[0].inRecord).toBe('Record on Pro and Business');
  });
});

describe('Word file', () => {
  it('US Letter, Calibri, the parts, Done when lines and the tracking table — by paragraph text', async () => {
    const { default: JSZip } = await import('jszip');
    const z = await JSZip.loadAsync(await Packer.toBuffer(await buildGuideDocument(buildGuide(base))));
    const xml = await z.file('word/document.xml')!.async('string');
    const t = xml.split(/<w:p[ >]/).map((p) => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('')).join('\n');
    expect(xml).toContain('w:w="12240" w:h="15840"');
    expect(xml).toContain('Calibri');
    for (const s of ['Start here', 'Part 1, Your website (Site)', 'Part 4, The pages engines read (Outreach)', 'Done when:', 'Where to start:', 'Tracking table', 'Address once live', 'In your Record?']) expect(t).toContain(s);
    expect(xml).toContain('w:fill="EEF7F1"');
    expect(xml).toContain('w:fill="0B1F17"');
  });
});

describe('catalog, public pages and page bylines', () => {
  it('every catalog entry is verified or marked, with a date', () => {
    expect(CATALOG.verified_at).toMatch(/^\d{4}-\d\d-\d\d$/);
    for (const e of CATALOG.entries) { expect(e.last_verified).toMatch(/^\d{4}-\d\d-\d\d$/); expect(typeof e.verified).toBe('boolean'); expect(e.check_result).toBeTruthy(); expect(e.hosts.length).toBeGreaterThan(0); }
  });
  it('both public guides exist with HowTo data, a Word file, sitemap/llms entries and no prices', () => {
    const sm = readFileSync('public/sitemap.xml', 'utf8'), llms = readFileSync('public/llms.txt', 'utf8'), full = readFileSync('public/llms-full.txt', 'utf8');
    for (const slug of ['directory-listings', 'wikidata']) {
      const html = readFileSync(`public/guides/${slug}/index.html`, 'utf8');
      const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
      expect(ld['@type']).toBe('HowTo'); expect(ld.step.length).toBeGreaterThan(0);
      expect(html).toContain(`href="/guides/${slug}-guide.docx"`);
      expect(existsSync(`public/guides/${slug}-guide.docx`)).toBe(true);
      expect(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')).not.toMatch(/\$\d/);
      expect(sm).toContain(`https://aeoanalyzers.com/guides/${slug}</loc>`);
      expect(llms).toContain(`/guides/${slug}`); expect(full).toContain(`<!-- page:guides/${slug} -->`);
    }
    expect(readFileSync('public/guides/wikidata/index.html', 'utf8')).toContain('https://www.wikidata.org/wiki/Q141739225');
    const gr = readFileSync('public/get-recommended/index.html', 'utf8');
    expect(gr).toContain('href="/guides/directory-listings"'); expect(gr).toContain('href="/guides/wikidata"');
  });
  it('title and byline come only from what the page states', () => {
    expect(pageTitleAndByline('<title>Best tools &amp; more</title><meta name="author" content="Jane Doe">')).toEqual({ title: 'Best tools & more', byline: 'Jane Doe' });
    expect(pageTitleAndByline('<title>X</title><script type="application/ld+json">{"@type":"Article","author":{"name":"Sam Lee"}}</script>')).toEqual({ title: 'X', byline: 'Sam Lee' });
    expect(pageTitleAndByline('<title>X</title><meta name="author" content="https://x.com/someone">')).toEqual({ title: 'X' });
  });
});

describe('tier behavior, as rendered', () => {
  it('Free, Day Pass (score report and sweep), Pro/Business', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { GuidePanel } = await import('../components/GuidePanel');
    const build = async () => buildGuide(base);
    const r = (props: any) => renderToStaticMarkup(React.createElement(GuidePanel, { domain: 'acmebooks.com', build, ...props }));
    const free = r({ access: 'none' });
    expect(free).toContain('Your personalized guide is included on Pro and Business.');
    expect(free).toContain('href="/guides/directory-listings"'); expect(free).toContain('href="/guides/wikidata"');
    expect(free).not.toContain('Download your step-by-step guide');
    const dayPassScore = r({ access: 'none', dayPassNote: true });
    expect(dayPassScore).toContain('download it from your Citation Sweep report');
    const dayPassSweep = r({ access: 'sweep-only' });
    expect(dayPassSweep).toContain('Download your step-by-step guide (Word)');
    expect(dayPassSweep).toContain('The Record, which fills the guide');
    const pro = r({ access: 'full' });
    expect(pro).toContain('Download your step-by-step guide (Word)');
    expect(pro).not.toContain('Your Day Pass includes');
    for (const h of [free, dayPassScore, dayPassSweep, pro]) expect(h).not.toMatch(/\$\d/);
  });
});
