# -*- coding: utf-8 -*-
"""Expand the three published pages with the long-form companion content.

SAME URLs, not new ones. Publishing the long versions at separate paths would put two
pages from this domain against each other for the same query — the cannibalization the
series was designed to avoid. The long form replaces the body; head, schema, hero image,
series cross-links and footer are preserved."""
import json, re, html

P = json.load(open('/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/long.json'))
def t(i): return P[i]['t']

def esc(s):
    return (html.escape(s, quote=False)
            .replace('&amp;rsquo;','&rsquo;').replace("’","&rsquo;").replace("‘","&lsquo;")
            .replace('“','&ldquo;').replace('”','&rdquo;').replace('—','&mdash;').replace('–','&ndash;'))

def para(s):   return f'      <p>{esc(s)}</p>'
def h2(s):     return f'      <h2 class="posth2">{esc(s)}</h2>'
def note(s):   return f'      <p class="note">{esc(s)}</p>'

def table(rows, headers):
    out=['      <div class="tblwrap"><table>',
         '        <thead><tr>'+''.join(f'<th>{esc(h)}</th>' for h in headers)+'</tr></thead>',
         '        <tbody>']
    for r in rows:
        cls=' class="ours"' if r[0].startswith('AEO Analyzers') else ''
        out.append(f'        <tr{cls}>'+''.join(f'<td>{esc(c)}</td>' for c in r)+'</tr>')
    out += ['        </tbody>','      </table></div>']
    return '\n'.join(out)

def triples(a,b):
    """Flattened docx table -> list of 3-tuples."""
    cells=[t(i) for i in range(a,b)]
    return [tuple(cells[i:i+3]) for i in range(0,len(cells)-2,3)]

# ---------------------------------------------------------------- ARTICLE 1
def article1():
    b=[]
    b.append(para(t(15)))
    for i in (16,18,20,22,24,26):
        b.append(h2(t(i))); b.append(para(t(i+1)))
    b.append(f'      <p class="pullquote">{esc(t(28))}</p>')
    for i in (29,31,33):
        b.append(h2(t(i))); b.append(para(t(i+1)))
    b.append(note(t(36)))
    return '\n'.join(b)

# ---------------------------------------------------------------- ARTICLE 2
def article2():
    b=[para(t(41)) if P[41]['s']=='p' else '']
    b.append(h2(t(42))); b.append(para(t(43)))
    b.append(h2(t(44))); b.append(para(t(45)))
    b.append(table(triples(49,70), [t(46),t(47),t(48)]))
    for i in (70,72,74,76,78,81,83):
        b.append(h2(t(i))); b.append(para(t(i+1)))
        if i==78 and P[80]['s']=='p': b.append(f'      <p class="pullquote">{esc(t(80))}</p>')
    for i in (85,87,89):
        b.append(h2(t(i))); b.append(para(t(i+1)))
    b.append(h2(t(91)))
    b.append('      <ol>')
    for i in range(92,104):
        b.append('        <li>'+esc(re.sub(r'^\d+\.\s*','',t(i)))+'</li>')
    b.append('      </ol>')
    b.append(note(t(104)+' '+t(105)))
    return '\n'.join(x for x in b if x)

# ---------------------------------------------------------------- ARTICLE 3
def article3():
    b=[para(t(110)),para(t(111)),para(t(112))]
    b.append(table(triples(116,137), [t(113),t(114),t(115)]))
    b.append(h2(t(137)))
    b.append(table(triples(141,165), [t(138),t(139),t(140)]))
    for i in range(165,181,2):
        b.append(h2(t(i))); b.append(para(t(i+1)))
    b.append(h2(t(181)))
    for i in range(182,185):
        if P[i]['s']=='p': b.append(para(t(i)))
    return '\n'.join(b)

BODIES = {
 'public/what-should-an-aeo-tool-do/index.html': article1(),
 'public/aeo-buyers-standard/index.html':        article2(),
 'public/best-aeo-tools/index.html':             article3(),
}

for path, body in BODIES.items():
    s = open(path, encoding='utf-8').read()
    # keep the series cross-link block that lives inside postbody
    m = re.search(r'(      <div class="callout">\s*\n\s*<p><b>This is part of a three-part series.*?</div>\n)', s, flags=re.S)
    series = m.group(1) if m else ''
    i = s.find('<div class="postbody">'); j = s.find('</div>\n\n    <div class="postoutro">')
    if j < 0: j = s.find('<div class="postoutro">'); j = s.rfind('</div>', 0, j)
    s = s[:i] + '<div class="postbody">\n' + body + '\n\n' + series + '    ' + s[j:]
    if '.pullquote{' not in s:
        s = s.replace('</style>', '.pullquote{font-family:var(--serif);font-size:clamp(21px,3vw,28px);line-height:1.25;color:var(--teal-deep);border-left:3px solid var(--teal);padding-left:18px;margin:28px 0}\n</style>', 1)
    open(path,'w',encoding='utf-8').write(s)
    txt = re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'<(script|style)[^>]*>.*?</\1>','',s,flags=re.S))))
    print(f"{path.split('/')[1]:30} {len(txt.split()):5} words  tables={s.count('<table')}")
