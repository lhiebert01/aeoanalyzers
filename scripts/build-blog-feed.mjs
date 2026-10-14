// WO-AEO-BLOG-SITE-DISTRIBUTION-009 B — RSS 2.0 feed for the blog, built from the blog index.
//
// Source of truth: the cards on public/blog/index.html (every piece the index lists). For each
// card it reads the page's own published date, meta description, author and OG image, then
// writes public/blog/feed.xml newest first. It also makes sure the blog index and every listed
// page advertise the feed in <head> (idempotent), so a page generator that rewrites a page
// cannot silently drop the tag. Runs before `vite build`, which copies public/ into dist/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://aeoanalyzers.com';
const FEED = `${SITE}/blog/feed.xml`;
const TAG = `<link rel="alternate" type="application/rss+xml" title="AEO Analyzers Blog" href="${FEED}">`;
const INDEX = 'public/blog/index.html';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', middot: '·', rarr: '→', nbsp: ' ', hellip: '…' };
const unescape = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const meta = (h, re) => { const m = h.match(re); return m ? unescape(m[1]) : null; };

function ensureTag(path) {
  const h = readFileSync(path, 'utf8');
  if (h.includes('type="application/rss+xml"')) return false;
  if (!h.includes('</head>')) throw new Error(`${path}: no </head>`);
  writeFileSync(path, h.replace('</head>', `${TAG}\n</head>`));
  return true;
}

const index = readFileSync(INDEX, 'utf8');
const cards = [...index.matchAll(/<article class="postcard">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
if (!cards.length) throw new Error('blog index has no cards');

const items = [];
for (const c of cards) {
  const a = c.match(/<h2><a href="([^"]+)">([\s\S]*?)<\/a>/);
  if (!a) throw new Error('card without a title link');
  const path = a[1];
  const file = `public${path.replace(/\/$/, '')}/index.html`;
  if (!existsSync(file)) throw new Error(`card links to ${path} but ${file} does not exist`);
  const h = readFileSync(file, 'utf8');
  const date = meta(h, /"datePublished":\s*"([^"]+)"/);
  const desc = meta(h, /<meta name="description" content="([^"]*)"/);
  const image = meta(h, /<meta property="og:image" content="([^"]+)"/);
  const author = meta(h, /"author":\s*\{[^}]*?"name":\s*"([^"]+)"/) || 'Lindsay Hiebert';
  if (!date || !desc || !image) throw new Error(`${file}: missing date, description or og:image`);
  const title = unescape(a[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  items.push({ title, link: SITE + path, date, desc, image, author });
  if (ensureTag(file)) console.log(`  feed link added to ${file}`);
}
if (ensureTag(INDEX)) console.log(`  feed link added to ${INDEX}`);

items.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
const rfc822 = (d) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toUTCString();
const imgType = (u) => (/\.jpe?g$/i.test(u) ? 'image/jpeg' : /\.webp$/i.test(u) ? 'image/webp' : 'image/png');

const out = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>AEO Analyzers Blog</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${FEED}" rel="self" type="application/rss+xml"/>
    <description>Short, grounded pieces on why AI assistants cite some sites and not others, with our own measurements published whatever they say.</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>
${items.map((i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="true">${xml(i.link)}</guid>
      <pubDate>${rfc822(i.date)}</pubDate>
      <dc:creator>${xml(i.author)}</dc:creator>
      <description>${xml(i.desc)}</description>
      <media:content url="${xml(i.image)}" medium="image" type="${imgType(i.image)}"/>
    </item>`).join('\n')}
  </channel>
</rss>
`;
writeFileSync('public/blog/feed.xml', out);
console.log(`  wrote public/blog/feed.xml (${items.length} items, newest ${items[0].date})`);
