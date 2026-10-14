# -*- coding: utf-8 -*-
"""Render docs/blog-src/the-measurement-layer.md (WO-AEO-BLOG-MEASUREMENT-LAYER-007) onto the blog chassis.

Copy is final: this converts markdown to HTML and does nothing else to the words.
The EXHIBIT is a stored 13 Oct 2026 answer; /evidence#exhibit-2026-10-13 carries it in full.
Asserted: no price, the held Search Console section absent, no unfilled exhibit bracket.
Usage: python3 scripts/build-measurement-layer-post.py [--go]   (--go = indexable)"""
import re, html, json, sys
SRC = 'docs/blog-src/the-measurement-layer.md'
OUT = 'public/blog/the-measurement-layer/index.html'
CHASSIS = 'public/blog/why-ai-doesnt-mention-you/index.html'
SITE = 'https://aeoanalyzers.com'
GO = '--go' in sys.argv

md = open(SRC, encoding='utf-8').read()
fm, body = re.match(r'---\n(.*?)\n---\n(.*)', md, re.S).groups()
meta = {k.strip(): v.strip().strip('"') for k, v in (l.split(':', 1) for l in fm.splitlines() if ':' in l)}
URL = meta['canonical']; assert URL == SITE + '/blog/the-measurement-layer'
OG = SITE + meta['og_image']; HERO_PNG = SITE + meta['hero_image']
HERO_WEBP = meta['hero_image'].replace('.png', '.webp')
EMBED_WEBP = meta['embed_image'].replace('.png', '.webp')
EMBED_UNDER = 'Read the answer, not just the score'
OPEN_WEBP = meta['opening_embed_image'].replace('.png', '.webp')
OPEN_BEFORE = 'A buyer can decide before they ever visit your website'

def caption(text):
    # "/evidence" in a caption links to the dated 13 Oct section that holds these figures.
    return html.escape(text, quote=False).replace('/evidence', '<a class="ilink" href="/evidence#panel-test-2026-10-13">/evidence</a>')

assert not re.search(r'\$\s?\d', body), 'no prices in any post'
for w in ('Search Console', 'fan-out', 'machine-written'):
    assert w.lower() not in body.lower(), f'held section leaked: {w}'
assert '<!--' not in body and not re.search(r'\[(?:exact|engine|first|as named|list,|anchor)', body), 'exhibit not filled'

lines = body.strip().splitlines()
assert lines[0].startswith('# '); h1 = lines[0][2:]
rest = '\n'.join(lines[1:]).strip()

title = meta['seo_title']; desc = meta['meta_description']
assert 50 <= len(desc) <= 160, len(desc)

NOFOLLOW = ' rel="nofollow"'

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\[([^\]]+)\]\((https://[^)\s]+)\)', lambda m: f'<a class="ilink" href="{m.group(2)}">{m.group(1)}</a>', s)
    s = re.sub(r'(?<!href=")(?<!">)(https://[^\s<)*]+?)([.,;:)]?)(?=\s|$|<|\*)', lambda m: f'<a href="{m.group(1)}"{"" if m.group(1).startswith(SITE) else NOFOLLOW}>{m.group(1)}</a>{m.group(2)}', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?![\w*])', r'<em>\1</em>', s)
    return s

out = []; first = True
for p in re.split(r'\n\s*\n', rest):
    p = p.strip()
    if not p: continue
    if p == '---': out.append('      <hr>'); continue
    if p.startswith('### '): out.append(f'      <h3 class="posth3">{inline(p[4:])}</h3>'); continue
    if p.startswith('## '):
        if p[3:].strip() == OPEN_BEFORE:
            out.append(f'''      <figure class="postfig">
        <img src="{OPEN_WEBP}" alt="{html.escape(meta['opening_embed_alt'], quote=True)}" width="1731" height="909" loading="lazy" decoding="async">
        <figcaption>{caption(meta['opening_embed_caption'])}</figcaption>
      </figure>''')
        out.append(f'      <h2 class="posth2">{inline(p[3:])}</h2>')
        if p[3:].strip() == EMBED_UNDER:
            out.append(f'''      <figure class="postfig">
        <img src="{EMBED_WEBP}" alt="{html.escape(meta['embed_alt'], quote=True)}" width="1731" height="909" loading="lazy" decoding="async">
      </figure>''')
        continue
    if p.startswith('> '):
        out.append('      <blockquote class="postquote"><p>' + inline(' '.join(l[2:] for l in p.splitlines())) + '</p></blockquote>'); continue
    if re.match(r'^\d+\. ', p):
        out.append('      <ol>' + ''.join('<li>' + inline(re.sub(r'^\d+\. ', '', it)) + '</li>' for it in p.splitlines()) + '</ol>'); continue
    if first and p.startswith('*') and p.endswith('*'):
        out.append(f'      <p class="postlead">{inline(p[1:-1])}</p>')
        out.append('      <p class="postmeta">Lindsay Hiebert &middot; October 14, 2026 &middot; 8-minute read</p>')
        out.append(f'''      <figure class="postfig">
        <img src="{HERO_WEBP}" alt="{html.escape(meta['hero_alt'], quote=True)}" width="1731" height="909" decoding="async" fetchpriority="high">
        <figcaption>{caption(meta['hero_caption'])}</figcaption>
      </figure>''')
        first = False; continue
    out.append(f'      <p>{inline(p)}</p>')
article = '\n'.join(out)
assert article.count(EMBED_WEBP) == 1 and article.count(OPEN_WEBP) == 1, 'each embed must appear exactly once'

# H2 order must match the source exactly (the editorial structure).
assert re.findall(r'^## (.*)$', rest, re.M) == [html.unescape(re.sub('<[^>]+>', '', h)) for h in re.findall(r'<h2 class="posth2">(.*?)</h2>', article)]

ch = open(CHASSIS, encoding='utf-8').read()
css = ch[ch.index('<style>'):ch.index('</style>')]
css += '.posth3{font-size:19px;margin:28px 0 8px}.postquote{border-left:4px solid var(--accent,#0E3A44);margin:20px 0;padding:4px 0 4px 18px}.postquote p{margin:0;font-weight:600}\n</style>'
bar = ch[ch.index('<body>'):ch.index('<div class="wrap">')]
tail = ch[ch.index('    <p class="samplenote">'):]

ld = {"@context": "https://schema.org", "@type": "BlogPosting",
      "headline": h1, "alternativeHeadline": meta['subtitle'], "description": desc,
      "datePublished": "2026-10-14", "dateModified": "2026-10-14",
      "author": {"@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert",
                 "jobTitle": "Founder and CEO, PIGENAI LLC",
                 "sameAs": ["https://www.linkedin.com/in/lindsayhiebert/"]},
      "publisher": {"@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC",
                    "url": "https://pigenai.com", "logo": {"@type": "ImageObject", "url": SITE + "/aeo-og.png"}},
      "image": {"@type": "ImageObject", "url": OG, "width": 1200, "height": 630},
      "mainEntityOfPage": {"@type": "WebPage", "@id": URL},
      "isPartOf": {"@type": "Blog", "@id": SITE + "/blog/", "name": "AEO Analyzers Blog"},
      "url": URL}
assert 'offers' not in json.dumps(ld) and not re.search(r'\$\s?\d', json.dumps(ld))
robots = 'index,follow,max-image-preview:large' if GO else 'noindex,nofollow'
d = html.escape(desc, quote=True); t1 = html.escape(h1, quote=True); alt = html.escape(meta['og_alt'], quote=True)
page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{html.escape(title)}</title>
<meta name="description" content="{d}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{URL}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{t1}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{OG}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{alt}">
<meta property="article:published_time" content="2026-10-14">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t1}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{OG}">
<meta name="twitter:image:alt" content="{alt}">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
</script>
{css}
</head>
{bar}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">{html.escape(meta['series'])}</div>
    <h1 class="posttitle">{inline(h1)}</h1>
    <div class="postbody">
{article}
    </div>
{tail}'''
assert not re.search(r'\$\s?\d', re.sub(r'<style>.*?</style>', '', page, flags=re.S))
open(OUT, 'w', encoding='utf-8').write(page)
print(f'  wrote {OUT} ({len(page)} bytes)  robots={robots}  title={title!r}')
