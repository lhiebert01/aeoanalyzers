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
    r" (?:specifically )?(?:at|about|for)|don'?t have (?:any )?(?:specific )?information"
    r"|(?:do not|don'?t|does not|doesn'?t) (?:contain|include|mention|have) (?:any )?(?:specific )?information (?:about|on|for))", re.I)

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

AUG_F, SEP_F, OCT_F, NOV_F = 'aeoanalyzers-SERIES-ANCHOR-2026-08-01.json', 'aeoanalyzers-2026-09-01.json', 'aeoanalyzers-2026-10-08.json', 'aeoanalyzers-2026-11-01.json'
ab, an = branded(AUG_F); ac, acn, anamed, ahosts = category(AUG_F)
sb, sn = branded(SEP_F); sc, scn, snamed, shosts = category(SEP_F)
ob, on = branded(OCT_F); oc, ocn, onamed, ohosts = category(OCT_F)
nb, nn = branded(NOV_F); nc, ncn, nnamed, nhosts = category(NOV_F)
total = len(json.load(open(f'{BASE}/{NOV_F}'))['runs'])

def found_by_engine(f, e):
    return sum(1 for r in runs(f, 'branded') if r['engine'] == e and r.get('domainCited') and not NOT_FOUND.search(r.get('transcript') or ''))

def accuracy(f):
    # WO-AEO-BRANDED-ACCURACY-004: counts are computed in TypeScript from the transcripts and the
    # stored site facts (scripts/finalize-selfsweep.ts) and RE-computed by the publication gate
    # (publishedFigures.test.ts); this page only renders the stored, gate-verified counts.
    a = json.load(open(f'{BASE}/{f}'))['accuracyWhenNamed']
    return a['accurate'], a['named']
aa, aan = accuracy(AUG_F); sa, san = accuracy(SEP_F); oa, oan = accuracy(OCT_F); na, nan = accuracy(NOV_F)
assert (na, nan, oa, oan, sa, san, aa, aan) == (30, 40, 40, 40, 31, 32, 40, 40), (na, nan, oa, oan, sa, san, aa, aan)

# The latest month, everywhere the page or a summary card quotes "now".
lb, ln, lc, lcn, lhosts = nb, nn, nc, ncn, nhosts

assert (ab, sb, ob, nb) == (55, 80, 88, 78), (ab, sb, ob, nb)
assert (ac, sc, oc, nc) == (0, 0, 0, 0) and (anamed, snamed, onamed, nnamed) == (0, 0, 0, 0)
assert (ahosts, shosts, ohosts, nhosts) == (296, 215, 264, 256)
n_gpt, o_gpt = found_by_engine(NOV_F, 'openai'), found_by_engine(OCT_F, 'openai')
assert (n_gpt, o_gpt) == (1, 5), (n_gpt, o_gpt)

MONTHS = [
 dict(month='August 2026', measured='1 Aug 2026', b=ab, bn=an, c=ac, cn=acn, acc=(aa, aan), file=AUG_F, restated=True,
      note=("Series anchor. Two engines returned the site every time, two almost never. Published "
            "at the time as 100% under a looser rule that counted an answer describing us from our "
            "parent company&rsquo;s site rather than our own. Restated here so the column compares "
            "like with like.")),
 dict(month='September 2026', measured='2 Sep 2026', b=sb, bn=sn, c=sc, cn=scn, acc=(sa, san), file=SEP_F, restated=False,
      note=("Found by name far more often &mdash; ChatGPT went from 2 of 10 to 10 of 10. Recommended "
            "to category buyers still zero times: the word &ldquo;aeoanalyzers&rdquo; appears in none "
            f"of the {scn} answers. Absent, not ranked last. Meanwhile one engine now replies that it "
            "cannot find the domain at all and offers two similarly-named sites instead &mdash; a "
            "buyer typing our name, sent elsewhere.")),
 dict(month='October 2026', measured='8 Oct 2026', b=ob, bn=on, c=oc, cn=ocn, acc=(oa, oan), file=OCT_F, restated=False,
      note=(f"Found by name rose to {ob}%. Claude, which returned the site 2 times in 10 in September, "
            "returned it 10 times in 10. ChatGPT went the other way, from 10 of 10 to 5 of 10. Recommended "
            f"to category buyers: still zero &mdash; &ldquo;aeoanalyzers&rdquo; appears in none of the {ocn} "
            f"answers. None of the {oan} answers that named us gave a wrong brand name or invented a founder; "
            "September&rsquo;s invented co-founder did not recur.")),
 dict(month='November 2026', measured='1 Nov 2026', b=nb, bn=nn, c=nc, cn=ncn, acc=(na, nan), file=NOV_F, restated=False,
      note=(f"Found by name: {nb}% ({round(nb * nn / 100)} of {nn}). ChatGPT returned the site {n_gpt} time in 10, against "
            f"{o_gpt} of 10 in October; Claude, Perplexity and Gemini returned it every time. Recommended to category "
            f"buyers: still zero &mdash; &ldquo;aeoanalyzers&rdquo; appears in none of the {ncn} answers. Described "
            f"accurately in {na} of {nan}: Claude called the product an &ldquo;AI simulation engine&rdquo;, a name the site "
            "retired on October 15th, in all ten of its answers, and quoted earlier prices in some of them (counted under "
            "the rule of November 1st, which matches a retired name in any letter case). Dated actions between the October "
            "and November measurements, from our Record: October 14th, the Measurement Layer post; October 15th, the price "
            "cleanup, the fifth-engine post, the Expo one-pager, Wikidata entries for the company and the product, and the "
            "AlternativeTo listing. This month&rsquo;s post: <a class=\"ilink\" href=\"/blog/found-not-recommended\">Optimizing "
            "your website gets you found. It does not get you recommended.</a>")),
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
  f"Found by name has moved every month: {ab}% in August, {sb}% in September, {ob}% in October, {nb}% in November. Recommended to buyers has not moved at all. Two "
  "different problems with two different fixes, which is why they are never blended into one score."),
 ("The sources the engines draw on keep changing.",
  f"Across the same {scn} category questions, the number of distinct sites cited as sources was "
  f"{ahosts} in August, {shosts} in September, {ohosts} in October and {nhosts} in November. The doors move; none of them is ours yet."),
]

GH = 'https://github.com/lhiebert01/aeoanalyzers/blob/main/docs/baselines'

# WO-012 D: from the 25 Oct 2026 self-sweep on, each monthly row adds the Source coverage line,
# read from the committed baseline (scripts/finalize-selfsweep.ts files it). No backfill: earlier
# months have no coverage on their baseline, so they print nothing.
def coverage_line(m):
    try:
        sc = json.load(open(f"docs/baselines/{m['file']}", encoding='utf-8')).get('sourceCoverage')
    except Exception:
        sc = None
    if not sc:
        return ''
    return f" Named on {sc['named']} of {sc['recurringPages']} recurring pages engines read for our category questions."


def rows():
    out = []
    for i, m in enumerate(MONTHS):
        # Green only when the latest month actually rose; a fall is shown plainly, not dressed as a gain.
        tone = 'up' if i == len(MONTHS) - 1 and i > 0 and m['b'] > MONTHS[i - 1]['b'] else 'flat'
        tag = ' <span class="tag">restated</span>' if m['restated'] else ''
        out.append(f"""        <tr>
          <td class="mo">{m['month']}</td>
          <td data-label="Found by name"><span class="fig {tone}">{m['b']}%</span><span class="nn">N={m['bn']}</span></td>
          <td data-label="Described accurately when named"><span class="fig flat">{round(100 * m['acc'][0] / m['acc'][1])}%</span><span class="nn">{m['acc'][0]} of {m['acc'][1]} named</span></td>
          <td data-label="Recommended to buyers"><span class="fig flat">{m['c']}%</span><span class="nn">N={m['cn']}</span></td>
          <td class="when" data-label="Measured">{m['measured']}<br><a class="ilink" href="{GH}/{m['file']}">transcripts</a></td>
          <td data-label="What changed"><p class="ledgernote">{tag}{m['note']}{coverage_line(m)}</p></td>
        </tr>""")
    return '\n'.join(out)

# ---- 13 Oct 2026 panel test (engine panel v1.2 day-0). NOT a monthly series point.
PT_F = 'aeoanalyzers-panel-v1.2-day0-2026-10-13.json'
_pt = json.load(open(f'{BASE}/{PT_F}'))
def _pt_figs(keep):
    rs = [r for r in _pt['runs'] if keep(r) and not (r.get('errored') or (r.get('transcript') or '').startswith('[error'))]
    b = [r for r in rs if r['queryType'] == 'branded']
    c = [r for r in rs if r['queryType'] == 'category']
    bh = sum(1 for r in b if r.get('domainCited') and not NOT_FOUND.search(r.get('transcript') or ''))
    ch = sum(1 for r in c if r.get('domainCited'))
    return round(100 * bh / len(b)), len(b), round(100 * ch / len(c)), len(c)
pt4 = _pt_figs(lambda r: r['engine'] != 'grok')
pt5 = _pt_figs(lambda r: True)
pt_acc = (_pt['accuracyWhenNamed']['accurate'], _pt['accuracyWhenNamed']['named'])
assert pt4 == (75, 40, 0, 200) and pt5 == (80, 50, 0, 249) and pt_acc == (50, 50), (pt4, pt5, pt_acc)
# The exhibit quoted in /blog/the-measurement-layer: one stored, search-grounded category answer.
# ---- WO-012 F: across other companies (approved for publication by the founder, 2026-11-01). ----
BM_F = 'benchmark-found-vs-recommended-2026-10-15.json'
_bm = json.load(open(f'{BASE}/{BM_F}'))['companies']
import statistics as _st
_bf = [100 * c['foundByName']['cited'] / c['foundByName']['n'] for c in _bm]
_br = [100 * c['recommended']['cited'] / c['recommended']['n'] for c in _bm]
bm_n, bm_found, bm_rec = len(_bm), round(_st.median(_bf)), round(_st.median(_br))
bm_gap = sum(1 for f, r in zip(_bf, _br) if f - r >= 50)
bm_lo, bm_hi = min(c['storedAnswers'] for c in _bm), max(c['storedAnswers'] for c in _bm)
bm_from, bm_to = min(c['sweepDate'] for c in _bm), max(c['sweepDate'] for c in _bm)
# The approved wording carries these exact figures; a change in the data must fail the build.
assert (bm_n, bm_found, bm_rec, bm_gap, bm_lo, bm_hi, bm_from, bm_to) == (11, 100, 28, 6, 48, 84, '2026-07-26', '2026-10-08'), (bm_n, bm_found, bm_rec, bm_gap, bm_lo, bm_hi, bm_from, bm_to)
BENCH = f"""      <h2 class="posth2" id="across-other-companies">Across other companies</h2>
      <p>In the latest four-engine sweep of each of {bm_n} companies we have measured (July 26 to October 8, 2026; {bm_lo} to {bm_hi} stored answers each), the median company was found by name in {bm_found}% of answers and recommended in {bm_rec}% of category answers. For {bm_gap} of the {bm_n}, the found-by-name rate was at least 50 points above the recommendation rate. Companies are not named, and our own products are not included. Every figure is re-scored from that company&rsquo;s stored answers under the scoring rules of October 15th, 2026.</p>
      <p class="ledgernote">Every company&rsquo;s counts, with its sweep date and denominators: <a class="ilink" href="{GH}/{BM_F}">the data file</a>.</p>
"""

EX_Q = 'how to monitor if my brand appears in ChatGPT and Claude responses'
_ex = [r for r in _pt['runs'] if r['engine'] == 'perplexity' and r['queryType'] == 'category'
       and r['query'] == EX_Q and r['runIndex'] == 3]
assert len(_ex) == 1 and _ex[0]['searchInvoked'] and not _ex[0]['domainCited']
EX = _ex[0]
assert 'aeoanalyzers' not in EX['transcript'].lower() and not re.search(r'\$|\bfree\b|pric|afford|budget', EX['transcript'], re.I)
import html as _h
EX_TEXT = '<br>'.join(_h.escape(l.strip()) for l in EX['transcript'].split('\n') if l.strip())
EX_TEXT = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', EX_TEXT)
EX_SOURCES = '\n'.join(f'          <li><a class="ilink" href="{_h.escape(u)}" rel="nofollow">{_h.escape(u)}</a></li>' for u in EX['sources'])

LATEST = MONTHS[-1]
CARDS = f"""    <div class="score" aria-label="Latest measurement: {LATEST['month']}, {total} stored answers across four answer engines">
      <div class="tile good"><div class="lab">Found by name</div><div class="num">{lb}%</div><div class="note">N={ln} &middot; {ob}% in October, {sb}% in September, {ab}% in August</div></div>
      <div class="tile gap"><div class="lab">Recommended to buyers</div><div class="num">{lc}%</div><div class="note">N={lcn} &middot; unchanged since the first measurement</div></div>
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
/* Nov 2026: the table breaks out of the 720px article column to the page width, columns are
   fixed pixels, Month never wraps, and "What changed" takes the remaining width and wraps. */
.ledger.wide{overflow:visible;position:relative;left:50%;transform:translateX(-50%);
  width:min(1140px,calc(100vw - 40px))}
.ledger.wide table{min-width:0;width:100%}
.ledger.wide col.c-mo{width:150px}.ledger.wide col.c-fig{width:108px}.ledger.wide col.c-acc{width:132px}
.ledger.wide col.c-rec{width:136px}.ledger.wide col.c-when{width:116px}
.ledger.wide td{overflow-wrap:anywhere;word-break:normal}
.ledger.wide th{overflow-wrap:normal;word-break:normal;hyphens:none}
.ledger.wide td.mo{white-space:nowrap;overflow-wrap:normal}
.ledger.wide .ledgernote{max-width:none}
/* Narrow screens: one stacked card per month. */
@media(max-width:820px){
  .ledger.wide{left:auto;transform:none;width:auto}
  .ledger.wide table,.ledger.wide tbody,.ledger.wide tr,.ledger.wide td{display:block;width:auto}
  .ledger.wide table{background:none;box-shadow:none;border-radius:0;overflow:visible}
  .ledger.wide thead,.ledger.wide colgroup{display:none}
  .ledger.wide tbody tr{background:var(--card);border:1px solid var(--edge);border-radius:12px;
    box-shadow:var(--card-shadow);margin:0 0 14px;overflow:hidden}
  .ledger.wide tbody tr:nth-child(even){background:var(--card)}
  .ledger.wide td{border-right:0;border-bottom:1px solid var(--hair);padding:10px 16px}
  .ledger.wide td:last-child{border-bottom:0}
  .ledger.wide td.mo{font-size:18px;background:var(--panel)}
  .ledger.wide td[data-label]::before{content:attr(data-label);display:block;font-size:11.5px;
    font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 0 3px}
  .ledger.wide .when{white-space:normal}
}
</style>"""

BAR  = src[src.index('<body>'):src.index('<div class="wrap">')]
FOOT = src[src.index('<footer class="sitefoot">'):src.index('</footer>') + 9]

DESC = (f"Our own answer-engine visibility, re-measured every month and published whatever it "
        f"says. {LATEST['month']}: found by name {lb}% of {ln} runs, recommended to category buyers "
        f"{lc}% of {lcn}. Same twelve-question panel, five runs each, four engines, every answer stored.")

# SERP-fit head (≤65-char title, 50–160-char description — serpMeta.test.ts). These were trimmed by
# hand on 30 Sep 2026 and lost when the page was rebuilt on 8 Oct; they now live in the builder.
TITLE = 'The Honest-Zero Ledger: Our Own Numbers, Monthly'
META_DESC = ('Our answer-engine visibility, re-measured every month the same way and published whatever it '
             'says: found by name, recommended to buyers, N on every figure.')
assert len(TITLE) <= 65 and 50 <= len(META_DESC) <= 160

PAGE = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{TITLE}</title>
<meta name="description" content="{META_DESC}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://aeoanalyzers.com/evidence">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="The Honest-Zero ledger: our own numbers, every month">
<meta property="og:description" content="{META_DESC}">
<meta property="og:url" content="https://aeoanalyzers.com/evidence">
<meta property="og:image" content="https://aeoanalyzers.com/og-evidence-ledger.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="AEO Analyzers: the Honest-Zero ledger, our own numbers published every month">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Lindsay_Hiebert">
<meta name="twitter:creator" content="@Lindsay_Hiebert">
<meta name="twitter:title" content="The Honest-Zero ledger: our own numbers, every month">
<meta name="twitter:description" content="{META_DESC}">
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
  "creator": {{ "@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert", "url": "https://www.linkedin.com/in/lindsayhiebert/" }},
  "publisher": {{
    "@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC", "alternateName": "PI GenAI LLC", "url": "https://pigenai.com",
    "logo": {{ "@type": "ImageObject", "url": "https://aeoanalyzers.com/aeo-analyzers-logo-512.png", "width": 512, "height": 512 }}
  }},
  "temporalCoverage": "2026-08-01/2026-10-08",
  "variableMeasured": [
    {{ "@type": "PropertyValue", "name": "Branded retrievability", "value": {lb}, "unitText": "PERCENT",
      "description": "Share of branded runs in which the engine reached aeoanalyzers.com. N={ln}." }},
    {{ "@type": "PropertyValue", "name": "Described accurately when named", "value": {round(100 * oa / oan)}, "unitText": "PERCENT",
      "description": "Of the answers that named AEO Analyzers, the share that stated nothing its own site contradicts on its brand name and founder. N={oan}." }},
    {{ "@type": "PropertyValue", "name": "Category citation win", "value": {lc}, "unitText": "PERCENT",
      "description": "Share of unbranded category runs in which the engine recommended aeoanalyzers.com. N={lcn}." }}
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
      <div class="ledger wide">
        <table>
          <colgroup>
            <col class="c-mo"><col class="c-fig"><col class="c-acc"><col class="c-rec"><col class="c-when"><col>
          </colgroup>
          <thead><tr>
            <th scope="col">Month</th>
            <th scope="col">Found by name</th>
            <th scope="col">Described accurately when named</th>
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
      <p class="ledgernote"><strong>Described accurately when named</strong> was added in October 2026. Of
      the answers that named us, it is the share that stated nothing our own site contradicts &mdash; and
      it checks our brand name and our founder, as our site publishes them; from October 15th, 2026 it also
      checks our published prices, our free allowance and product names the site has retired, so November
      is the first month counted under that wider check. It sits beside &ldquo;found by name&rdquo; and
      replaces nothing. For August and September the site&rsquo;s facts were not captured at the time, so
      those months are checked against the site as read on 8 October 2026; the brand name and founder it
      checks have not changed.</p>

      <h2 class="posth2" id="panel-test-2026-10-13">One more run, 13 October 2026: four engines, then five</h2>
      <p>On 13 October 2026 we asked the same pinned questions again, five runs each, and added Grok as a
      fifth engine. This is a test of the engine panel, not a monthly point in the ledger above: the
      ledger stays on the same four engines so each month compares with the last.</p>
      <ul class="lessons">
        <li><b>Four engines (ChatGPT, Claude, Perplexity, Gemini).</b><span>Found by name in {pt4[0]}% of {pt4[1]} answers. Recommended in {pt4[2]}% of {pt4[3]} category answers.</span></li>
        <li><b>Five engines (the same four plus Grok).</b><span>Found by name in {pt5[0]}% of {pt5[1]} answers. Recommended in {pt5[2]}% of {pt5[3]} category answers. Every one of the {pt_acc[1]} answers that named us described us accurately. Since 15 October 2026 the check covers our prices, plan names and free allowance as well as the company name and founder; re-scored under it, these answers are unchanged, because they quoted the prices in force that day.</span></li>
        <li><b>Five days apart, the same four engines gave {ob}% and {pt4[0]}%.</b><span>Found by name was {ob}% on 8 October and {pt4[0]}% on 13 October, each of 40 answers, which is why no single run is read as a trend.</span></li>
      </ul>
      <p class="ledgernote"><strong>Panel effect and drift, measured 7 September 2026 on seven software companies.</strong>
      In one run on one date, adding a fourth engine to the same answers moved the average category
      recommendation rate by 14.0 points. Repeating the three-engine run the same day moved the average
      by 0.9 points, while single companies moved by as much as 17 points. The 13 October figures are
      recomputed from <a class="ilink" href="{GH}/{PT_F}">the stored transcripts</a>; the 7 September figures
      are from <a class="ilink" href="https://github.com/lhiebert01/aeoanalyzers/blob/main/docs/FINDING-PANEL-COMPOSITION-2026-09-08.md">the written finding</a>.
      A worked example of reading this run, transcript first: <a class="ilink" href="/blog/the-measurement-layer">We built an AI visibility tool. Then we tested ourselves</a>.</p>
      <div class="ledger" id="exhibit-2026-10-13">
        <p class="ledgernote"><strong>One stored answer from that run, in full.</strong> Perplexity, searched the web,
        13 October 2026. Question, with no company named: &ldquo;{_h.escape(EX_Q)}&rdquo;</p>
        <blockquote class="ledgernote">{EX_TEXT}</blockquote>
        <p class="ledgernote">AEO Analyzers was not recommended. Sources the engine cited, as stored:</p>
        <ul class="ledgernote">
{EX_SOURCES}
        </ul>
      </div>

{BENCH}
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
    by Lindsay Hiebert, founder of PIGENAI LLC. It is unaffiliated with any similarly named browser
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
print(f'  latest: branded {lb}% N={ln} | accurate {oa}/{oan} | category {lc}% N={lcn} | {total} answers')

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
        <span class="ls-fig"><span class="ls-n good">{lb}%</span><span class="ls-k">found by name &middot; N={ln}</span></span>
        <span class="ls-fig"><span class="ls-n gap">{lc}%</span><span class="ls-k">recommended to buyers &middot; N={lcn}</span></span>
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
#    Monthly refresh: the strip is REGENERATED every run (it was write-once, so October would
#    have left September's figures on the blog index).
# WO-016: the blog index is sectioned by scripts/build-blog-chrome.mjs, which places this strip at
# the top of "The Honest-Zero ledger" section. This script writes the strip to docs/ledger-strip.html
# every run (monthly figures) and no longer edits the index's layout itself.
open('docs/ledger-strip.html', 'w', encoding='utf-8').write(STRIP)
print('  wrote docs/ledger-strip.html (placed by build-blog-chrome.mjs)')
patch('public/blog/index.html',
      [
       ('<a href="/blog/i-scored-zero#the-ledger">the running ledger</a>',
        '<a href="/evidence">the running ledger</a>')],
      css=STRIP_CSS, once_marker='class="ledgerstrip"')

# 2. Part 1 — keep the cards and the month's note, hand the table to /evidence.
p1 = 'public/blog/i-scored-zero/index.html'
h1 = open(p1, encoding='utf-8').read()
if True:  # regenerated every run (monthly refresh); the first run also handed the table to /evidence
    first = 'class="ledgerstrip"' not in h1
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
      Found by name: {lb}% in November, {ob}% in October, {sb}% in September, {ab}% in August. Recommended to buyers
      did not move at all. Those are two different problems, so they are never blended into one
      score. The word &ldquo;aeoanalyzers&rdquo; appears in none of the {lcn} category answers
      &mdash; absent, not ranked last. On 13 October we re-measured on the same four engines and
      again with a fifth added; the figures, one stored answer in full and what they mean are in
      <a class="ilink" href="/blog/the-measurement-layer">We built an AI visibility tool. Then we tested ourselves</a>.</p>
    </div>

    <div class="ledgerstrip">
      <div>
        <p class="ls-lab">Every month, whatever it says</p>
        <div class="ls-figs">
          <span class="ls-fig"><span class="ls-n good">{lb}%</span><span class="ls-k">found by name &middot; N={ln}</span></span>
          <span class="ls-fig"><span class="ls-n gap">{lc}%</span><span class="ls-k">recommended to buyers &middot; N={lcn}</span></span>
        </div>
      </div>
      <p class="ls-txt">Every month so far, each with its own note on what changed and what we
      learned, lives in one place.</p>
      <a class="ls-go" href="/evidence">See the full ledger &rarr;</a>
    </div>

    <div class="postbody">
      <p><em>Updated October 2026: Pro and Business ask five answer engines, now including Grok. See <a href="/blog/the-fifth-engine">We added a fifth AI engine</a>.</em></p>
    </div>


"""
    h1 = h1[:start] + REPLACEMENT + h1[end:]
    if first: h1 = h1.replace('</style>', STRIP_CSS + '</style>', 1)
    open(p1, 'w', encoding='utf-8').write(h1)
    print(f'  {"patched" if first else "refreshed"} {p1}')

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
