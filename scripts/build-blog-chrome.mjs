// WO-AEO-BLOG-HOWTO-IMAGES-NAV-016 — site chrome, images and navigation for every blog, how-to,
// guide and ledger page, plus the sectioned blog index and the /blog/how-to landing page.
//
// Source of truth: docs/images/blog-pages-2026-11.json (pages, sections, figure placement),
// docs/images/blog-art-2026-11.json (hero + share card per page, from the art step) and
// docs/images/blog-figures-2026-11.json (code-built figures). Idempotent: every injected block
// sits between <!--wo016:NAME--> markers and is replaced on each run, so a page generator that
// rewrites a page (build-evidence.py, build-content-pages.py, ...) cannot leave it stale.
// Runs before `vite build` (package.json "build"); also safe to run by hand.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const SITE = 'https://aeoanalyzers.com';
const load = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);
const PLAN = load('docs/images/blog-pages-2026-11.json', null);
const ART = load('docs/images/blog-art-2026-11.json', {});
const FIG = load('docs/images/blog-figures-2026-11.json', {});
if (!PLAN) throw new Error('docs/images/blog-pages-2026-11.json is missing');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', middot: '·', rarr: '→', nbsp: ' ', hellip: '…' };
const unescape = (s) => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => unescape(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const MARK = '<svg aria-hidden="true" width="27" height="27" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#18181B"/><g transform="translate(8 8)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v2M12 2v2M17 20v2M17 2v2M2 12h2M2 17h2M2 7h2M20 12h2M20 17h2M20 7h2M7 20v2M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/></g></svg>';

// The app's nav, as links (WO-016 A). /analyzer, /sweeps and /history are app views; a guest who
// follows one gets the free checker or the sign-in page (App.tsx).
const NAV = [
  ['Why AEO?', '/'], ['Free AEO Checker', '/aeo-checker'], ['Analyzer', '/analyzer'], ['Sweeps', '/sweeps'],
  ['History', '/history'], ['Pricing', '/pricing'],
];
const RESOURCES = [['User guide', '/guide'], ['How to guides', '/blog/how-to']];
const navLinks = (cur) => NAV.map(([t, h]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('');
const HEADER = (cur) => `<!--wo016:header--><header class="sitebar wo">
  <a class="brand" href="/">${MARK}<span>AEO Analyzers</span></a>
  <nav class="mainnav" aria-label="Main">${navLinks(cur)}<details class="res"><summary>Resources</summary><div class="resmenu">${RESOURCES.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div></details><a href="/blog/"${cur.startsWith('/blog') ? ' aria-current="page"' : ''}>Blog</a></nav>
  <a class="startfree" href="/aeo-checker">Start free →</a>
  <details class="mnav"><summary aria-label="Menu">Menu</summary><div class="mmenu">${navLinks(cur)}${RESOURCES.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}<a href="/blog/">Blog</a></div></details>
</header><!--/wo016:header-->`;

const CSS = `/*wo016*/
.sitebar.wo{display:flex;align-items:center;gap:14px;flex-wrap:nowrap}
.sitebar.wo .brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px;color:var(--ink);text-decoration:none;flex:none}
.sitebar.wo .mainnav{display:flex;align-items:center;gap:2px;margin-left:auto}
.sitebar.wo .mainnav>a,.sitebar.wo .res>summary{color:#2A333B;text-decoration:none;font-size:13.5px;font-weight:650;padding:8px 10px;border-radius:9px;cursor:pointer;list-style:none;white-space:nowrap}
.sitebar.wo .res>summary::-webkit-details-marker{display:none}
.sitebar.wo .mainnav>a:hover,.sitebar.wo .res>summary:hover{color:var(--ink);background:var(--panel)}
.sitebar.wo .mainnav>a[aria-current]{color:var(--ink);background:var(--panel)}
.sitebar.wo .res{position:relative}
.sitebar.wo .resmenu{position:absolute;top:110%;left:0;background:var(--card);border:1px solid var(--edge);border-radius:12px;box-shadow:var(--card-shadow);padding:6px;min-width:180px;z-index:40}
.sitebar.wo .resmenu a,.sitebar.wo .mmenu a{display:block;color:var(--ink);text-decoration:none;font-size:14px;font-weight:600;padding:9px 12px;border-radius:8px}
.sitebar.wo .resmenu a:hover,.sitebar.wo .mmenu a:hover{background:var(--panel)}
.sitebar.wo .startfree{flex:none;background:var(--teal-deep);color:#EAF4F5;text-decoration:none;font-weight:700;font-size:14px;padding:8px 13px;border-radius:9px}
.sitebar.wo .mnav{display:none;position:relative}
.sitebar.wo .mnav>summary{list-style:none;cursor:pointer;font-weight:700;font-size:14px;color:var(--ink);padding:8px 12px;border:1px solid var(--edge);border-radius:9px}
.sitebar.wo .mnav>summary::-webkit-details-marker{display:none}
.sitebar.wo .mmenu{position:absolute;right:0;top:115%;background:var(--card);border:1px solid var(--edge);border-radius:12px;box-shadow:var(--card-shadow);padding:6px;min-width:220px;z-index:40}
@media(max-width:1020px){.sitebar.wo .mainnav{display:none}.sitebar.wo .mnav{display:block;margin-left:auto}}
@media(max-width:420px){.sitebar.wo .startfree{display:none}}
.crumbs{font-size:13.5px;color:#2A333B;margin:6px 0 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.crumbs a{color:#0B5560;text-decoration:underline;text-underline-offset:2px}
.crumbs span[aria-current]{color:var(--ink);font-weight:600}
.backlink{display:inline-block;font-size:14px;font-weight:650;color:#0B5560;text-decoration:none;margin:0 0 12px}
.backlink:hover{text-decoration:underline}
.posthero{margin:16px 0 22px}
.posthero img,.postfig img{width:100%;height:auto;display:block;border-radius:14px;background:#0A0F1C}
.postfig{margin:22px 0 26px}
.postfig figcaption{font-size:14px;color:#2A333B;margin-top:9px;line-height:1.5;max-width:70ch}
.postend{margin:34px 0 0;padding:22px 0 0;border-top:1px solid var(--edge)}
.prevnext{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0 22px}
.prevnext a{display:block;border:1px solid var(--edge);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--ink);background:var(--card)}
.prevnext a small{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2A333B;margin-bottom:4px}
.prevnext .next{text-align:right;grid-column:2}
.morein h2{font-size:17px;margin:0 0 10px}
.morein ul{list-style:none;padding:0;margin:0 0 18px;display:grid;gap:8px}
.morein a{color:#0B5560;font-weight:600}
@media(max-width:620px){.prevnext{grid-template-columns:1fr}.prevnext .next{grid-column:1;text-align:left}}
/*/wo016*/`;

function setHeader(h, cur) {
  const marked = /<!--wo016:header-->[\s\S]*?<!--\/wo016:header-->/;
  return marked.test(h) ? h.replace(marked, HEADER(cur)) : h.replace(/<header class="sitebar[^"]*">[\s\S]*?<\/header>/, HEADER(cur));
}
function block(name, html) { return `<!--wo016:${name}-->${html}<!--/wo016:${name}-->`; }
function clear(h) {
  // The header is replaced in place (setHeader), never cleared: clearing it would leave no anchor.
  return h.replace(/<!--wo016:(?!header)([a-z0-9-]+)-->[\s\S]*?<!--\/wo016:\1-->/g, '').replace(/\/\*wo016\*\/[\s\S]*?\/\*\/wo016\*\/\n?/g, '');
}

const pages = PLAN.pages;
const bySection = (sec) => pages.filter((p) => p.section === sec && p.path !== '/blog/how-to');
const sectionUrl = (sec) => (sec === 'How to' ? '/blog/how-to' : `/blog/#${slugify(sec)}`);

function pageInfo(p) {
  const f = `public${p.path}/index.html`;
  if (!existsSync(f)) return null;
  const h = readFileSync(f, 'utf8');
  const h1 = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || p.path;
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const date = (h.match(/"datePublished":\s*"([^"]+)"/) || [])[1] || null;
  const read = (h.match(/(\d+)-minute read/) || [])[1] || null;
  return { f, h, title: strip(h1), titleHtml: h1.trim(), desc: unescape(desc), date, read };
}

function figureHtml(fig) {
  if (!fig) return '';
  return `<figure class="postfig"><img src="${fig.file}" alt="${esc(fig.alt)}" width="${fig.w}" height="${fig.h}" loading="lazy" decoding="async"><figcaption>${esc(fig.caption)}</figcaption></figure>`;
}

function setMeta(h, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content="[^"]*">`);
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  return re.test(h) ? h.replace(re, tag) : h.replace('</head>', `${tag}\n</head>`);
}

let changed = 0;
for (const p of pages) {
  if (p.path === '/blog/how-to') continue;
  const info = pageInfo(p);
  if (!info) { console.log(`  skip ${p.path}: no page`); continue; }
  let h = clear(info.h);
  const art = ART[p.path];

  // A. header (replaces whatever site bar the chassis had)
  h = setHeader(h, p.path.startsWith('/blog') ? '/blog/' : p.path);
  if (!h.includes('<!--wo016:header-->')) throw new Error(`${p.path}: no site bar to replace`);
  h = h.replace('</style>', `${CSS}\n</style>`);

  // breadcrumb + back link above the eyebrow/title
  const crumbs = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/blog/">Blog</a><span aria-hidden="true">›</span><a href="${sectionUrl(p.section)}">${esc(p.section)}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(info.title)}</span></nav><a class="backlink" href="/blog/">← Back to the blog</a>`;
  const eyebrowAt = h.indexOf('<div class="posteyebrow">');
  const h1At = h.indexOf('<h1');
  const at = eyebrowAt > -1 && eyebrowAt < h1At ? eyebrowAt : h1At;
  h = h.slice(0, at) + block('crumbs', crumbs) + h.slice(at);
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' },
    { '@type': 'ListItem', position: 3, name: p.section, item: SITE + sectionUrl(p.section) },
    { '@type': 'ListItem', position: 4, name: info.title, item: SITE + p.path },
  ] };
  h = h.replace('</head>', block('breadcrumb-ld', `<script type="application/ld+json">${JSON.stringify(ld)}</script>`) + '</head>');

  // D1. hero under the title
  if (art) {
    // The buyer pages' old heroes were model-rendered with words in the pixels (WO-016 D3 forbids it).
    h = h.replace(/\s*<img class="posthero"[^>]*>/g, '');
    const hero = `<figure class="posthero"><img src="${art.hero}" alt="${esc(art.heroAlt)}" width="${art.heroW}" height="${art.heroH}" fetchpriority="high" decoding="async"></figure>`;
    const end = h.indexOf('</h1>') + 5;
    h = h.slice(0, end) + block('hero', hero) + h.slice(end);
    // D2. share card
    h = setMeta(h, 'property', 'og:image', SITE + art.og);
    h = setMeta(h, 'property', 'og:image:type', 'image/jpeg');
    h = setMeta(h, 'property', 'og:image:width', String(art.ogW));
    h = setMeta(h, 'property', 'og:image:height', String(art.ogH));
    h = setMeta(h, 'property', 'og:image:alt', art.ogAlt);
    h = setMeta(h, 'name', 'twitter:image', SITE + art.og);
    h = setMeta(h, 'name', 'twitter:image:alt', art.ogAlt);
    h = setMeta(h, 'name', 'twitter:card', 'summary_large_image');
  }

  // D3. embedded figures, directly under the section they explain
  for (const fg of p.figures || []) {
    if (fg.kind === 'existing') {
      if (!fg.file.startsWith('/')) continue; // "keep the page's current panel image"
      if (fg.alt) { h = insertFigure(h, fg.under, block(`fig-${fg.id}`, figureHtml({ file: fg.file, w: fg.w, h: fg.h, alt: fg.alt, caption: fg.caption }))); continue; }
      if (h.includes(`src="${fg.file}"`)) continue;
      const fig = { file: fg.file, w: 1672, h: 941, alt: '', caption: '' };
      const src = readFileSync('public/blog/how-it-works/index.html', 'utf8').match(new RegExp(`<img src="${fg.file.replace(/[.]/g, '\\.')}"[^>]*>`));
      const alt = src && (src[0].match(/alt="([^"]*)"/) || [])[1];
      const wh = src && [(src[0].match(/width="(\d+)"/) || [])[1], (src[0].match(/height="(\d+)"/) || [])[1]];
      Object.assign(fig, { alt: alt ? unescape(alt) : 'Explanatory diagram from the How AEO Analyzers works tour.', w: wh?.[0] || 1672, h: wh?.[1] || 941, caption: 'From the illustrated tour of how AEO Analyzers measures.' });
      h = insertFigure(h, fg.under, block(`fig-${fg.id}`, figureHtml(fig)));
      continue;
    }
    const fig = FIG[fg.id];
    if (!fig) continue;
    if (fg.under.startsWith('replace ')) {
      const which = fg.under.slice(8); // visual-1 | visual-2
      const re = new RegExp(`<img src="/blog/how-it-works/${which}-[a-z-]+\\.(png|webp)"[^>]*>`);
      const tag = `<img src="${fig.file}" alt="${esc(fig.alt)}" width="${fig.w}" height="${fig.h}" loading="lazy" decoding="async">`;
      if (re.test(h)) h = h.replace(re, tag);
      continue;
    }
    h = insertFigure(h, fg.under, block(`fig-${fg.id}`, figureHtml(fig)));
  }

  // A. end of article: back link, previous / next in the section, more in the section
  const sib = bySection(p.section);
  const i = sib.findIndex((x) => x.path === p.path);
  const prev = i > 0 ? sib[i - 1] : null;
  const next = i > -1 && i < sib.length - 1 ? sib[i + 1] : null;
  const t = (x) => esc(pageInfo(x)?.title || x.path);
  const more = sib.filter((x) => x.path !== p.path).slice(0, 3);
  const end = `<div class="postend"><a class="backlink" href="/blog/">← Back to the blog</a>
      <nav class="prevnext" aria-label="More in ${esc(p.section)}">${prev ? `<a class="prev" href="${prev.path}"><small>← Previous in ${esc(p.section)}</small>${t(prev)}</a>` : ''}${next ? `<a class="next" href="${next.path}"><small>Next in ${esc(p.section)} →</small>${t(next)}</a>` : ''}</nav>
      ${more.length ? `<div class="morein"><h2>More in ${esc(p.section)}</h2><ul>${more.map((x) => `<li><a href="${x.path}">${t(x)}</a></li>`).join('')}</ul></div>` : ''}</div>`;
  const art_end = h.lastIndexOf('</article>');
  h = h.slice(0, art_end) + block('end', end) + h.slice(art_end);

  if (h !== info.h) { writeFileSync(info.f, h); changed++; }
}

function insertFigure(h, under, html) {
  if (under === 'lead') {
    const h1 = h.indexOf('</h1>');
    const lead = h.indexOf('</p>', h.indexOf('<p', h1));
    return lead > -1 ? h.slice(0, lead + 4) + html + h.slice(lead + 4) : h;
  }
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/g; let m;
  while ((m = re.exec(h))) {
    if (strip(m[1]) === under) return h.slice(0, m.index + m[0].length) + html + h.slice(m.index + m[0].length);
  }
  throw new Error(`figure anchor not found: "${under}"`);
}

// B. the sectioned blog index (cards between markers; the hero and ledger strip stay)
const INDEX = 'public/blog/index.html';
let idx = clear(readFileSync(INDEX, 'utf8'));
const card = (p) => {
  const info = pageInfo(p); if (!info) return '';
  const art = ART[p.path];
  const thumb = art ? `<img class="thumb" src="${art.og}" alt="" width="600" height="315" loading="lazy" decoding="async">` : '';
  const meta = [info.date ? new Date(info.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null, info.read ? `${info.read}-minute read` : null].filter(Boolean).join(' &middot; ');
  // Pages with no publish date are not feed items: the feed builder reads only class="postcard".
  return `    <article class="${info.date ? 'postcard' : 'postcard nofeed'}">
      ${thumb}
      <h2><a href="${p.path}">${info.titleHtml}</a></h2>
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      <p style="margin-top:10px">${esc(info.desc)}</p>
      <a class="more" href="${p.path}">Read the piece &rarr;</a>
    </article>`;
};
const sections = PLAN.sections.map((sec) => {
  const intro = sec === 'How to' ? `<p class="secintro">Step-by-step and answer-first pages. All of them on one page: <a href="/blog/how-to">How to guides</a>.</p>` : '';
  return `  <section class="blogsec" id="${slugify(sec)}">\n    <h2 class="sech">${esc(sec)}</h2>\n    ${intro}\n    <div class="posts">\n${bySection(sec).map(card).join('\n')}\n    </div>\n  </section>`;
}).join('\n');
const IDX_CSS = `/*wo016*/
.blogsec{margin:34px 0 10px}.sech{font-size:22px;margin:0 0 12px;color:var(--ink)}.secintro{margin:0 0 12px;color:#2A333B}
.postcard .thumb{width:100%;height:auto;border-radius:10px;display:block;margin:0 0 12px;background:#0A0F1C}
.blogsec .posts,.post .posts{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;align-items:start}
.blogsec .postcard,.post .postcard{margin:0}
.blogsec .postcard h2,.post .postcard h2{font-size:19px;line-height:1.3}
/*/wo016*/`;
// First run: replace the old flat card list with a persistent anchor. Every run: drop any ledger
// strip left at the top level (build-evidence.py used to put it there) and insert the sections
// after the anchor. The strip itself comes from docs/ledger-strip.html (written by build-evidence.py).
idx = idx.replace(/\n  <div class="ledgerstrip">[\s\S]*?\n  <\/div>\n/, '\n');
if (!idx.includes('<!--wo016-anchor-->')) {
  const start = idx.indexOf('  <div class="posts">');
  if (start < 0) throw new Error('blog index: no card list and no anchor');
  const re = /<div\b|<\/div>/g; re.lastIndex = start; let depth = 0, endAt = -1, m;
  while ((m = re.exec(idx))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) { endAt = m.index + 6; break; } }
  idx = idx.slice(0, start) + '<!--wo016-anchor-->' + idx.slice(endAt);
}
const STRIP = existsSync('docs/ledger-strip.html') ? readFileSync('docs/ledger-strip.html', 'utf8') : '';
const sectionsHtml = sections.replace(/(<section class="blogsec" id="the-honest-zero-ledger">\n    <h2 class="sech">[^<]*<\/h2>\n)/, `$1${STRIP}`);
idx = idx.replace('<!--wo016-anchor-->', '<!--wo016-anchor-->' + block('sections', '\n' + sectionsHtml + '\n'));
idx = setHeader(idx, '/blog/');
idx = idx.replace('</style>', `${CSS}\n${IDX_CSS}\n</style>`);
writeFileSync(INDEX, idx);

// /blog/how-to landing: the How to section on its own, on the same chassis.
const howto = pages.find((p) => p.path === '/blog/how-to');
const chassis = readFileSync('public/blog/why-ai-doesnt-mention-you/index.html', 'utf8');
const css0 = chassis.slice(chassis.indexOf('<style>'), chassis.indexOf('</style>') + 8).replace('</style>', `${CSS}\n${IDX_CSS}\n</style>`);
const tail0 = chassis.slice(chassis.indexOf('    <p class="samplenote">'));
const howArt = ART['/blog/how-to'];
const desc = 'Step-by-step and answer-first guides: monitor your brand in ChatGPT and Claude, track mentions across AI answer engines, and check answer engine readiness.';
const ldH = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'CollectionPage', '@id': SITE + '/blog/how-to', url: SITE + '/blog/how-to', name: 'How to guides', description: desc, isPartOf: { '@id': SITE + '/#website' }, publisher: { '@id': 'https://pigenai.com/#org' } },
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' }, { '@type': 'ListItem', position: 3, name: 'How to', item: SITE + '/blog/how-to' }] },
] };
const og = howArt ? SITE + howArt.og : SITE + '/og-home-2026-11.jpg';
const ogAlt = howArt ? howArt.ogAlt : 'AEO Analyzers: How to guides.';
const htmlHowto = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>How to Guides: AI Answer Engine Visibility | AEO Analyzers</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${SITE}/blog/how-to">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="How to guides">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/blog/how-to">
<meta property="og:image" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">
<meta name="twitter:image:alt" content="${esc(ogAlt)}">
<script type="application/ld+json">${JSON.stringify(ldH)}</script>
${css0}
</head>
<body>
${HEADER('/blog/')}
<div class="wrap">
  <article class="post">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/blog/">Blog</a><span aria-hidden="true">›</span><span aria-current="page">How to</span></nav>
    <a class="backlink" href="/blog/">← Back to the blog</a>
    <div class="posteyebrow">AEO Analyzers &middot; How to</div>
    <h1 class="posttitle">How to guides</h1>
    ${howArt ? `<figure class="posthero"><img src="${howArt.hero}" alt="${esc(howArt.heroAlt)}" width="${howArt.heroW}" height="${howArt.heroH}" fetchpriority="high" decoding="async"></figure>` : ''}
    <div class="postbody"><p class="postlead">${esc(desc)} Every page answers the question first, then shows the method, with our own measurements as the worked example.</p></div>
    <div class="posts">
${bySection('How to').map(card).join('\n').replace(/class="postcard"/g, 'class="postcard nofeed"')}
    </div>
    <div class="postend"><a class="backlink" href="/blog/">← Back to the blog</a></div>
  </article>
${tail0}`;
mkdirSync('public/blog/how-to', { recursive: true });
writeFileSync('public/blog/how-to/index.html', htmlHowto);
console.log(`[wo016] chrome on ${changed} pages; blog index sectioned; /blog/how-to written`);

// WO-016 report 4: image sitemap. Each plan page's <url> lists its hero and figures; the urlset
// declares the image namespace. Idempotent (image entries are regenerated from the manifests).
{
  const SM = 'public/sitemap.xml';
  let sm = readFileSync(SM, 'utf8');
  if (!sm.includes('xmlns:image=')) sm = sm.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  sm = sm.replace(/\n?<image:image>[\s\S]*?<\/image:image>/g, '');
  for (const p of pages) {
    const imgs = [];
    if (ART[p.path]) imgs.push(ART[p.path].hero);
    for (const fg of p.figures || []) { if (fg.kind === 'code' && FIG[fg.id] && !fg.under.startsWith('replace ')) imgs.push(FIG[fg.id].file); else if (fg.kind === 'existing' && fg.alt) imgs.push(fg.file); }
    if (!imgs.length) continue;
    const loc = SITE + p.path;
    if (!sm.includes(`<loc>${loc}</loc>`)) {
      sm = sm.replace('</urlset>', `<url>\n<loc>${loc}</loc>\n<lastmod>2026-11-01</lastmod>\n<changefreq>monthly</changefreq>\n<priority>0.7</priority>\n</url>\n</urlset>`);
    }
    const tags = [...new Set(imgs)].map((u) => `\n<image:image><image:loc>${SITE}${u}</image:loc></image:image>`).join('');
    sm = sm.replace(new RegExp(`(<loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>)`), `$1${tags}`);
  }
  writeFileSync(SM, sm);
}
