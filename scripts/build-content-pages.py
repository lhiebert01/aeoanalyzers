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
                  '.postbody li{margin:0 0 6px}\n'
                  '.shortans{background:#E3F1EF;border:1px solid #9CC9C2;border-left:5px solid #0B5560;border-radius:12px;padding:16px 18px;color:#0E1216}\n'
                  '.stepcard{position:relative;background:var(--card);border:1px solid var(--edge);border-radius:14px;padding:16px 18px 6px 64px;margin:18px 0;box-shadow:var(--card-shadow)}\n'
                  '.stepcard .stepn{position:absolute;left:16px;top:16px;width:34px;height:34px;border-radius:50%;background:#0B5560;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}\n'
                  '.stepcard .posth2{margin-top:2px}\n'
                  'details.faq{border:1px solid var(--edge);border-radius:12px;background:var(--card);margin:10px 0;padding:0 16px;max-width:68ch}\n'
                  'details.faq summary{cursor:pointer;font-weight:700;font-size:17px;padding:13px 0;color:var(--ink)}\n'
                  'details.faq p{margin:0 0 14px}\n'
                  '.stattiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:18px 0 22px;max-width:68ch}\n'
                  '.stat{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:14px 16px}\n'
                  '.stat .v{display:block;font-size:26px;font-weight:800;color:#0E1216;font-variant-numeric:tabular-nums}\n'
                  '.stat .k{display:block;font-size:13.5px;color:#2A333B;margin-top:4px}\n</style>')
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
    # WO-016 C: readable pages. "Short answer" -> callout; "## Step N: ..." sections -> step cards;
    # "## Questions people ask" -> accordion (FAQPage structured data from the same text);
    # a "STATS" block ("- value | label" lines) -> stat tiles.
    in_step, in_faq = False, False
    def close_step():
        nonlocal in_step
        if in_step: out.append('      </section>'); in_step = False
    for i, b in enumerate(blocks):
        if b.startswith('### '):
            q, _, rest = b[4:].partition('\n')
            if in_faq and rest.strip():
                faq.append((plain(q), plain(rest.strip())))
                out.append(f'      <details class="faq"><summary>{inline(q)}</summary><p>{inline(rest.strip())}</p></details>')
                continue
            if in_faq and i + 1 < len(blocks):
                continue  # rendered with its answer below
            out.append(f'      <h3 class="posth3">{inline(q)}</h3>')
            continue
        if in_faq and i > 0 and blocks[i - 1].startswith('### '):
            q = blocks[i - 1][4:]
            faq.append((plain(q), plain(b)))
            out.append(f'      <details class="faq"><summary>{inline(q)}</summary><p>{inline(b)}</p></details>')
            continue
        if b.startswith('## '):
            close_step()
            h = b[3:]
            in_faq = h.strip().lower() == 'questions people ask'
            m = re.match(r'Step (\d+): (.+)', h)
            if m:
                out.append(f'      <section class="stepcard"><span class="stepn" aria-hidden="true">{m.group(1)}</span>')
                out.append(f'      <h2 class="posth2">{inline(h)}</h2>')
                in_step = True
            else:
                out.append(f'      <h2 class="posth2">{inline(h)}</h2>')
            continue
        if b.startswith('STATS'):
            tiles = [x[2:].split(' | ', 1) for x in b.split('\n')[1:] if x.startswith('- ')]
            out.append('      <div class="stattiles">' + ''.join(f'<div class="stat"><span class="v">{inline(v)}</span><span class="k">{inline(k)}</span></div>' for v, k in tiles) + '</div>')
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
            cls = 'postlead shortans' if b.startswith('**Short answer:**') else 'postlead'
            out.append(f'      <p class="{cls}">{inline(b)}</p>')
            out.append(f'      <p class="postmeta">Lindsay Hiebert, PIGENAI LLC &middot; {meta["display_date"]} &middot; {meta["read_time"]}</p>')
            first = False
        else:
            out.append(f'      <p>{inline(b)}</p>')
    close_step()
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
