// WO-AEO-STEP-BY-STEP-GUIDES-014 E — the two free public guides, regenerated, never hand-edited:
//   /guides/directory-listings  (Part 2 of the personalized guide, generic)
//   /guides/wikidata            (Part 3, generic)
// Same Guide model as the personalized download (src/lib/stepGuide.ts), placeholders such as
// "Your company", our own entries as the worked examples (Wikidata Q141739225; for listings, only
// directories docs/identity/ENTITY-REGISTRY.md marks live — none yet, so the example is our own
// listing text), HowTo JSON-LD, a generic Word file each, sitemap + llms + llms-full entries.
// No prices, no product comparisons.
//   npx tsx scripts/build-guides.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Packer } from 'docx';
import { buildGuide, guideBodyHtml, GUIDE_CSS, usDate, CATALOG, type Guide, type GuidePart } from '../src/lib/stepGuide.js';
import { buildGuideDocument } from '../src/services/guideDocx.js';

const REVIEWED = CATALOG.verified_at;
const EV = readFileSync('public/evidence/index.html', 'utf8');
const CSS = EV.slice(EV.indexOf('<style>'), EV.indexOf('</style>') + 8);
const BAR = EV.slice(EV.indexOf('<body>'), EV.indexOf('<div class="wrap">'));
const FOOT = EV.slice(EV.indexOf('<footer class="sitefoot">'), EV.indexOf('</footer>') + 9);
const REG = readFileSync('docs/identity/ENTITY-REGISTRY.md', 'utf8');
const regLine = (k: string) => (REG.match(new RegExp(`^${k}: (.+)$`, 'm')) || [])[1] || '';
const liveListings = REG.split('## Listings')[1].split('## Canonical')[0].split('\n')
  .filter((l) => /^\| (AlternativeTo|Crunchbase|G2|Slashdot|LinkedIn)/.test(l) && /\| live \|/.test(l))
  .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean)).map((c) => ({ name: c[0], url: c[1] }));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PERSON = { '@type': 'Person', '@id': 'https://pigenai.com/#lindsay', name: 'Lindsay Hiebert' };
const ORG = { '@type': 'Organization', '@id': 'https://pigenai.com/#org', name: 'PIGENAI LLC', url: 'https://pigenai.com' };

const generic = buildGuide({ domain: 'yourcompany.com', date: `${REVIEWED}T12:00:00Z`, generic: true });

interface PageSpec { slug: string; title: string; h1: string; desc: string; partId: GuidePart['id']; lead: string; example: string; totalMinutes: number }
const listingMinutes = generic.parts.find((p) => p.id === 'listings')!.steps.reduce((a, s) => a + (s.minutes || 0), 0);
const PAGES: PageSpec[] = [
  {
    slug: 'directory-listings', partId: 'listings',
    title: 'How to list your business on directories, step by step',
    h1: 'How to list your business on directories, step by step',
    desc: 'Free step-by-step guide: one description pasted word for word on the directories answer engines read, with where to start and when each listing is done.',
    lead: 'Answer engines repeat what independent pages say about you. A directory listing is one of those pages, and it is one you can create yourself. This guide walks through each directory: where to start, what to have ready, what to paste, and how you know it is done.',
    example: liveListings.length
      ? `Our own listings, as a worked example: ${liveListings.map((l) => `<a class="ilink" href="${esc(l.url)}">${esc(l.name)}</a>`).join(', ')}. The text we paste on every one is below.`
      : 'Our own example: the text below is what we paste, word for word, on every directory we list AEO Analyzers on.',
    totalMinutes: listingMinutes,
  },
  {
    slug: 'wikidata', partId: 'wikidata',
    title: 'How to create your company\'s Wikidata entry, step by step',
    h1: 'How to create your company\'s Wikidata entry, step by step',
    desc: 'Free step-by-step guide to a Wikidata entry for your company and product: search first, create the item, add each statement with a source.',
    lead: 'Wikidata is a free, public database of facts that answer engines and search engines read. An entry for your company states who you are, with a source for each fact. This guide follows the steps we took for our own entries on October 15th, 2026.',
    example: 'Our own example: <a class="ilink" href="https://www.wikidata.org/wiki/Q141739225">AEO Analyzers (Q141739225)</a>, developed by <a class="ilink" href="https://www.wikidata.org/wiki/Q141739140">PIGENAI LLC (Q141739140)</a>. Every statement on both carries a reference.',
    totalMinutes: 30,
  },
];

function partGuide(p: PageSpec): Guide {
  const base = generic.parts.find((x) => x.id === p.partId)!;
  // Standalone page: no "Part 2", and no hand-off line that refers to the other parts.
  const part: GuidePart = { ...base, title: p.partId === 'listings' ? 'The listings, one by one' : 'Your Wikidata entry, step by step', intro: base.intro.filter((l) => !/^Hand Parts/.test(l)) };
  return { ...generic, title: p.h1, fileStem: `${p.slug}-guide`, startHere: [], order: [], parts: [part], tracking: generic.tracking.filter((r) => part.steps.some((s) => s.title === r.step)) };
}

function ourListingBox(): string {
  const lines = [`Name: AEO Analyzers`, `Company: PIGENAI LLC`, `Website: https://aeoanalyzers.com`, `Short: ${regLine('Short')}`, `Long: ${regLine('Long')}`, `Pricing: ${regLine('Pricing model')}`];
  return `<div class="guide"><div class="box"><p class="bt">Our own listing text</p>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div></div>`;
}

const llmsBlocks: string[] = [];
for (const p of PAGES) {
  const g = partGuide(p);
  const part = g.parts[0];
  const howTo = {
    '@context': 'https://schema.org', '@type': 'HowTo', name: p.title, description: p.desc,
    url: `https://aeoanalyzers.com/guides/${p.slug}`, totalTime: `PT${p.totalMinutes}M`, inLanguage: 'en-US',
    author: PERSON, publisher: ORG, dateModified: REVIEWED,
    step: part.steps.map((s, i) => ({ '@type': 'HowToSection', position: i + 1, name: s.title, itemListElement: s.steps.map((t, j) => ({ '@type': 'HowToStep', position: j + 1, text: t.replace(/\*\*/g, '') })) })),
  };
  const body = guideBodyHtml(g, { headings: false })
    .replace(/<h2>Start here<\/h2>[\s\S]*?<\/ol>\n/, ''); // the generic part pages have no Start here
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>${esc(p.title)} | AEO Analyzers</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://aeoanalyzers.com/guides/${p.slug}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="https://aeoanalyzers.com/guides/${p.slug}">
<meta property="og:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Lindsay_Hiebert">
<meta name="twitter:creator" content="@Lindsay_Hiebert">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
${JSON.stringify(howTo, null, 2)}
</script>
${CSS}
<style>${GUIDE_CSS}.guide{max-width:68ch}.guide h2{font-size:22px}.dl{display:inline-block;margin:6px 0 18px;padding:8px 14px;border:2px solid #0f172a;border-radius:10px;font-weight:700;color:#0f172a;text-decoration:none}</style>
</head>
${BAR}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">AEO Analyzers &middot; Free step-by-step guide</div>
    <h1 class="posttitle">${esc(p.h1)}</h1>
    <p class="postmeta">Sign-up pages checked ${usDate(REVIEWED)}</p>
    <div class="postbody">
      <p class="postlead">${esc(p.lead)}</p>
      <p>${p.example}</p>
      ${p.slug === 'directory-listings' ? ourListingBox() : ''}
      <p><a class="dl" href="/guides/${p.slug}-guide.docx" download>Download this guide (Word)</a></p>
      <p>No method can guarantee that an engine will recommend you. These are steps that put you where engines look. Customers on Pro and Business get this guide filled in with their own facts, the directories engines cite for their category, and a tracking table their Record fills in.</p>
      ${body}
      <p>The other free guide: ${p.slug === 'wikidata' ? '<a class="ilink" href="/guides/directory-listings">directory listings, step by step</a>' : '<a class="ilink" href="/guides/wikidata">your Wikidata entry, step by step</a>'}. How the steps fit together: <a class="ilink" href="/get-recommended">How AI engines choose who to recommend</a>.</p>
    </div>
  </article>
</div>
${FOOT}
</body>
</html>
`;
  mkdirSync(`public/guides/${p.slug}`, { recursive: true });
  writeFileSync(`public/guides/${p.slug}/index.html`, html);
  writeFileSync(`public/guides/${p.slug}-guide.docx`, await Packer.toBuffer(await buildGuideDocument(g)));
  console.log(`  wrote public/guides/${p.slug}/index.html and ${p.slug}-guide.docx`);

  const plain = part.steps.map((s, i) => `${i + 1}. ${s.title}\n${s.whereToStart ? `Where to start: ${s.whereToStart}\n` : ''}${s.steps.map((t, j) => `   ${j + 1}. ${t.replace(/\*\*/g, '')}`).join('\n')}\nDone when: ${s.doneWhen}`).join('\n\n');
  llmsBlocks.push(`<!-- page:guides/${p.slug} -->\n## ${p.title}\nURL: https://aeoanalyzers.com/guides/${p.slug}\n\n${p.lead}\n\n${plain}\n<!-- /page:guides/${p.slug} -->`);

  let sm = readFileSync('public/sitemap.xml', 'utf8');
  const loc = `https://aeoanalyzers.com/guides/${p.slug}`;
  sm = sm.includes(`<loc>${loc}</loc>`)
    ? sm.replace(new RegExp(`(<loc>${loc.replace(/[.]/g, '\\.')}</loc>\\s*<lastmod>)\\d{4}-\\d\\d-\\d\\d`), `$1${REVIEWED}`)
    : sm.replace('</urlset>', `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${REVIEWED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>`);
  writeFileSync('public/sitemap.xml', sm);
}

let lf = readFileSync('public/llms-full.txt', 'utf8');
for (const b of llmsBlocks) {
  const id = b.match(/<!-- page:([^ ]+) -->/)![1];
  const rx = new RegExp(`<!-- page:${id.replace('/', '\\/')} -->[\\s\\S]*?<!-- \\/page:${id.replace('/', '\\/')} -->`);
  lf = rx.test(lf) ? lf.replace(rx, () => b) : `${lf.replace(/\n+$/, '')}\n\n${b}\n`;
}
writeFileSync('public/llms-full.txt', lf);
let lt = readFileSync('public/llms.txt', 'utf8');
for (const p of PAGES) {
  const line = `- ${p.title} (free guide): https://aeoanalyzers.com/guides/${p.slug}\n`;
  if (!lt.includes(`/guides/${p.slug}`)) lt = lt.replace(/(- How AI engines choose who to recommend[^\n]*\n)/, `$1${line}`);
}
writeFileSync('public/llms.txt', lt);
console.log('  sitemap, llms.txt and llms-full.txt: both guides present');
