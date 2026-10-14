# -*- coding: utf-8 -*-
"""Render docs/blog-src/the-measurement-layer.md onto the blog chassis.

Copy is final: this converts markdown to HTML and does nothing else to the words.
No prices anywhere (asserted). The Search Console section is held (private/drafts) until
the second-account proof passes; the assert below keeps it out until then.
Usage: python3 scripts/build-measurement-layer-post.py [--go]   (--go = indexable)"""
import re, html, json, sys
SRC='docs/blog-src/the-measurement-layer.md'
OUT='public/blog/the-measurement-layer/index.html'
CHASSIS='public/blog/why-ai-doesnt-mention-you/index.html'
SLUG='/blog/the-measurement-layer'; URL='https://aeoanalyzers.com'+SLUG
OG='https://aeoanalyzers.com/aeo-og.png'   # swap to the post's own card (new filename) when it exists
GO='--go' in sys.argv

md=open(SRC,encoding='utf-8').read()
fm,body=re.match(r'---\n(.*?)\n---\n(.*)',md,re.S).groups()
meta={k.strip():v.strip().strip('"') for k,v in (l.split(':',1) for l in fm.splitlines() if ':' in l)}
lines=body.strip().splitlines()
assert lines[0].startswith('# '); h1=lines[0][2:]
rest='\n'.join(lines[1:]).strip()
assert not re.search(r'\$\s?\d', rest), 'no prices in any post'
assert 'Search Console' not in rest and 'fan-out' not in rest.lower(), 'section 5 is held'

desc="The answer engines already describe your company. How to measure it independently, read every transcript, and decide for yourself what to fix."
assert 50<=len(desc)<=160, len(desc)
title="How to Read What AI Engines Say About You | AEO Analyzers"; assert len(title)<=65

def inline(s):
    s=html.escape(s,quote=False)
    s=re.sub(r'\*([^*]+)\*', r'<em>\1</em>', s)
    s=re.sub(r'(https://[^\s<)]+?)([.,;:)]?)(?=\s|$)', lambda m:f'<a href="{m.group(1)}">{m.group(1)}</a>{m.group(2)}', s)
    return s.replace('aeoanalyzers.com.', '<a href="https://aeoanalyzers.com/">aeoanalyzers.com</a>.')

out=[]; i=0
for p in re.split(r'\n\s*\n',rest):
    p=p.strip()
    if not p: continue
    if p=='---': out.append('      <hr>'); continue
    if p.startswith('## '): out.append(f'      <h2 class="posth2">{inline(p[3:])}</h2>'); continue
    if i==0:
        out.append(f'      <p class="postlead">{inline(p)}</p>')
        out.append(f'      <p class="postmeta">Lindsay Hiebert &middot; October 14, 2026 &middot; 7-minute read</p>')
    else: out.append(f'      <p>{inline(p)}</p>')
    i+=1
article='\n'.join(out)

ch=open(CHASSIS,encoding='utf-8').read()
css=ch[ch.index('<style>'):ch.index('</style>')+8]
bar=ch[ch.index('<body>'):ch.index('<div class="wrap">')]
tail=ch[ch.index('    <p class="samplenote">'):]

ld={"@context":"https://schema.org","@type":"Article","headline":h1,"description":desc,
    "datePublished":"2026-10-14","dateModified":"2026-10-14",
    "author":{"@type":"Person","@id":"https://pigenai.com/#lindsay","name":"Lindsay Hiebert",
              "sameAs":["https://www.linkedin.com/in/lindsayhiebert/","https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url"]},
    "publisher":{"@type":"Organization","@id":"https://pigenai.com/#org","name":"PIGENAI LLC","url":"https://pigenai.com",
                 "logo":{"@type":"ImageObject","url":"https://aeoanalyzers.com/aeo-og.png"}},
    "mainEntityOfPage":{"@type":"WebPage","@id":URL},"image":OG,"url":URL}
robots='index,follow,max-image-preview:large' if GO else 'noindex,nofollow'
d=html.escape(desc,quote=True); t1=html.escape(h1,quote=True)
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
<meta property="og:title" content="{t1}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{OG}">
<meta property="og:image:width" content="1735">
<meta property="og:image:height" content="906">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t1}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{OG}">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{json.dumps(ld,indent=2,ensure_ascii=False)}
</script>
{css}
</head>
{bar}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">AEO Analyzers &middot; Measurement</div>
    <h1 class="posttitle">{inline(h1)}</h1>
    <div class="postbody">
{article}
    </div>
{tail}'''
open(OUT,'w',encoding='utf-8').write(page)
print(f'  wrote {OUT} ({len(page)} bytes)  robots={robots}')
