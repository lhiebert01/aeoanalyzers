# -*- coding: utf-8 -*-
"""Build /get-recommended (WO-AEO-REPORT-SOURCE-COVERAGE-012 H).

Regenerated, never hand-edited, from docs/page-src/get-recommended.md: the founder's page, word for
word, less one sentence ("Our AEO Score is 90."), the only figure not on /evidence. The remaining
figures (30 of 40 and 0 of 200 on October 13th, four engines) are the 13 October row on /evidence.
The E4 positioning sentence sits under the opening paragraph (WO-012 Addendum E4). FAQPage JSON-LD
carries the three questions. Same chassis as /evidence, /methodology and /about.

Run: python3 scripts/build-get-recommended.py   (then the sitemap, llms.txt and llms-full entries
are kept in step by this script; send IndexNow after deploy).
"""
import html, json, re, os

SRC = 'docs/page-src/get-recommended.md'
SLUG = 'get-recommended'
REVIEWED = '2026-10-15'
E4 = ('AEO Analyzers is built for marketing teams and agencies that need to show their work: every answer '
      'stored, being found by name kept separate from being recommended, the engine panel named on every '
      'result, and a dated record of what changed between measurements.')
DROPPED = 'Our AEO Score is 90.'
PERSON = {"@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert"}
ORG = {"@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC", "url": "https://pigenai.com"}

EV = open('public/evidence/index.html', encoding='utf-8').read()
CSS = EV[EV.index('<style>'):EV.index('</style>') + 8]
BAR = EV[EV.index('<body>'):EV.index('<div class="wrap">')]
FOOT = EV[EV.index('<footer class="sitefoot">'):EV.index('</footer>') + 9]

raw = open(SRC, encoding='utf-8').read()
assert DROPPED not in raw, 'the dropped figure is back in the source'
fm, body = re.match(r'^---\n(.*?)\n---\n(.*)$', raw, re.S).groups()
meta = dict((k.strip(), v.strip().strip('"')) for k, v in (l.split(':', 1) for l in fm.splitlines() if ':' in l))
TITLE = meta['title']
# The founder's description runs 197 characters; the site's SERP rule is 50-160. Its first sentence
# plus the page's own three-step line, both verbatim from the page, fit.
DESC = meta['description'].split('. ')[0] + '. Measure. Act. Record.'
assert DESC.startswith('When buyers ask an AI engine for a recommendation') and 50 <= len(DESC) <= 160, len(DESC)


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(https://aeoanalyzers\.com(/[\w\-/]*)?)', lambda m: f'<a class="ilink" href="{m.group(2) or "/"}">{m.group(1)}</a>', t)
    return t


# Markdown (the subset the page uses) → HTML; collect the Questions section for FAQPage.
out, faq, lst, para_n, in_q = [], [], [], 0, False
blocks = [b.strip('\n') for b in re.split(r'\n\s*\n', body.strip())]
h1 = None
for b in blocks:
    if b.startswith('# '):
        h1 = b[2:].strip(); continue
    if b.startswith('## '):
        head = b[3:].strip(); in_q = head == 'Questions'
        out.append(f'      <h2 class="posth2">{inline(head)}</h2>'); continue
    if all(l.startswith('- ') for l in b.splitlines()):
        items = ''.join(f'\n        <li>{inline(l[2:])}</li>' for l in b.splitlines())
        out.append(f'      <ul>{items}\n      </ul>'); continue
    if in_q:
        q, a = b.split('\n', 1)
        q = q.strip().strip('*').strip()
        faq.append((q, a.strip()))
        out.append(f'      <h3 class="posth3">{inline(q)}</h3>\n      <p>{inline(a.strip())}</p>'); continue
    para_n += 1
    cls = ' class="postlead"' if para_n == 1 else ''
    out.append(f'      <p{cls}>{inline(b)}</p>')
    if para_n == 1:
        out.append(f'      <p>{html.escape(E4, quote=False)}</p>')

assert h1 == TITLE and len(faq) == 3, (h1, len(faq))
BODY = '\n'.join(out)
assert BODY.count(html.escape(E4, quote=False)) == 1

ld = [
    {"@context": "https://schema.org", "@type": "Article", "headline": TITLE, "description": DESC,
     "url": f"https://aeoanalyzers.com/{SLUG}", "dateModified": REVIEWED, "author": PERSON, "publisher": ORG,
     "isPartOf": {"@type": "WebSite", "@id": "https://aeoanalyzers.com/#website", "url": "https://aeoanalyzers.com"}},
    {"@context": "https://schema.org", "@type": "FAQPage", "url": f"https://aeoanalyzers.com/{SLUG}",
     "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
]
esc = lambda s: html.escape(s, quote=True)
SHORT = 'How AI engines choose who to recommend'
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{esc(SHORT)} | AEO Analyzers</title>
<meta name="description" content="{esc(DESC)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://aeoanalyzers.com/{SLUG}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{esc(TITLE)}">
<meta property="og:description" content="{esc(DESC)}">
<meta property="og:url" content="https://aeoanalyzers.com/{SLUG}">
<meta property="og:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Lindsay_Hiebert">
<meta name="twitter:creator" content="@Lindsay_Hiebert">
<meta name="twitter:title" content="{esc(TITLE)}">
<meta name="twitter:description" content="{esc(DESC)}">
<meta name="twitter:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="theme-color" content="#08343B">
{''.join(f'<script type="application/ld+json">{chr(10)}{json.dumps(x, indent=2, ensure_ascii=False)}{chr(10)}</script>{chr(10)}' for x in ld)}{CSS}
<style>.postbody ul{{max-width:68ch;margin:0 0 16px;padding-left:22px}}.postbody li{{font-size:17px;margin:0 0 8px;color:var(--ink)}}.postbody .posth3{{font-size:18px;font-weight:700;margin:22px 0 6px;color:var(--ink)}}</style>
</head>
{BAR}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">AEO Analyzers &middot; Measure. Act. Record.</div>
    <h1 class="posttitle">{inline(TITLE)}</h1>
    <p class="postmeta">Last reviewed {REVIEWED}</p>
    <div class="postbody">
{BODY}
    </div>
  </article>
</div>
{FOOT}
</body>
</html>
"""
os.makedirs(f'public/{SLUG}', exist_ok=True)
open(f'public/{SLUG}/index.html', 'w', encoding='utf-8').write(page)
print(f'  wrote public/{SLUG}/index.html ({len(page.encode())} bytes)')

# sitemap: one entry, never duplicated
sm = open('public/sitemap.xml', encoding='utf-8').read()
loc = f'https://aeoanalyzers.com/{SLUG}'
if f'<loc>{loc}</loc>' in sm:
    sm = re.sub(r'(<loc>' + re.escape(loc) + r'</loc>\s*<lastmod>)\d{4}-\d\d-\d\d', r'\g<1>' + REVIEWED, sm)
else:
    sm = sm.replace('</urlset>', f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{REVIEWED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>')
open('public/sitemap.xml', 'w', encoding='utf-8').write(sm)

# llms-full.txt: the full text, between markers, replaced in place
plain = re.sub(r'\*\*(.+?)\*\*', r'\1', body.strip())
plain = plain.replace(plain.split('\n\n')[1], plain.split('\n\n')[1] + '\n\n' + E4, 1)
block = f'<!-- page:{SLUG} -->\n## {TITLE}\nURL: {loc}\n\n' + re.sub(r'^# .*\n\n', '', plain) + f'\n<!-- /page:{SLUG} -->'
lf = open('public/llms-full.txt', encoding='utf-8').read()
if f'<!-- page:{SLUG} -->' in lf:
    lf = re.sub(rf'<!-- page:{SLUG} -->.*?<!-- /page:{SLUG} -->', lambda m: block, lf, flags=re.S)
else:
    lf = lf.rstrip('\n') + '\n\n' + block + '\n'
open('public/llms-full.txt', 'w', encoding='utf-8').write(lf)
print('  sitemap + llms-full: /get-recommended present')
