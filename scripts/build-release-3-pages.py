#!/usr/bin/env python3
"""WO-AEO-EIN-READY-001 (Release 3, Dec 8 2026): build the static documents for the EIN release.

Sources of record (docs/launch/aeo-release-3/):
  assets/Release-3-AEO-Analyzers-Body.md            -> /blog/aeo-analyzers-five-engines
  assets/Founder-Blog-Being-Found-Is-Not-Being-Recommended.md -> /blog/being-found-is-not-being-recommended
  demo-sweep-2026-10-13.json (stored self-sweep, classified by src/lib code) -> /citation-sweep-example
  this file                                        -> /press, /contact
Release and founder text is rendered word for word: the converter only maps Markdown structure
(paragraphs, bold heading lines, lists, links) to HTML. The site style and header are taken from an
existing post so every page matches; the footer is filled by scripts/build-blog-chrome.mjs.
Re-run after any change to a source:  python3 scripts/build-release-3-pages.py
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs/launch/aeo-release-3")
SITE = "https://aeoanalyzers.com"
TEMPLATE = open(os.path.join(ROOT, "public/blog/the-fifth-engine/index.html"), encoding="utf-8").read()
STYLE = re.search(r"<style>[\s\S]*?</style>", TEMPLATE).group(0)
HEADER = re.search(r"<!--wo016:header-->[\s\S]*?<!--/wo016:header-->", TEMPLATE).group(0)
# YouTube overview: set the id when Lindsay sends the link (item 8); empty = not embedded yet.
VIDEO_ID = os.environ.get("R3_VIDEO_ID", "yTujm_lTNJE").strip()  # https://youtu.be/yTujm_lTNJE (re-recorded, Nov 26 2026); 990LJW3q6UU retired
VIDEO_UPLOADED = "2026-11-26T11:01:58-08:00"  # from the public YouTube watch page
VIDEO_DURATION = "PT2M25S"
CAPTIONS = [l.strip() for l in open(os.path.join(ROOT, "docs/launch/aeo-release-3/assets/Video-Captions-AS-SPOKEN.txt"), encoding="utf-8") if l.strip()]
IMG = "/press/release-3"
HERO = f"{IMG}/AEO-Analyzers-Hero-1600x900.png"
ORG = {"@type": "Organization", "@id": "https://pigenai.com/#org", "name": "PIGENAI LLC", "url": "https://pigenai.com"}
PERSON = {"@type": "Person", "@id": "https://pigenai.com/#lindsay", "name": "Lindsay Hiebert", "jobTitle": "Founder and CEO, PIGENAI LLC",
          "sameAs": ["https://www.linkedin.com/in/lindsayhiebert/"]}
RELEASE_URL = "/blog/aeo-analyzers-five-engines"
FOUNDER_URL = "/blog/being-found-is-not-being-recommended"
DEMO_URL = "/citation-sweep-example"
HEADLINE = "AEO Analyzers Expands AI Visibility Measurement to Five Answer Engines"
SUMMARY = ("Website diagnostics identify improvements while Citation Sweeps record how AI engines describe, "
           "recommend and cite businesses in tested answers.")
DATELINE = "KANSAS CITY, MO, UNITED STATES, December 8, 2026."
PAGE_CSS = """<style>
.r3 .postbody h2{font-family:var(--serif);font-weight:600;font-size:24px;margin:34px 0 12px}
.r3 .postbody ol,.r3 .postbody ul{font-size:17px;max-width:68ch;padding-left:1.3em;margin:0 0 16px}
.r3 .postbody li{margin:0 0 8px}
.r3 .postbody a{color:var(--teal);text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
.r3 .subtitle{font-family:var(--serif);font-size:21px;color:var(--muted);margin:0 0 10px}
.r3 .dateline{font-weight:700}
.r3 .postfig img{max-width:100%}
.r3 .vid{position:relative;margin:26px 0;border-radius:14px;overflow:hidden;border:1px solid var(--hair);aspect-ratio:16/9;background:#000}
.r3 .vid button{all:unset;cursor:pointer;position:absolute;inset:0;display:block}
.r3 .vid img{width:100%;height:100%;object-fit:cover;display:block}
.r3 .vid .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#08343B;color:#fff;font-weight:700;font-size:15px;padding:12px 20px;border-radius:999px}
.r3 .vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.r3 table.data{width:100%;border-collapse:collapse;font-size:14.5px;margin:10px 0 22px}
.r3 table.data th,.r3 table.data td{border:1px solid var(--edge);padding:8px 10px;text-align:left;vertical-align:top}
.r3 table.data th{background:var(--panel)}
.r3 .tablewrap{overflow-x:auto}
@media(max-width:640px){.r3 table.data thead{display:none}.r3 table.data tr{display:block;border:1px solid var(--edge);border-radius:12px;margin:0 0 12px;background:var(--card)}
.r3 table.data td{display:block;border:0;border-bottom:1px solid var(--hair);padding:8px 12px}.r3 table.data td:last-child{border-bottom:0}
.r3 table.data td::before{content:attr(data-l);display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}}
.r3 .note{background:var(--teal-tint);border:1px solid var(--edge);border-radius:14px;padding:16px 18px;margin:18px 0}
.r3 .dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:12px 0 20px}
.r3 .dl a{display:block;background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:10px;text-decoration:none;color:var(--ink);font-size:13.5px}
.r3 .dl img{width:100%;height:auto;border-radius:8px;display:block;margin-bottom:8px}
.r3 form.contact{display:grid;gap:12px;max-width:560px}
.r3 form.contact label{font-weight:600;font-size:14.5px;display:grid;gap:6px}
.r3 form.contact input,.r3 form.contact textarea{font:inherit;padding:11px 12px;border:1px solid var(--edge);border-radius:10px;background:#fff;color:var(--ink)}
.r3 form.contact button{justify-self:start;background:var(--teal-deep);color:#EAF4F5;font-weight:700;font-size:15px;border:0;padding:12px 20px;border-radius:11px;cursor:pointer}
.r3 .hp{position:absolute;left:-9999px}
.r3 #status{font-weight:600}
</style>"""


def esc(s):
    return html.escape(s, quote=True)


def inline(text):
    """Markdown inline -> HTML. Bare URLs become links; a trailing period stays outside the link."""
    parts = re.split(r"(\*\*[^*]+\*\*|(?<![\w*])\*[^*]+\*(?!\w)|https?://[^\s)]+)", text)
    out = []
    for p in parts:
        if not p:
            continue
        if p.startswith("**") and p.endswith("**"):
            out.append(f"<strong>{esc(p[2:-2])}</strong>")
        elif p.startswith("*") and p.endswith("*") and len(p) > 2:
            out.append(f"<em>{esc(p[1:-1])}</em>")
        elif p.startswith("http"):
            trail = ""
            while p and p[-1] in ".,;:":
                trail = p[-1] + trail
                p = p[:-1]
            href = p
            out.append(f'<a href="{esc(href)}">{esc(href)}</a>{esc(trail)}')
        else:
            out.append(esc(p))
    return "".join(out)


def md_blocks(md, after=None):
    """Paragraph-level Markdown -> HTML. `after` maps a heading text to HTML inserted after it."""
    after = after or {}
    out = []
    for block in re.split(r"\n\s*\n", md.strip()):
        lines = [l.rstrip() for l in block.strip().split("\n")]
        if not lines or not lines[0]:
            continue
        if lines[0] == "---":
            out.append("<hr>")
            continue
        m = re.fullmatch(r"(?:##\s+|\*\*)(.+?)(?:\*\*)?", lines[0]) if len(lines) == 1 else None
        if m and (lines[0].startswith("## ") or (lines[0].startswith("**") and lines[0].endswith("**"))):
            title = m.group(1)
            hid = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            out.append(f'<h2 id="{hid}">{inline(title)}</h2>')
            if title in after:
                out.append(after[title])
            continue
        if all(re.match(r"\d+\.\s", l) for l in lines):
            items = [inline(re.sub(r"^\d+\.\s+", "", l)) for l in lines]
            out.append("<ol>" + "".join("<li>" + i + "</li>" for i in items) + "</ol>")
            continue
        para = " ".join(lines)
        m2 = re.match(r"^(Retrievability|Fidelity|Citation Win):\s", para)
        if m2:
            out.append(f"<p><strong>{m2.group(1)}:</strong> {inline(para[len(m2.group(0)):])}</p>")
        else:
            out.append(f"<p>{inline(para)}</p>")
    return "\n".join(out)


def fig(src, alt, cap=""):
    c = f"<figcaption>{esc(cap)}</figcaption>" if cap else ""
    return f'<figure class="postfig"><img src="{src}" alt="{esc(alt)}" width="1600" height="900" loading="lazy" decoding="async">{c}</figure>'


def video_block():
    if not VIDEO_ID:
        return "<!-- r3:video pending: set R3_VIDEO_ID and rebuild -->"
    return (f'<div class="vid" data-yt="{esc(VIDEO_ID)}"><button type="button" aria-label="Play the AEO Analyzers overview video">'
            f'<img src="{IMG}/AEO-Analyzers-YouTube-Thumbnail-1280x720.png" alt="AEO Analyzers overview video: When buyers ask AI, does it name you?" width="1280" height="720" loading="lazy">'
            f'<span class="play">Play the overview</span></button></div>'
            "<script>document.querySelectorAll('.vid[data-yt]').forEach(function(v){v.querySelector('button').addEventListener('click',function(){"
            "var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+v.dataset.yt+'?autoplay=1&rel=0';"
            "f.title='AEO Analyzers overview';f.allow='autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;v.innerHTML='';v.appendChild(f);});});</script>")


def video_ld():
    if not VIDEO_ID:
        return []
    return [{"@context": "https://schema.org", "@type": "VideoObject", "name": "When Buyers Ask AI, Does It Name You? | AEO Analyzers",
             "description": "Website readiness and observed AI answers: the AEO Score and the Citation Sweep.",
             "thumbnailUrl": SITE + f"{IMG}/AEO-Analyzers-YouTube-Thumbnail-1280x720.png", "uploadDate": VIDEO_UPLOADED, "duration": VIDEO_DURATION, "transcript": " ".join(CAPTIONS),
             "embedUrl": f"https://www.youtube-nocookie.com/embed/{VIDEO_ID}", "contentUrl": f"https://youtu.be/{VIDEO_ID}",
             "publisher": ORG}]


def transcript_block():
    if not VIDEO_ID:
        return ""
    return ('<section class="transcript" aria-labelledby="video-transcript"><h2 id="video-transcript">Video transcript</h2>'
            '<p><em>The words spoken in the overview video.</em></p>' + "".join(f"<p>{esc(l)}</p>" for l in CAPTIONS) + "</section>")


def page(path, title, description, og_image, og_alt, body, lds, og_type="article", published=None, crumbs=None, doc_title=None):
    ld = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    pub = f'<meta property="article:published_time" content="{published}">\n' if published else ""
    crumb_html = ""
    if crumbs:
        crumb_html = '<nav class="crumbs" aria-label="Breadcrumb">' + '<span aria-hidden="true">›</span>'.join(
            f'<a href="{h}">{esc(t)}</a>' if h else f'<span aria-current="page">{esc(t)}</span>' for t, h in crumbs) + "</nav>"
    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>{esc(doc_title or title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="AEO Analyzers">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}{og_image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(og_alt)}">
{pub}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{SITE}{og_image}">
<meta name="twitter:image:alt" content="{esc(og_alt)}">
<meta name="theme-color" content="#08343B">
{ld}
{STYLE}
{PAGE_CSS}
</head>
<body>
{HEADER}
<main class="wrap r3">
  <article class="post">
    {crumb_html}
{body}
  </article>
</main>
<footer class="sitefoot"></footer>
</body>
</html>
"""
    out = os.path.join(ROOT, "public", path.strip("/"), "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(doc)
    return out


def read(name):
    return open(os.path.join(SRC, name), encoding="utf-8").read()


# ---------------- Release post ----------------
rel_md = read("assets/Release-3-AEO-Analyzers-Body.md")
first, rest = rel_md.strip().split("\n\n", 1)
rel_after = {
    "Two Measurements, Two Different Questions": fig(f"{IMG}/AEO-Analyzers-Score-and-Sweep-1600x900.png",
        "A website score is not an AI answer. AEO Score, free: examines website readiness and identifies gaps. Citation Sweep, paid: tests buyer questions and retains the answers."),
    "See the Evidence Before You Spend": fig(f"{IMG}/AEO-Analyzers-Transcript-Concept-1600x900.png",
        "Read the answers behind the results. An illustration of a report structure, not a product screenshot: the question, the stored answer, how it was classified, and the sources it cited.",
        "Illustration of the report structure. Not a screenshot."),
    "From Diagnosis to Action": fig(f"{IMG}/AEO-Analyzers-Workflow-1600x900.png",
        "Measure. Fix. Compare. Step 1, score and sweep: establish a baseline. Step 2, fix: implement selected changes. Step 3, re-sweep: compare recorded answers."),
}
rel_body = f"""    <div class="posteyebrow">AEO Analyzers · Press release</div>
    <h1 class="posttitle">{esc(HEADLINE)}</h1>
    <p class="subtitle">{esc(SUMMARY)}</p>
    <p class="postmeta">December 8, 2026 · PIGENAI LLC</p>
    {fig(HERO, "When buyers ask AI, does it name you? Being found is not the same as being recommended. AEO Score: website readiness. Citation Sweep: observed AI answers.")}
    <div class="postbody">
<p><span class="dateline">{esc(DATELINE)}</span> {inline(first)}</p>
{video_block()}
{md_blocks(rest, rel_after)}
<p class="jumpcue">Read the founder's note: <a href="{FOUNDER_URL}">Being Found Is Not the Same as Being Recommended</a>. See a real stored sweep: <a href="{DEMO_URL}">a Citation Sweep example, question by question</a>.</p>
{transcript_block()}
    </div>"""
rel_ld = [{"@context": "https://schema.org", "@type": "NewsArticle", "headline": HEADLINE, "description": SUMMARY,
           "datePublished": "2026-12-08", "dateModified": "2026-12-08", "author": PERSON, "publisher": ORG,
           "image": [SITE + f"{IMG}/og-release-3-hero-1200x630.jpg", SITE + HERO], "mainEntityOfPage": SITE + RELEASE_URL,
           "about": {"@type": "SoftwareApplication", "@id": "https://aeoanalyzers.com/#app", "name": "AEO Analyzers"}}] + video_ld()
page(RELEASE_URL, HEADLINE, SUMMARY, f"{IMG}/og-release-3-hero-1200x630.jpg",
     "When buyers ask AI, does it name you? Being found is not the same as being recommended.", rel_body, rel_ld,
     published="2026-12-08", crumbs=[("Home", "/"), ("Blog", "/blog/"), ("Press release", None)],
     doc_title="AEO Analyzers Expands AI Measurement to Five Engines")

# ---------------- Founder post ----------------
fb = read("assets/Founder-Blog-Being-Found-Is-Not-Being-Recommended.md").strip()
lines = fb.split("\n")
f_title = lines[0].lstrip("# ").strip()
f_sub = lines[2].lstrip("# ").strip()
f_rest = "\n".join(lines[3:]).strip()
f_rest = re.sub(r"^\*\*By Lindsay Hiebert, CISSP\*\*\nFounder and CEO, PIGENAI LLC\n", "", f_rest)
blocks = re.split(r"\n\s*\n", f_rest, maxsplit=1)
intro_and_more = f_rest.split("\n## ", 1)
f_html = md_blocks(intro_and_more[0]) + "\n" + video_block() + "\n" + md_blocks("## " + intro_and_more[1])
FOUNDER_DESC = ("Understand the difference between website readiness, AI brand recognition and category recommendations, "
                "and learn how to examine the evidence.")
f_body = f"""    <div class="posteyebrow">Founder's note</div>
    <h1 class="posttitle">{esc(f_title)}</h1>
    <p class="subtitle">{esc(f_sub)}</p>
    <p class="postmeta">By Lindsay Hiebert, CISSP · Founder and CEO, PIGENAI LLC · December 8, 2026</p>
    {fig(HERO, "When buyers ask AI, does it name you? Being found is not the same as being recommended.")}
    <div class="postbody">
{f_html}
<p class="jumpcue">The announcement: <a href="{RELEASE_URL}">{esc(HEADLINE)}</a>. A real stored sweep, question by question: <a href="{DEMO_URL}">see the Citation Sweep example</a>.</p>
    </div>"""
f_ld = [{"@context": "https://schema.org", "@type": "BlogPosting", "headline": f_title, "description": FOUNDER_DESC,
         "datePublished": "2026-12-08", "dateModified": "2026-12-08", "author": PERSON, "publisher": ORG,
         "image": SITE + f"{IMG}/og-founder-post-1200x630.jpg", "mainEntityOfPage": SITE + FOUNDER_URL}] + video_ld()
page(FOUNDER_URL, f_title, FOUNDER_DESC, f"{IMG}/og-founder-post-1200x630.jpg",
     "When buyers ask AI, does it name you? Being found is not the same as being recommended. Website readiness. Real answer transcripts.",
     f_body, f_ld, published="2026-12-08", crumbs=[("Home", "/"), ("Blog", "/blog/"), ("Founder's note", None)])

# ---------------- Demonstration (item 11a) ----------------
demo = json.load(open(os.path.join(SRC, "demo-sweep-2026-10-13.json"), encoding="utf-8"))
from collections import OrderedDict
agg = OrderedDict()
for r in demo["rows"]:
    k = (r["engine"], r["model"], r["query"])
    agg.setdefault(k, OrderedDict())
    agg[k][r["label"]] = agg[k].get(r["label"], 0) + 1
REPS = demo["reps"]
def _cls(c):
    return "<br>".join("%d of %d: %s" % (n, REPS, esc(l)) for l, n in c.items())
rows_html = "".join(
    '<tr><td data-l="Engine">%s</td><td data-l="Model"><code>%s</code></td><td data-l="Question">%s</td><td data-l="Classification">%s</td></tr>' % (esc(e), esc(m), esc(q), _cls(c))
    for (e, m, q), c in agg.items())
eng_html = "".join(f"<li>{esc(x['engine'])}, model <code>{esc(x['model'])}</code></li>" for x in demo["engines"])
t = demo["transcript"]
src_html = "".join(f'<li><a href="{esc(u)}" rel="nofollow noopener">Google search grounding link {i}</a></li>' for i, u in enumerate(t["sources"], 1))
transcript_html = "".join(f"<p>{inline(p)}</p>" for p in t["text"].split("\n") if p.strip())
PANEL = esc(demo["panel"])
DATE_TEXT = esc(demo["date_text"])
QLIST = ", ".join("“" + esc(q) + "”" for q in demo["questions"])
TQ = esc(t["query"]); TE = esc(t["engine"]); TM = esc(t["model"])
demo_body = f"""    <div class="posteyebrow">AEO Analyzers · A real Citation Sweep</div>
    <h1 class="posttitle">A Citation Sweep example, question by question</h1>
    <p class="subtitle">One stored sweep of aeoanalyzers.com itself, shown with its questions, engines, models, classifications and a full answer.</p>
    <div class="postbody">
<h2 id="what-was-run">What was run</h2>
<ul>
<li>Site measured: aeoanalyzers.com (our own site).</li>
<li>Run: {DATE_TEXT}.</li>
<li>Panel: {PANEL}, five answer engines.</li>
<li>Each question was asked {REPS} times on each engine.</li>
<li>Questions shown here: the two questions that name the site: {QLIST}.</li>
</ul>
<h3>Engines and models</h3>
<ul>{eng_html}</ul>
<h2 id="how-each-answer-was-classified">How each answer was classified</h2>
<p>Each row counts the {REPS} answers to one question on one engine. The classification is computed by the same code the product uses when it opens a saved sweep.</p>
<div class="tablewrap"><table class="data"><thead><tr><th>Engine</th><th>Model</th><th>Question</th><th>Classification</th></tr></thead><tbody>{rows_html}</tbody></table></div>
<h2 id="one-full-answer">One full stored answer</h2>
<p><strong>{TE}</strong>, model <code>{TM}</code>, question “{TQ}”, answer {t["run"]} of {REPS}. The text below is the stored answer, unedited.</p>
<blockquote class="postquote">{transcript_html}</blockquote>
<h3>Sources cited in that answer</h3>
<p>Gemini cites its sources through Google search grounding links. The sweep stores them exactly as returned:</p>
<ol>{src_html}</ol>
<h2 id="limits">Limits of this example</h2>
<div class="note">
<p>This is one sweep on one date. Answers change as the engines change, so another run can read differently.</p>
<p>The fidelity check compares an answer with the facts recorded from the site: the company, the founder and the stated facts. It does not check every detail. Some stored answers from this sweep quote plan prices that have since changed, and the fidelity check did not flag them. Those answers are not shown here.</p>
<p>The sweep also asked category questions that do not name the site. Those questions and answers name other products, so they are not reproduced here. The monthly results for category questions are published on <a href="/evidence">the Honest-Zero ledger</a>.</p>
<p>A sweep records what was observed in tested answers. It is not a guarantee of future visibility.</p>
</div>
<p class="jumpcue">Read the announcement: <a href="{RELEASE_URL}">{esc(HEADLINE)}</a>. Read the founder's note: <a href="{FOUNDER_URL}">Being Found Is Not the Same as Being Recommended</a>.</p>
    </div>"""
demo_ld = [{"@context": "https://schema.org", "@type": "Article", "headline": "A Citation Sweep example, question by question",
            "datePublished": "2026-12-08", "author": PERSON, "publisher": ORG, "mainEntityOfPage": SITE + DEMO_URL}]
page(DEMO_URL, "A Citation Sweep example, question by question | AEO Analyzers",
     "One stored Citation Sweep of aeoanalyzers.com: the questions, the engines and models, how each answer was classified, and one full answer with its sources.",
     f"{IMG}/og-release-3-hero-1200x630.jpg", "When buyers ask AI, does it name you?", demo_body, demo_ld,
     crumbs=[("Home", "/"), ("Press", "/press"), ("Citation Sweep example", None)])

# ---------------- Press page (item 6) ----------------
rel_about = re.search(r"\*\*About AEO Analyzers\*\*\s*\n\n([\s\S]+)$", rel_md).group(1).strip().split("\n\n")
downloads = [
    ("AEO-Analyzers-Hero-1600x900.png", "Hero card, 1600 by 900"),
    ("AEO-Analyzers-Score-and-Sweep-1600x900.png", "Score and Sweep, 1600 by 900"),
    ("AEO-Analyzers-Workflow-1600x900.png", "Workflow, 1600 by 900"),
    ("AEO-Analyzers-Transcript-Concept-1600x900.png", "Transcript concept (illustration), 1600 by 900"),
    ("AEO-Analyzers-LinkedIn-Card-1200x630.png", "Social card, 1200 by 630"),
    ("AEO-Analyzers-YouTube-Thumbnail-1280x720.png", "Video thumbnail, 1280 by 720"),
]
SHOT_LIST = [
    ("01-free-checker-url-typed-1920x1080.jpg", "The free AEO checker with a website address typed in"),
    ("02-aeo-score-subscores-1920x1080.jpg", "An AEO Score result with its four sub-scores: entity, density, clarity and structure"),
    ("03-citation-sweep-three-layers-1920x1080.jpg", "A saved Citation Sweep: found when asked by name, recommended to new buyers, own site cited"),
    ("04-stored-transcript-1920x1080.jpg", "Stored answers from the sweep, as the engine returned them, with their sources"),
    ("05-cited-sources-1920x1080.jpg", "More stored answers and the sources each one cited"),
]
SHOTS = "".join(f'<a href="{IMG}/screenshots/{f}" download><img src="{IMG}/screenshots/{f}" alt="{esc(c)}" loading="lazy">{esc(c)}</a>' for f, c in SHOT_LIST)
dl_html = "".join(f'<a href="{IMG}/{f}" download><img src="{IMG}/{f}" alt="{esc(c)}" loading="lazy">{esc(c)}</a>' for f, c in downloads)
press_body = f"""    <div class="posteyebrow">AEO Analyzers</div>
    <h1 class="posttitle">Press</h1>
    <div class="postbody">
<h2 id="latest-release">Latest release</h2>
<p><strong>December 8, 2026.</strong> <a href="{RELEASE_URL}">{esc(HEADLINE)}</a></p>
<p>{esc(SUMMARY)}</p>
<!-- r3:ein-link: add the EIN Presswire link here when the release is approved -->
<p>Also published: the founder's note, <a href="{FOUNDER_URL}">Being Found Is Not the Same as Being Recommended</a>, and <a href="{DEMO_URL}">a Citation Sweep example, question by question</a>.</p>
{video_block()}
<h2 id="about">About AEO Analyzers</h2>
{''.join(f'<p>{inline(p)}</p>' for p in rel_about)}
<h2 id="images">Images</h2>
<p>Free to use with coverage of AEO Analyzers. The transcript concept card is an illustration, not a product screenshot.</p>
<div class="dl">{dl_html}</div>
<h2 id="screenshots">Product screenshots</h2>
<p>Taken on production on November 26, 2026, at 1920 by 1080 pixels, using aeoanalyzers.com's own data. Sweep cost is never shown. In the Citation Sweep screenshot, the list of other products named in category answers and one action line that names other sites are hidden.</p>
<div class="dl">{SHOTS}</div>
<h2 id="media-contact">Media contact</h2>
<p>Lindsay Hiebert, Founder and CEO, PIGENAI LLC<br>
<a href="https://www.linkedin.com/in/lindsayhiebert">https://www.linkedin.com/in/lindsayhiebert</a><br>
Inquiries: <a href="/contact">the contact page</a></p>
<h2 id="earlier">Earlier coverage</h2>
<p><a href="/blog/the-fifth-engine">We added a fifth AI engine. Here is what changed, and what did not.</a> (October 15, 2026)</p>
    </div>"""
press_ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": "Press | AEO Analyzers", "url": SITE + "/press",
             "publisher": ORG, "about": {"@type": "SoftwareApplication", "@id": "https://aeoanalyzers.com/#app", "name": "AEO Analyzers"}}] + video_ld()
page("/press", "Press | AEO Analyzers", "Press releases, images and media contact for AEO Analyzers, a PIGENAI LLC application.",
     f"{IMG}/og-release-3-hero-1200x630.jpg", "When buyers ask AI, does it name you?", press_body, press_ld, og_type="website",
     crumbs=[("Home", "/"), ("Press", None)])

# ---------------- Contact page (item 3) ----------------
contact_body = """    <div class="posteyebrow">AEO Analyzers</div>
    <h1 class="posttitle">Contact</h1>
    <div class="postbody">
<p>Questions about AEO Analyzers, a press inquiry or a partnership: send a message and it reaches Lindsay Hiebert, Founder and CEO of PIGENAI LLC, directly.</p>
<form class="contact" id="contactform" novalidate>
  <label>Name<input name="name" autocomplete="name" required></label>
  <label>Email<input name="email" type="email" autocomplete="email" required></label>
  <label>Company (optional)<input name="company" autocomplete="organization"></label>
  <label>Message<textarea name="message" rows="7" maxlength="5000" required></textarea></label>
  <label class="hp" aria-hidden="true">Website<input name="company_website" tabindex="-1" autocomplete="off"></label>
  <button type="submit">Send message</button>
  <p id="status" role="status" aria-live="polite"></p>
</form>
<p>Your message is delivered by email and is not stored on this site.</p>
<script>
document.getElementById('contactform').addEventListener('submit', async function (e) {
  e.preventDefault();
  var f = e.target, s = document.getElementById('status'), b = f.querySelector('button');
  var data = Object.fromEntries(new FormData(f).entries());
  b.disabled = true; s.textContent = 'Sending…';
  try {
    var r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send. Please try again.');
    f.reset(); s.textContent = 'Thank you. Your message was sent.';
  } catch (err) { s.textContent = err.message; }
  b.disabled = false;
});
</script>
    </div>"""
page("/contact", "Contact | AEO Analyzers", "Contact AEO Analyzers and PIGENAI LLC. Messages reach the founder directly.",
     f"{IMG}/og-release-3-hero-1200x630.jpg", "When buyers ask AI, does it name you?", contact_body,
     [{"@context": "https://schema.org", "@type": "ContactPage", "name": "Contact | AEO Analyzers", "url": SITE + "/contact", "publisher": ORG}],
     og_type="website", crumbs=[("Home", "/"), ("Contact", None)])

print("built:", RELEASE_URL, FOUNDER_URL, DEMO_URL, "/press", "/contact", "| video:", VIDEO_ID or "pending")
