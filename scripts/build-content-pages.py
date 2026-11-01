# -*- coding: utf-8 -*-
"""Render the markdown in docs/content/<batch>/*.md onto the blog chassis (Nov 2026).

Copy is final in the markdown; this script converts it and does nothing else to the words.
Front matter: slug, kind (post | answer), eyebrow, title, seo_title, description, date,
display_date, read_time. Markdown supported: paragraphs, ## and ### headings, "- " and "1. "
lists, **bold**, [text](url) and bare https URLs.

An "answer" page also carries FAQPage structured data built from its "### question" headings
and the paragraph under each, so the markup only restates what the page says.

Usage: python3 scripts/build-content-pages.py docs/content/2026-11
"""
import re, html, json, sys, glob, os

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else 'docs/content/2026-11'
CHASSIS = 'public/blog/why-ai-doesnt-mention-you/index.html'
SITE = 'https://aeoanalyzers.com'
OG = SITE + '/og-home-2026-11.jpg'
OG_ALT = ('AEO Analyzers: Be the Answer AI Gives. Measure what AI answer engines say about you, act on it, '
          'and keep a dated record. Three stacked answer cards on a navy background.')
PERSON = {"@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert"}
ORG = {"@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC", "url": "https://pigenai.com",
       "logo": {"@type": "ImageObject", "url": SITE + "/aeo-analyzers-logo-512.png", "width": 512, "height": 512}}

ch = open(CHASSIS, encoding='utf-8').read()
CSS = ch[ch.index('<style>'):ch.index('</style>') + 8]
CSS = CSS.replace('</style>', '.posth3{font-size:18.5px;font-weight:700;line-height:1.35;color:var(--ink);margin:24px 0 8px;max-width:68ch}\n'
                  '.postbody ul,.postbody ol{font-size:17px;line-height:1.6;color:var(--ink);max-width:68ch;margin:0 0 16px;padding-left:22px}\n'
                  '.postbody li{margin:0 0 6px}\n</style>')
BAR = ch[ch.index('<body>'):ch.index('<div class="wrap">')]
TAIL = ch[ch.index('    <p class="samplenote">'):]


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\((https://[^)\s]+)\)',
               lambda m: f'<a class="ilink" href="{m.group(2).replace(SITE, "") or "/"}">{m.group(1)}</a>', s)
    s = re.sub(r'(?<!href=")(https://[^\s<)"]+?)([.,;:)]?)(?=\s|$)', lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>{m.group(2)}', s)
    return s


def plain(s):
    return re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s).replace('**', '')


def render(path):
    md = open(path, encoding='utf-8').read()
    fm, body = re.match(r'---\n(.*?)\n---\n(.*)', md, re.S).groups()
    meta = {k.strip(): v.strip() for k, v in (l.split(':', 1) for l in fm.splitlines() if ':' in l)}
    for k in ('slug', 'kind', 'eyebrow', 'title', 'seo_title', 'description', 'date', 'display_date', 'read_time'):
        assert meta.get(k), (path, k)
    assert 50 <= len(meta['description']) <= 160, (path, len(meta['description']))
    assert len(meta['seo_title']) <= 65, (path, len(meta['seo_title']))
    for bad in (r'\$\d', r'\bimprov', r'\bbecause of\b', r'\bresulted in\b', r'\bthanks to\b', r'PI GenAI'):
        assert not re.search(bad, body, re.I), (path, bad)
    url = SITE + meta['slug']
    out, faq, first = [], [], True
    blocks = [b.strip() for b in re.split(r'\n\s*\n', body.strip()) if b.strip()]
    for i, b in enumerate(blocks):
        if b.startswith('### '):
            out.append(f'      <h3 class="posth3">{inline(b[4:])}</h3>')
            if meta['kind'] == 'answer' and i + 1 < len(blocks):
                faq.append((plain(b[4:]), plain(blocks[i + 1])))
            continue
        if b.startswith('## '):
            out.append(f'      <h2 class="posth2">{inline(b[3:])}</h2>')
            continue
        if b.startswith('- '):
            out.append('      <ul>')
            out += [f'        <li>{inline(x[2:])}</li>' for x in b.split('\n') if x.startswith('- ')]
            out.append('      </ul>')
            continue
        if re.match(r'^\d+\. ', b):
            out.append('      <ol>')
            items = [re.sub(r'^\d+\. ', '', x) for x in b.split('\n') if re.match(r'^\d+\. ', x)]
            out += ['        <li>' + inline(x) + '</li>' for x in items]
            out.append('      </ol>')
            continue
        if first:
            out.append(f'      <p class="postlead">{inline(b)}</p>')
            out.append(f'      <p class="postmeta">Lindsay Hiebert, PIGENAI LLC &middot; {meta["display_date"]} &middot; {meta["read_time"]}</p>')
            first = False
        else:
            out.append(f'      <p>{inline(b)}</p>')
    article = '\n'.join(out)

    graph = [{"@type": "BlogPosting" if meta['kind'] == 'post' else "Article", "headline": meta['title'],
              "description": meta['description'], "datePublished": meta['date'], "dateModified": meta['date'],
              "author": PERSON, "publisher": ORG, "mainEntityOfPage": {"@type": "WebPage", "@id": url},
              "image": OG, "url": url}]
    if faq:
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    ld = {"@context": "https://schema.org", "@graph": graph}
    d = html.escape(meta['description'], quote=True)
    t = html.escape(meta['title'], quote=True)
    page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{html.escape(meta['seo_title'])}</title>
<meta name="description" content="{d}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{OG_ALT}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Lindsay_Hiebert">
<meta name="twitter:creator" content="@Lindsay_Hiebert">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{OG}">
<meta name="twitter:image:alt" content="{OG_ALT}">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
</script>
{CSS}
</head>
{BAR}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">{inline(meta['eyebrow'])}</div>
    <h1 class="posttitle">{inline(meta['title'])}</h1>
    <div class="postbody">
{article}
    </div>
{TAIL}'''
    dest = 'public' + meta['slug'] + '/index.html'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(page)
    print(f'  wrote {dest} ({len(page)} bytes)')
    return meta


if __name__ == '__main__':
    for p in sorted(glob.glob(os.path.join(SRC_DIR, '*.md'))):
        render(p)
