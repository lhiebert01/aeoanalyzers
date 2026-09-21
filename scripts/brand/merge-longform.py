# -*- coding: utf-8 -*-
"""Merge the long-form companion depth INTO the three published pages.

Same URLs. Insert, never replace: the live pages already carry the dated, verified
competitor pricing table, the disclosure, the naming section and the closing test, and
the long-form doc has none of those. An earlier pass replaced the bodies wholesale and
lost 1,200 words of verified work — hence insert-only."""
import json, re, html

P = json.load(open('/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/long.json'))
def t(i): return P[i]['t']
def esc(s):
    return (html.escape(s, quote=False).replace("’","&rsquo;").replace("‘","&lsquo;")
            .replace('“','&ldquo;').replace('”','&rdquo;').replace('—','&mdash;').replace('–','&ndash;'))
def h2(s):   return f'      <h2 class="posth2">{esc(s)}</h2>'
def h3(s):   return f'      <h3 class="posth3">{esc(s)}</h3>'
def p_(s):   return f'      <p>{esc(s)}</p>'

def insert(path, anchor, block):
    s = open(path, encoding='utf-8').read()
    assert anchor in s, f'{path}: anchor missing'
    assert block.split('\n')[1][:40] not in s, f'{path}: block already present'
    s = s.replace(anchor, block + '\n' + anchor, 1)
    if '.posth3{' not in s:
        s = s.replace('</style>', '.posth3{font-family:var(--serif);font-weight:600;font-size:20px;line-height:1.25;margin:26px 0 8px;color:var(--ink)}\n</style>', 1)
    if '.pullquote{' not in s:
        s = s.replace('</style>', '.pullquote{font-family:var(--serif);font-size:clamp(20px,2.6vw,26px);line-height:1.3;color:var(--teal-deep);border-left:3px solid var(--teal);padding-left:18px;margin:26px 0}\n</style>', 1)
    open(path,'w',encoding='utf-8').write(s)

# ---- 1. /what-should-an-aeo-tool-do : the five jobs, in depth
blk = [h2('What are the four jobs hidden inside &ldquo;AI visibility&rdquo;?'), p_(t(17))]
for i in (18,20,22,24,26):
    blk += [h3(t(i)), p_(t(i+1))]
blk += [f'      <p class="pullquote">{esc(t(28))}</p>', h2(t(29)), p_(t(30))]
insert('public/what-should-an-aeo-tool-do/index.html',
       '      <h2 class="posth2">Why is one run not a measurement?</h2>',
       '\n'.join(blk))

# ---- 2. /aeo-buyers-standard : a paragraph of depth per requirement
blk = [h2('What does each requirement mean in practice?'), p_(t(45))]
for i in (70,72,74,76,78,81,83):
    blk += [h3(t(i)), p_(t(i+1))]
blk += [h2(t(85)), p_(t(86))]
insert('public/aeo-buyers-standard/index.html',
       '      <h2 class="posth2">AEO metrics should have receipts</h2>',
       '\n'.join(blk))

# ---- 3. /best-aeo-tools : per-vendor detail + how to choose
blk = [h2('What does each platform actually emphasise?'),
       p_('A paragraph each, read from the vendor&rsquo;s own published material on the date shown in the table above. Where a vendor does not advertise something, we do not treat that as proof it is missing.')]
for i in range(165,181,2):
    blk += [h3(t(i)), p_(t(i+1))]
blk += [h2(t(181))]
for i in range(182,185):
    if P[i]['s']=='p': blk.append(p_(t(i)))
insert('public/best-aeo-tools/index.html',
       '      <h2 class="posth2">AEO, GEO, AI visibility tools, AI SEO tools &mdash; what is the difference?</h2>',
       '\n'.join(blk))

for f in ['public/what-should-an-aeo-tool-do/index.html','public/aeo-buyers-standard/index.html','public/best-aeo-tools/index.html']:
    s=open(f,encoding='utf-8').read()
    txt=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'<(script|style)[^>]*>.*?</\1>','',s,flags=re.S))))
    name=f.split('/')[1]; h3n=s.count('posth3')
    print(f"{name:30} {len(txt.split()):5} words  h2={s.count('posth2')}  h3={h3n}  tables={s.count('<table')}")
