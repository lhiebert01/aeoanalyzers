# -*- coding: utf-8 -*-
"""WO-AEO-BLOG-ONE-QUESTION-001 — render the founder-reviewed markdown onto the blog chassis.

Copy is final: this script converts markdown to HTML and does nothing else to the words.
Bare https URLs become anchors whose visible text is the URL (no wrappers, no UTM).
The page ships NOINDEX until the founder says go; flip_noindex() is the only publish step."""
import re, html, json, sys
SRC='docs/work-orders/WO-AEO-BLOG-ONE-QUESTION-001/one-question-is-not-a-measurement.md'
OUT='public/blog/one-question-is-not-a-measurement/index.html'
CHASSIS='public/blog/why-ai-doesnt-mention-you/index.html'
SLUG='/blog/one-question-is-not-a-measurement'; URL='https://aeoanalyzers.com'+SLUG
GO = '--go' in sys.argv

md=open(SRC,encoding='utf-8').read()
fm,body=re.match(r'---\n(.*?)\n---\n(.*)',md,re.S).groups()
meta={k.strip():v.strip() for k,v in (l.split(':',1) for l in fm.splitlines() if ':' in l)}
lines=body.strip().splitlines()
assert lines[0].startswith('AEO Analyzers · Category education'); header_line=lines[0]
assert lines[1]=='' and lines[2].startswith('# '); h1=lines[2][2:]
rest='\n'.join(lines[3:]).strip()

# meta description: the front-matter sentence is 211 chars; Bing flagged >160 on this site
# on 23 Sep and a guard now enforces it. Keep the first sentence whole + a short second.
desc="The one-minute AI visibility test tells you whether you win one question, not which questions you could win. Twelve questions on four engines produce a plan."
assert 50<=len(desc)<=160, len(desc)
title="One Question Is Not a Measurement | AEO Analyzers"; assert len(title)<=65

def inline(s):
    s=html.escape(s,quote=False)
    s=re.sub(r'(https://[^\s<)]+?)([.,;:)]?)(?=\s|$)', lambda m:f'<a href="{m.group(1)}">{m.group(1)}</a>{m.group(2)}', s)
    return s

out=[]; paras=re.split(r'\n\s*\n',rest); i=0
for p in paras:
    p=p.strip()
    if not p: continue
    if p.startswith('## '):
        out.append(f'      <h2 class="posth2">{inline(p[3:])}</h2>'); continue
    if re.match(r'^\d+\. ',p):
        items=re.split(r'\n(?=\d+\. )',p)
        out.append('      <ol>'); 
        for it in items:
            txt=re.sub(r'^\d+\. ','',it); out.append('        <li>'+inline(txt)+'</li>')
        out.append('      </ol>'); continue
    if i==0: out.append(f'      <p class="postlead">{inline(p)}</p>'); out.append(f'      <p class="postmeta">{meta["author"]} &middot; {meta["date"]} &middot; {meta["read_time"]}</p>')
    else: out.append(f'      <p>{inline(p)}</p>')
    i+=1
article='\n'.join(out)
assert '—' not in re.sub(r'&mdash;','',article) or '—' in rest, 'no em dashes added'

# hero figure right after the meta line
HERO='''      <figure class="postfig">
        <img src="/blog/one-question-is-not-a-measurement/img/hero-one-question-1600x840.webp" alt="One bar labelled 1 question times 12 runs beside a grid of twelve cells in three rows and four columns labelled 12 questions times 4 engines. Headline: One question is not a measurement." width="1600" height="840" loading="lazy" decoding="async">
        <figcaption>One question asked twelve times is one number. Twelve questions on four engines is a shape.</figcaption>
      </figure>'''
article=article.replace('</p>\n      <p>','</p>\n'+HERO+'\n      <p>',1)

ch=open(CHASSIS,encoding='utf-8').read()
css=ch[ch.index('<style>'):ch.index('</style>')+8]
bar=ch[ch.index('<body>'):ch.index('<div class="wrap">')]
tail=ch[ch.index('    <p class="samplenote">'):]   # samplenote → followseries → footer → </html>

ld={"@context":"https://schema.org","@type":"Article","headline":h1,"description":desc,
    "datePublished":"2026-09-30","dateModified":"2026-09-30",
    "author":{"@type":"Person","@id":"https://pigenai.com/#lindsay","name":"Lindsay Hiebert",
              "sameAs":["https://www.linkedin.com/in/lindsayhiebert/","https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url"]},
    "publisher":{"@type":"Organization","@id":"https://pigenai.com/#org","name":"PIGENAI LLC","url":"https://pigenai.com",
                 "logo":{"@type":"ImageObject","url":"https://aeoanalyzers.com/aeo-og.png"}},
    "mainEntityOfPage":{"@type":"WebPage","@id":URL},
    "image":"https://aeoanalyzers.com/blog/one-question-is-not-a-measurement/img/og-one-question-1200x630.png","url":URL}
robots='index,follow,max-image-preview:large' if GO else 'noindex,nofollow'
d=html.escape(desc,quote=True)
page=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{title}</title>
<meta name="description" content="{d}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{URL}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{html.escape(h1,quote=True)}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="https://aeoanalyzers.com/blog/one-question-is-not-a-measurement/img/og-one-question-1200x630.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="One bar labelled 1 question times 12 runs beside a three-by-four grid labelled 12 questions times 4 engines, under the headline One question is not a measurement.">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(h1,quote=True)}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="https://aeoanalyzers.com/blog/one-question-is-not-a-measurement/img/og-one-question-1200x630.png">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{json.dumps(ld,indent=2,ensure_ascii=False)}
</script>
{css}
</head>
{bar}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">{inline(header_line)}</div>
    <h1 class="posttitle">{inline(h1)}</h1>
    <div class="postbody">
{article}
    </div>
{tail}'''
open(OUT,'w',encoding='utf-8').write(page)
print(f'  wrote {OUT} ({len(page)} bytes)  robots={robots}')
