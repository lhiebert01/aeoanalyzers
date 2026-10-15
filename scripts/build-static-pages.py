# -*- coding: utf-8 -*-
"""Build /methodology and /about (WO-AEO-POSITION-AND-PANEL-006 Item A).

Regenerated, never hand-edited, on the /evidence chassis (CSS, top bar, footer read from the built
/evidence page) so the three read as one site. The August drafts on gtm-drafts-aug13 were NOT merged as
they were: /methodology published the August anchor as 100% found by name (restated to 55% on 23 Sep)
and predated most of the current method; /about used a non-canonical Person @id and a comparison with
other tools that this site does not make. Figures are not printed here — /methodology links to
/evidence, where every figure is recomputed by the publication gate.
"""
import re, json
EV = open('public/evidence/index.html', encoding='utf-8').read()
CSS = EV[EV.index('<style>'):EV.index('</style>') + 8]
BAR = EV[EV.index('<body>'):EV.index('<div class="wrap">')]
FOOT = EV[EV.index('<footer class="sitefoot">'):EV.index('</footer>') + 9]
REVIEWED = '2026-10-15'
PERSON = {"@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert"}
ORG = {"@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC", "alternateName": "PI GenAI LLC", "url": "https://pigenai.com"}

def page(slug, title, desc, og_title, ld, eyebrow, h1, body):
    assert len(title) <= 65 and 50 <= len(desc) <= 160, (slug, len(title), len(desc))
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://aeoanalyzers.com/{slug}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://aeoanalyzers.com/{slug}">
<meta property="og:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Lindsay_Hiebert">
<meta name="twitter:creator" content="@Lindsay_Hiebert">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://aeoanalyzers.com/aeo-og.png">
<meta name="theme-color" content="#08343B">
<script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
</script>
{CSS}
</head>
{BAR}<div class="wrap">
  <article class="post">
    <div class="posteyebrow">{eyebrow}</div>
    <h1 class="posttitle">{h1}</h1>
    <p class="postmeta">Last reviewed {REVIEWED}</p>
    <div class="postbody">
{body}
    </div>
  </article>
</div>
{FOOT}
</body>
</html>
"""

METH = """      <p class="postlead"><strong>A URL, a few minutes, and every transcript behind every number. You decide what to fix, and who fixes it.</strong> We do not sell the fix, so the measurement has nothing to prove.</p>
      <p>How AEO Analyzers measures whether answer engines find, describe and recommend a business &mdash; what we ask, which engines, how many times, how we count, and what we refuse to claim. Every number we report is backed by a stored transcript you can re-read.</p>

      <h2 class="posth2">Three things, measured apart</h2>
      <p><strong>Found when asked by name.</strong> Asked about you by name, does the engine reach your own site? An answer counts only when your domain is among its sources or in its text; an engine that searched, did not find you and said so is a miss, even if its answer then described you from somewhere else.</p>
      <p><strong>Described accurately when named.</strong> Of the answers that named you, how many stated nothing your own site contradicts? It checks exactly what your site publishes in a form we can read &mdash; your brand name, and your founders when your site declares them &mdash; and says so beside the number. With no record of your site&rsquo;s own facts it is reported as unmeasured, never as 100%. It sits beside &ldquo;found by name&rdquo;; it does not replace it.</p>
      <p><strong>Recommended to new buyers.</strong> Asked the questions your buyers ask, without your name in them, does the engine recommend you or someone else by name? Only answers where the engine actually searched the web are scored. Who was named instead is counted from the answers themselves.</p>
      <p>The three are never blended into one score. Each has a different cause and a different fix, and a blended number hides which one you have.</p>

      <h2 class="posth2">The engines, and what they do not cover</h2>
      <p>Panel v1.1 &mdash; ChatGPT, Claude, Perplexity and Gemini &mdash; is our series of record. Panel v1.2 adds Grok and starts its own series from its own first date. Every result names the panel that produced it, and no change is ever computed between sweeps on different panels: when the set of engines changes, a shift could be the engines or the day, and we cannot tell which.</p>
      <p>Not covered by either panel: Google&rsquo;s AI Overviews, Google&rsquo;s AI Mode and Microsoft Copilot. The reason is plain: none of them has an API that returns its answer. The answer exists only on a results page, and what that page shows depends on who is signed in, where they are and what they searched before. Without an API we cannot ask the same question under the same conditions every time, so a figure for them could not be repeated or checked, and we do not publish figures that cannot be. We do not scrape those pages or imitate them. A different set of engines gives a different number &mdash; in our own September 2026 measurement, adding one engine to the same runs moved the category figure by 14 points &mdash; so the panel is stated on every result.</p>

      <h2 class="posth2">Test conditions</h2>
      <p><strong>No personalization.</strong> Every question is asked through each engine&rsquo;s API with web search on &mdash; no account, no chat history and no memory. Nothing a past conversation taught an engine can shape the answer, which is a stronger condition than logging out of a browser.</p>
      <p><strong>Location.</strong> The country is named inside each buyer question rather than left to account or device settings, and it is stated as a test condition on every result. Our own monthly series predates this rule and keeps its questions unchanged, so that series names no country; changing its questions now would break the comparison it exists to make.</p>
      <p><strong>Grok model.</strong> Panel v1.2 asks grok-4.7, not the cheaper grok-4.3. On the same 12 questions on 14 October 2026, grok-4.7 cited 27 sources per answer on average and grok-4.3 cited 3; the sources are what the &ldquo;who gets cited instead&rdquo; findings are built from, so the panel keeps the model that reads more of the web.</p>

      <h2 class="posth2">The questions</h2>
      <p>Questions are written the way a buyer asks an assistant, not as keywords. Each one is tagged by the buyer intent it carries &mdash; <em>shortlist</em> (who are the options), <em>constraint</em> (options under a hard requirement such as price, size or compliance), <em>alternatives</em> (replacing a named option), <em>comparison</em> (choosing between named options) and <em>problem</em> (describing a situation rather than asking for names) &mdash; and the mix is shown on every panel, so you can see whether you are being measured on the questions closest to a purchase. A panel is versioned; when a question changes, the version changes, and the months either side are not compared.</p>

      <h2 class="posth2">Repetition, N and confidence</h2>
      <p>Engines answer the same question differently from one run to the next, so one answer proves nothing. Every question is asked several times on every engine, and every figure carries its N with a line saying what N is made of &mdash; how many questions, engines and runs, how many answers were scored, and how many were left out and why. Confidence is high from 12 answers &mdash; for example, one question across four engines, three runs each &mdash; medium from 6 to 11, and low under 6.</p>
      <p>A worked example of how much the engine panel and run-to-run drift move a figure, with one stored answer quoted in full: <a class="ilink" href="/blog/the-measurement-layer">We built an AI visibility tool. Then we tested ourselves</a>.</p>

      <h2 class="posth2">What is left out, and why</h2>
      <ul class="lessons">
        <li><b>Answers from memory.</b><span>An engine that answered without searching is reported separately as &ldquo;answered from memory&rdquo; and never counted as a zero.</span></li>
        <li><b>Failed calls.</b><span>A run that hit a rate limit or timed out is excluded, not scored as a miss.</span></li>
        <li><b>Cut-off answers.</b><span>An answer stopped by the length cap is not scored.</span></li>
      </ul>

      <h2 class="posth2">Reproducibility</h2>
      <p>Every answer is stored with its question, engine, date and sources. Each stored sweep records which scoring rules it was scored under; when a sweep is reopened under newer rules and a figure moves, the old and new figures and the reason are recorded on it, so the number you saw last month and the number you see now can always be reconciled.</p>
      <p>We run this method on our own site every month and publish the result whatever it says: <a class="ilink" href="/evidence">the Honest-Zero ledger</a>.</p>

      <h2 class="posth2">What we do not claim</h2>
      <p>We do not know how any engine ranks its sources, and we do not pretend to. We report what the engines actually said when asked. No method guarantees that an engine will recommend a business, and nothing here promises it.</p>
      <p class="ledgernote">AEO Analyzers (aeoanalyzers.com) was created and is solely maintained by Lindsay Hiebert, founder of PIGENAI LLC. It is unaffiliated with any similarly named browser extension, plugin or tool.</p>"""

ABOUT = """      <p class="postlead">AEO Analyzers is built and operated by PIGENAI LLC, and was created and is solely maintained by Lindsay Hiebert, CISSP. One person builds it, stands behind every number, and publishes the method &mdash; including the parts that do not flatter it.</p>

      <h2 class="posth2">The record</h2>
      <p>More than 30 years across telecom, networking, AI and cybersecurity &mdash; beginning with AT&amp;T, Verizon and T-Mobile, then:</p>
      <ul class="lessons">
        <li><b>Chief Marketing &amp; AI Officer, Nybsys (2025&ndash;present)</b><span>GenAI and private-5G product strategy and go-to-market for Tier-1 carriers and enterprises.</span></li>
        <li><b>Senior Product Manager, Invisinet Technologies (2023&ndash;2025)</b><span>Zero-Trust network security (First Packet Authentication).</span></li>
        <li><b>Senior Product Manager, Intel &mdash; AI, Network &amp; Edge (2015&ndash;2023)</b><span>Grew the Intel Network Builders ecosystem to 550+ partners.</span></li>
        <li><b>Senior Product Marketing / Market Manager, Cisco Systems (1999&ndash;2014)</b><span>Unified Communications.</span></li>
        <li><b>CISSP &middot; MBA &middot; M.S.</b><span>Security, business and engineering credentials.</span></li>
        <li><b>Founder, PIGENAI LLC</b><span>A portfolio of applied-AI and AI-governance products, built hands-on.</span></li>
      </ul>

      <p><strong>A URL, a few minutes, and every transcript behind every number. You decide what to fix, and who fixes it.</strong> We do not sell the fix, so the measurement has nothing to prove.</p>

      <h2 class="posth2">Why this product exists</h2>
      <p>Buyers now ask AI assistants the questions a business exists to answer, and the engines answer with or without it. AEO Analyzers measures what they say &mdash; whether ChatGPT, Claude, Perplexity and Gemini find a business by name, describe it accurately, and recommend it when buyers ask &mdash; reports those apart, each with its own fix path, and backs every figure with a stored transcript. The method is public on <a class="ilink" href="/methodology">the methodology page</a>; the founder runs it on this site and publishes the number every month on <a class="ilink" href="/evidence">the ledger</a>, whatever it is.</p>

      <h2 class="posth2">The company</h2>
      <p>PIGENAI LLC is a Missouri company, formed in December 2025, that builds and operates a portfolio of practical AI products, of which AEO Analyzers is one. More at <a class="ilink" href="https://pigenai.com">pigenai.com</a>.</p>
      <p><a class="ilink" href="https://www.linkedin.com/in/lindsayhiebert/">LinkedIn &rarr;</a> &middot; <a class="ilink" href="https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url">Verify CISSP (Credly) &rarr;</a></p>
      <p class="ledgernote">AEO Analyzers (aeoanalyzers.com) was created and is solely maintained by Lindsay Hiebert, founder of PIGENAI LLC. There are no co-founders. It is unaffiliated with any similarly named browser extension, plugin or tool.</p>"""

meth_ld = {"@context": "https://schema.org", "@type": "TechArticle", "headline": "How AEO Analyzers measures", "url": "https://aeoanalyzers.com/methodology",
           "dateModified": REVIEWED, "author": PERSON, "publisher": ORG, "isPartOf": {"@type": "WebSite", "@id": "https://aeoanalyzers.com/#website", "url": "https://aeoanalyzers.com"}}
about_ld = {"@context": "https://schema.org", "@type": "AboutPage", "url": "https://aeoanalyzers.com/about", "dateModified": REVIEWED,
            "mainEntity": {**PERSON, "jobTitle": "Founder & Sole Creator, AEO Analyzers", "worksFor": ORG,
                           "sameAs": ["https://www.linkedin.com/in/lindsayhiebert/", "https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url", "https://x.com/Lindsay_Hiebert"]}}

import os
for slug, html in [
    ('methodology', page('methodology', 'Methodology: How AEO Analyzers Measures', 'What we ask, which engines, how many times, how we count and what we refuse to claim. Every figure backed by a stored transcript.', 'How AEO Analyzers measures', meth_ld, 'AEO Analyzers &middot; Methodology', 'How AEO Analyzers measures', METH)),
    ('about', page('about', 'About AEO Analyzers and Its Founder, Lindsay Hiebert', 'Who builds AEO Analyzers: Lindsay Hiebert, CISSP, sole creator, and PIGENAI LLC. The record, why the product exists, and the company.', 'About AEO Analyzers', about_ld, 'AEO Analyzers &middot; About', 'The founder behind AEO Analyzers', ABOUT)),
]:
    os.makedirs(f'public/{slug}', exist_ok=True)
    open(f'public/{slug}/index.html', 'w', encoding='utf-8').write(html)
    print(f'  wrote public/{slug}/index.html ({len(html.encode())} bytes)')

# sitemap: one entry each, never duplicated
sm = open('public/sitemap.xml', encoding='utf-8').read()
for slug in ['methodology', 'about']:
    loc = f'https://aeoanalyzers.com/{slug}'
    if f'<loc>{loc}</loc>' in sm:
        sm = re.sub(r'(<loc>' + re.escape(loc) + r'</loc>\s*<lastmod>)\d{4}-\d\d-\d\d', r'\g<1>' + REVIEWED, sm)
    else:
        sm = sm.replace('</urlset>', f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{REVIEWED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>')
open('public/sitemap.xml', 'w', encoding='utf-8').write(sm)
print('  sitemap: /methodology and /about present')
