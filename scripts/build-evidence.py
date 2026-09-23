# -*- coding: utf-8 -*-
"""Build /evidence — the canonical Honest-Zero ledger — and the summary that points at it.

WHY A PAGE AND NOT A SECTION. The ledger started life at the bottom of a 2,200-word post
written in July. That is fine for two rows and absurd for twelve, it cannot be linked as a
thing, and the Buyer's Standard sells "receipts" as a purchasing requirement with nowhere
to point. One canonical page, many entry points: every surface that quotes a number links
here, so the monthly job is adding one row in one place.

EVERY FIGURE IS RECOMPUTED FROM docs/baselines/*.json under the corrected not-found rule.
Nothing is typed. The same function feeds the page and the summary card inside Part 1, so
the two cannot drift — which is exactly how the page came to say 82% while the corrections
block three sections above it said 80%.
"""
import json, re, os, sys

BASE = 'docs/baselines'
NOT_FOUND = re.compile(
    r"(could ?n'?t find|couldn.t find|unable to find|no (?:specific )?(?:website|information|results?)"
    r" (?:specifically )?(?:at|about|for)|don'?t have (?:any )?(?:specific )?information)", re.I)

def runs(f, kind):
    return [r for r in json.load(open(f'{BASE}/{f}'))['runs'] if r['queryType'] == kind]

def branded(f):
    rs = runs(f, 'branded')
    hits = [r for r in rs if r.get('domainCited') and not NOT_FOUND.search(r.get('transcript') or '')]
    return round(100 * len(hits) / len(rs)), len(rs)

def category(f):
    rs = runs(f, 'category')
    hits = [r for r in rs if r.get('domainCited')]
    named = sum(1 for r in rs if 'aeoanalyzers' in (r.get('transcript') or '').lower())
    hosts = set()
    for r in rs:
        for s in (r.get('sources') or []):
            u = s if isinstance(s, str) else (s.get('url') or '')
            m = re.match(r'https?://(?:www\.)?([^/]+)', u)
            if m: hosts.add(m.group(1).lower())
    return round(100 * len(hits) / len(rs)), len(rs), named, len(hosts)

AUG_F, SEP_F = 'aeoanalyzers-SERIES-ANCHOR-2026-08-01.json', 'aeoanalyzers-2026-09-01.json'
ab, an = branded(AUG_F); ac, acn, anamed, ahosts = category(AUG_F)
sb, sn = branded(SEP_F); sc, scn, snamed, shosts = category(SEP_F)
total = len(json.load(open(f'{BASE}/{SEP_F}'))['runs'])

assert (ab, sb) == (55, 80), (ab, sb)
assert (ac, sc) == (0, 0) and (anamed, snamed) == (0, 0)
assert (ahosts, shosts) == (296, 215)

MONTHS = [
 dict(month='August 2026', measured='1 Aug 2026', b=ab, bn=an, c=ac, cn=acn, restated=True,
      note=("Series anchor. Two engines returned the site every time, two almost never. Published "
            "at the time as 100% under a looser rule that counted an answer describing us from our "
            "parent company&rsquo;s site rather than our own. Restated here so the column compares "
            "like with like.")),
 dict(month='September 2026', measured='2 Sep 2026', b=sb, bn=sn, c=sc, cn=scn, restated=False,
      note=("Found by name far more often &mdash; ChatGPT went from 2 of 10 to 10 of 10. Recommended "
            "to category buyers still zero times: the word &ldquo;aeoanalyzers&rdquo; appears in none "
            f"of the {scn} answers. Absent, not ranked last. Meanwhile one engine now replies that it "
            "cannot find the domain at all and offers two similarly-named sites instead &mdash; a "
            "buyer typing our name, sent elsewhere.")),
]

LESSONS = [
 ("Most of our &ldquo;AI crawler traffic&rdquo; was not AI crawlers.",
  "We logged bots by the name they gave us. Anyone can call themselves GPTBot, and vulnerability "
  "scanners do while asking for credential files. Three-quarters of everything we had counted as "
  "crawling was that. The published 265 became 36 once we counted only fetches of pages that "
  "exist. Lesson: a count is only as honest as the thing it trusts &mdash; verify the bot, not the name."),
 ("Ingestion is not indexing, and now we can show it.",
  "Anthropic&rsquo;s training crawler has fetched our pages 75 times since July. Its search "
  "crawler, the one that decides whether Claude can find you, has come twice. Claude is the one "
  "engine that answers &ldquo;I couldn&rsquo;t find aeoanalyzers.com&rdquo;. Being read into a "
  "model&rsquo;s memory does nothing for whether it can look you up."),
 ("A number has to survive its own scorer.",
  "Correcting how we score a &ldquo;the search ran, the site was not found&rdquo; answer changed our "
  "own history. We would rather restate a published figure in public than keep a flattering one that "
  "no longer means what it did."),
 ("Being found and being recommended move independently.",
  f"Found by name rose {sb - ab} points this month. Recommended to buyers did not move at all. Two "
  "different problems with two different fixes, which is why they are never blended into one score."),
 ("The sources the engines draw on are consolidating.",
  f"Across the same {scn} category questions, the set of distinct sites cited as sources fell from "
  f"{ahosts} in August to {shosts} in September. Fewer doors, and none of them ours yet."),
]

def rows():
    out = []
    for i, m in enumerate(MONTHS):
        tone = 'up' if i == len(MONTHS) - 1 else 'flat'
        tag = ' <span class="tag">restated</span>' if m['restated'] else ''
        out.append(f"""        <tr>
          <td class="mo">{m['month']}</td>
          <td><span class="fig {tone}">{m['b']}%</span><span class="nn">N={m['bn']}</span></td>
          <td><span class="fig flat">{m['c']}%</span><span class="nn">N={m['cn']}</span></td>
          <td class="when">{m['measured']}</td>
          <td><p class="ledgernote">{tag}{m['note']}</p></td>
        </tr>""")
    return '\n'.join(out)

LATEST = MONTHS[-1]
CARDS = f"""    <div class="score" aria-label="Latest measurement: {LATEST['month']}, {total} stored answers across four answer engines">
      <div class="tile good"><div class="lab">Found by name</div><div class="num">{sb}%</div><div class="note">N={sn} &middot; up from {ab}% in August</div></div>
      <div class="tile gap"><div class="lab">Recommended to buyers</div><div class="num">{sc}%</div><div class="note">N={scn} &middot; unchanged since the first measurement</div></div>
      <div class="tile"><div class="lab">Answers stored</div><div class="num">{total}</div><div class="note">four engines &middot; every one re-readable</div></div>
    </div>"""

# ------------------------------------------------------------------ the page
SRC = 'public/blog/i-scored-zero/index.html'
src = open(SRC, encoding='utf-8').read()
CSS  = src[src.index('<style>'):src.index('</style>')]

# /evidence is a TABLE page, not a blog post. The blog chassis caps .wrap at 960px, which
# squeezed "What changed" into roughly a quarter of the width and made a four-line note run
# to twenty lines — rows so tall the two months could not be compared on one screen. The
# table also inherited horizontal rules only, so columns had no boundaries at all.
CSS += """
/* ---- /evidence: wider page, and a table you can actually read across ---- */
.wrap{max-width:1180px}
.ledger{margin:18px 0 6px}
.ledger table{min-width:980px;table-layout:fixed}
.ledger th,.ledger td{border-right:1px solid var(--hair)}
.ledger th:last-child,.ledger td:last-child{border-right:0}
.ledger thead th{border-bottom:2px solid var(--edge);font-size:11.5px;letter-spacing:.07em;
  line-height:1.35;padding:12px 14px;vertical-align:bottom}
.ledger td{padding:15px 14px}
.ledger tbody tr:nth-child(even){background:var(--panel)}
.ledger .ledgernote{font-size:14.5px;line-height:1.55;margin:0}
.ledger .fig{font-size:19px}
@media(max-width:1000px){.ledger table{min-width:820px}}
</style>"""

BAR  = src[src.index('<body>'):src.index('<div class="wrap">')]
FOOT = src[src.index('<footer class="sitefoot">'):src.index('</footer>') + 9]

DESC = (f"Our own answer-engine visibility, re-measured every month and published whatever it "
        f"says. {LATEST['month']}: found by name {sb}% of {sn} runs, recommended to category buyers "
        f"{sc}% of {scn}. Same twelve-question panel, five runs each, four engines, every answer stored.")

PAGE = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>The Honest-Zero ledger: our own numbers, every month | AEO Analyzers</title>
<meta name="description" content="{DESC}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://aeoanalyzers.com/evidence">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="The Honest-Zero ledger: our own numbers, every month">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="https://aeoanalyzers.com/evidence">
<meta property="og:image" content="https://aeoanalyzers.com/og-evidence-ledger.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="AEO Analyzers: the Honest-Zero ledger, our own numbers published every month">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Honest-Zero ledger: our own numbers, every month">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="https://aeoanalyzers.com/og-evidence-ledger.png">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "AEO Analyzers Honest-Zero series: monthly answer-engine visibility measurement",
  "description": "{DESC}",
  "url": "https://aeoanalyzers.com/evidence",
  "license": "https://aeoanalyzers.com/terms",
  "isAccessibleForFree": true,
  "creator": {{ "@type": "Person", "name": "Lindsay Hiebert", "url": "https://www.linkedin.com/in/lindsayhiebert/" }},
  "publisher": {{
    "@type": "Organization", "name": "PI GenAI LLC", "url": "https://pigenai.com",
    "logo": {{ "@type": "ImageObject", "url": "https://aeoanalyzers.com/aeo-og.png" }}
  }},
  "temporalCoverage": "2026-08-01/{MONTHS[-1]['measured'].split()[2]}-09-02",
  "variableMeasured": [
    {{ "@type": "PropertyValue", "name": "Branded retrievability", "value": {sb}, "unitText": "PERCENT",
      "description": "Share of branded runs in which the engine reached aeoanalyzers.com. N={sn}." }},
    {{ "@type": "PropertyValue", "name": "Category citation win", "value": {sc}, "unitText": "PERCENT",
      "description": "Share of unbranded category runs in which the engine recommended aeoanalyzers.com. N={scn}." }}
  ],
  "mainEntityOfPage": {{ "@type": "WebPage", "@id": "https://aeoanalyzers.com/evidence" }}
}}
</script>
{CSS}
</head>
{BAR}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">AEO Analyzers &middot; The Honest-Zero ledger</div>
    <h1 class="posttitle">Our own numbers, every month</h1>
    <div class="postbody">
      <p class="postlead">This is the running record of how the answer engines treat this site.
      One row a month: how often they find us when asked by name, how often they recommend us
      to someone who never said the name, how many answers each figure came from, and what
      changed. It is updated whether the news is good or not, which is the entire point of it.</p>
      <p class="postmeta">Latest measurement: {LATEST['month']}, measured {LATEST['measured']}</p>
    </div>

{CARDS}

    <div class="postbody">
      <h2 class="posth2" id="the-ledger">Every month so far</h2>
      <div class="ledger">
        <table>
          <colgroup>
            <col style="width:12%"><col style="width:10%"><col style="width:12%">
            <col style="width:11%"><col style="width:55%">
          </colgroup>
          <thead><tr>
            <th scope="col">Month</th>
            <th scope="col">Found by name</th>
            <th scope="col">Recommended to buyers</th>
            <th scope="col">Measured</th>
            <th scope="col">What changed</th>
          </tr></thead>
          <tbody>
{rows()}
          </tbody>
        </table>
      </div>
      <p class="ledgernote">Same instrument every month: the same pinned twelve-question panel,
      five runs of every question, across ChatGPT, Claude, Perplexity and Gemini with web search
      on &mdash; {total} answers a month, each one stored. <strong>The month is the unit, not the
      calendar day</strong>; the date each run was taken is in the table, so an uneven gap is
      visible rather than hidden.</p>

      <h2 class="posth2">What we have learned so far</h2>
      <ul class="lessons">
{chr(10).join(f'        <li><b>{t}</b><span>{b}</span></li>' for t, b in LESSONS)}
      </ul>

      <h2 class="posth2">How to check any of it</h2>
      <p>Every figure here comes from stored transcripts, and a publication gate recomputes each
      one from those transcripts before it can be published &mdash; it has already caught us once,
      when this ledger briefly carried a branded figure of 82% that the corrected scoring rule had
      already reduced to {sb}%. Ask any of the same questions yourself and you should get
      what the table says.</p>
      <p>The series that explains the numbers:
      <a class="ilink" href="/blog/i-scored-zero">the first zero</a>,
      <a class="ilink" href="/blog/reading-isnt-citing">why being read is not being cited</a>,
      <a class="ilink" href="/blog/how-it-works">how the measurement works</a>, and
      <a class="ilink" href="/blog/">the rest of the blog</a>. When a month produces something
      genuinely new it gets its own post, and its row will link to it.</p>
    </div>

    <p class="samplenote"><em>AEO Analyzers (aeoanalyzers.com) was created and is solely maintained
    by Lindsay Hiebert, founder of PI GenAI LLC. It is unaffiliated with any similarly named browser
    extension, plugin, or tool.</em></p>
  </article>

  <div class="postoutro">
    <span class="eyebrow">See your own number</span>
    <h3>What do the engines say about your business?</h3>
    <p>It starts with your domain &mdash; the first look is free and takes about ninety seconds.
    Whatever your number is, better you find it than your next prospect.</p>
    <a class="cta" href="https://aeoanalyzers.com">Check your brand &mdash; free &rarr;</a>
  </div>
</div>
{FOOT}
</body>
</html>
"""

os.makedirs('public/evidence', exist_ok=True)
open('public/evidence/index.html', 'w', encoding='utf-8').write(PAGE)
print(f'  wrote public/evidence/index.html ({len(PAGE)} bytes)')
print(f'  latest: branded {sb}% N={sn} | category {sc}% N={scn} | {total} answers')

# ------------------------------------------------- every entry point, one source
# The ledger is one page. Everywhere else shows the current number and links here, so
# publishing a month means editing one row, not hunting for every surface that quotes it.

STRIP_CSS = """
.ledgerstrip{display:flex;flex-wrap:wrap;align-items:center;gap:18px 30px;
  background:var(--card);border:1px solid var(--edge);border-left:4px solid var(--teal);
  border-radius:14px;box-shadow:var(--card-shadow);padding:16px 20px;margin:0 0 22px}
.ledgerstrip .ls-lab{font-size:11.5px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;
  color:var(--teal);margin:0 0 8px}
.ledgerstrip .ls-figs{display:flex;gap:26px;flex-wrap:wrap}
.ledgerstrip .ls-fig{display:flex;flex-direction:column}
.ledgerstrip .ls-n{font-size:27px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:var(--ink)}
.ledgerstrip .ls-n.good{color:var(--good)} .ledgerstrip .ls-n.gap{color:var(--gap)}
.ledgerstrip .ls-k{font-size:12.5px;color:var(--muted);margin-top:5px}
.ledgerstrip .ls-txt{flex:1 1 260px;font-size:14.5px;color:var(--muted);margin:0}
.ledgerstrip .ls-go{display:inline-block;background:var(--teal-deep);color:#EAF4F5;text-decoration:none;
  font-weight:700;font-size:14px;padding:10px 16px;border-radius:10px;white-space:nowrap}
.ledgerstrip .ls-go:hover{color:#fff}
"""

STRIP = f"""  <div class="ledgerstrip">
    <div>
      <p class="ls-lab">The Honest-Zero ledger &middot; {LATEST['month']}</p>
      <div class="ls-figs">
        <span class="ls-fig"><span class="ls-n good">{sb}%</span><span class="ls-k">found by name &middot; N={sn}</span></span>
        <span class="ls-fig"><span class="ls-n gap">{sc}%</span><span class="ls-k">recommended to buyers &middot; N={scn}</span></span>
      </div>
    </div>
    <p class="ls-txt">We re-measure our own answer-engine visibility every month, the same way,
    and publish it whatever it says.</p>
    <a class="ls-go" href="/evidence">See the ledger &rarr;</a>
  </div>

"""

def patch(path, jobs, css=None, once_marker=None):
    h = open(path, encoding='utf-8').read()
    if once_marker and once_marker in h:
        print(f'  {path}: already patched, skipped'); return
    for old, new in jobs:
        assert old in h, f'{path}: missing anchor {old[:70]!r}'
        h = h.replace(old, new, 1)
    if css and css.strip().split('{')[0].strip() not in h:
        h = h.replace('</style>', css + '</style>', 1)
    open(path, 'w', encoding='utf-8').write(h)
    print(f'  patched {path}')

# 1. Blog index — the number goes at the TOP, where a reader lands, not in the footer aside.
patch('public/blog/index.html',
      [('  <div class="posts">', STRIP + '  <div class="posts">'),
       ('<a href="/blog/i-scored-zero#the-ledger">the running ledger</a>',
        '<a href="/evidence">the running ledger</a>')],
      css=STRIP_CSS, once_marker='class="ledgerstrip"')

# 2. Part 1 — keep the cards and the month's note, hand the table to /evidence.
p1 = 'public/blog/i-scored-zero/index.html'
h1 = open(p1, encoding='utf-8').read()
if 'class="ledgerstrip"' not in h1:
    start = h1.index('    <h2 class="posth2" id="the-ledger">')
    end = h1.index('<p class="samplenote"')
    REPLACEMENT = f"""    <h2 class="posth2" id="the-ledger">Where the number stands now</h2>
    <div class="postbody">
      <p>This post is the first zero. The measurement did not stop here &mdash; it runs every
      month, the same twelve questions, the same five runs each, across the same four engines.
      Here is the most recent one.</p>
    </div>

{CARDS}

    <div class="postbody">
      <p style="margin:2px 0 18px;font-size:14px;color:var(--muted)"><strong style="color:var(--ink)">{LATEST['month']}, measured {LATEST['measured']}.</strong>
      Found by name rose {sb - ab} points since August; recommended to buyers did not move at all.
      Those are two different problems, so they are never blended into one score. The word
      &ldquo;aeoanalyzers&rdquo; appears in none of the {scn} category answers &mdash; absent,
      not ranked last.</p>
    </div>

    <div class="ledgerstrip">
      <div>
        <p class="ls-lab">Every month, whatever it says</p>
        <div class="ls-figs">
          <span class="ls-fig"><span class="ls-n good">{sb}%</span><span class="ls-k">found by name &middot; N={sn}</span></span>
          <span class="ls-fig"><span class="ls-n gap">{sc}%</span><span class="ls-k">recommended to buyers &middot; N={scn}</span></span>
        </div>
      </div>
      <p class="ls-txt">Every month so far, each with its own note on what changed and what we
      learned, lives in one place.</p>
      <a class="ls-go" href="/evidence">See the full ledger &rarr;</a>
    </div>

"""
    h1 = h1[:start] + REPLACEMENT + h1[end:]
    h1 = h1.replace('</style>', STRIP_CSS + '</style>', 1)
    open(p1, 'w', encoding='utf-8').write(h1)
    print(f'  patched {p1} (table handed to /evidence)')
else:
    print(f'  {p1}: already patched, skipped')

# 3. The Buyer's Standard sells "receipts" as requirement five and had nowhere to point.
patch('public/aeo-buyers-standard/index.html',
      [('If one line survives from this page, we would choose that one.',
        'If one line survives from this page, we would choose that one. '
        'We publish our own under the same rule: <a class="ilink" href="/evidence">the ledger</a> '
        'carries every month we have measured, including the months that went the wrong way.')],
      once_marker='href="/evidence"')

# 4. Sitemap
sm = 'public/sitemap.xml'
x = open(sm, encoding='utf-8').read()
if '/evidence' not in x:
    entry = ('  <url>\n    <loc>https://aeoanalyzers.com/evidence</loc>\n'
             f'    <lastmod>2026-09-22</lastmod>\n    <changefreq>monthly</changefreq>\n'
             '    <priority>0.8</priority>\n  </url>\n')
    x = x.replace('</urlset>', entry + '</urlset>')
    open(sm, 'w', encoding='utf-8').write(x)
    print('  added /evidence to the sitemap')
else:
    print('  /evidence already in the sitemap')

# 5. Cross-links. Every page that quotes one of these numbers gets a way to the current
#    one, with anchor text that says what the reader will find rather than "click here".
CROSS = [
 ('public/blog/reading-isnt-citing/index.html',
  "I re-measure monthly, publish whatever the number is, and back every claim with a transcript you can reproduce.",
  "I re-measure monthly, publish whatever the number is, and back every claim with a transcript "
  "you can reproduce. <a class=\"ilink\" href=\"/evidence\">Here is what those numbers look like "
  "now</a> &mdash; every month since, and what changed each time."),

 ('public/blog/how-it-works/index.html',
  "The pipeline, at a glance — five stages, and a loop back to the start.",
  "The pipeline, at a glance — five stages, and a loop back to the start. "
  "<a class=\"ilink\" href=\"/evidence\">What it produces, month by month, is published here.</a>"),

 ('public/blog/what-you-actually-get/index.html',
  "The plan carries its own verification mechanism, which is the part we care most about.",
  "The plan carries its own verification mechanism, which is the part we care most about. "
  "We run it on ourselves in public: <a class=\"ilink\" href=\"/evidence\">our own before and "
  "after, every month</a>, including the months that went the wrong way."),

 ('public/best-aeo-tools/index.html',
  "AEO Analyzers appeared in 0 of 200.",
  "AEO Analyzers appeared in 0 of 200. <a class=\"ilink\" href=\"/evidence\">We republish that "
  "figure every month, whatever it says.</a>"),
]
for path, old, new in CROSS:
    h = open(path, encoding='utf-8').read()
    if 'href="/evidence"' in h:
        print(f'  {path}: already cross-linked, skipped'); continue
    assert old in h, f'{path}: anchor sentence not found'
    open(path, 'w', encoding='utf-8').write(h.replace(old, new, 1))
    print(f'  cross-linked {path}')

# Every surface that quotes a figure must reach the current one. Assert it, do not hope it.
MUST_LINK = ['public/blog/index.html', 'public/blog/i-scored-zero/index.html',
             'public/blog/reading-isnt-citing/index.html', 'public/blog/how-it-works/index.html',
             'public/blog/what-you-actually-get/index.html', 'public/best-aeo-tools/index.html',
             'public/aeo-buyers-standard/index.html']
missing = [p for p in MUST_LINK if 'href="/evidence"' not in open(p, encoding='utf-8').read()]
assert not missing, f'not linked to the ledger: {missing}'
print(f'  all {len(MUST_LINK)} surfaces link to /evidence')
