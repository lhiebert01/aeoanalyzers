#!/usr/bin/env python3
"""Item 7/7a check: the published post text equals the source Markdown, word for word.
Usage: check-word-for-word.py [base]   base = local public/ (default) or https://aeoanalyzers.com"""
import re, html, sys, urllib.request
BASE = sys.argv[1] if len(sys.argv) > 1 else None
A = 'docs/launch/aeo-release-3/assets/'
def get(path):
    if BASE:
        return urllib.request.urlopen(urllib.request.Request(BASE + path, headers={'User-Agent': 'Mozilla/5.0'})).read().decode()
    return open('public' + path + '/index.html', encoding='utf-8').read()
def text_of(h):
    body = re.search(r'<div class="postbody">([\s\S]*?)<p class="jumpcue">', h).group(1)
    body = re.sub(r'<script[\s\S]*?</script>|<figure[\s\S]*?</figure>|<!--[\s\S]*?-->|<div class="vid"[\s\S]*?</div>', '', body)
    body = re.sub(r'</?(a|strong|em|span|code)\b[^>]*>', '', body)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', body))).strip()
def md_text(md):
    md = re.sub(r'^#+\s*', '', md, flags=re.M).replace('**', '').replace('---', '')
    md = re.sub(r'(?<![\w*])\*([^*]+)\*(?!\w)', r'\1', md); md = re.sub(r'^\d+\.\s+', '', md, flags=re.M)
    return re.sub(r'\s+', ' ', md).strip()
ok = True
r = md_text(open(A + 'Release-3-AEO-Analyzers-Body.md').read())
t = text_of(get('/blog/aeo-analyzers-five-engines')).replace('KANSAS CITY, MO, UNITED STATES, December 8, 2026. ', '', 1)
f = open(A + 'Founder-Blog-Being-Found-Is-Not-Being-Recommended.md').read().split('\n')[3:]
fr = md_text('\n'.join(f).replace('**By Lindsay Hiebert, CISSP**\nFounder and CEO, PIGENAI LLC\n', ''))
ft = text_of(get('/blog/being-found-is-not-being-recommended'))
for name, a, b in (('release post', r, t), ('founder post', fr, ft)):
    same = a == b; ok &= same
    print(f'{name}: {"word for word" if same else "DIFFERS"} ({len(a.split())} words)')
    if not same:
        for i, (x, y) in enumerate(zip(a.split(), b.split())):
            if x != y: print('  first difference at word', i, repr(x), repr(y)); break
sys.exit(0 if ok else 1)
