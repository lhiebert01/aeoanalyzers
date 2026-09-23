# -*- coding: utf-8 -*-
"""Build the 5-6-7 continuation pack.

Posts 1 to 4 of the campaign are published. This document carries the remaining three,
taken from the ORIGINAL disti pack (Pack 1) rather than Packs 2 or 3, plus one post that
exists only in Pack 3 and therefore had to be written in the Pack 1 voice.

It exists mainly to fix one thing: the campaign master listed OG cards where the founder
needed HERO images, and the two sets do not share paths or filenames. Every image named
below was opened and measured before it was written down, and where no hero exists that
is stated rather than papered over.

Post text for 5 and 6 is IMPORTED from build-disti-pack.py so the two documents cannot
drift apart."""
import os
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# The filename has hyphens, so it cannot be imported by name — load it by path.
import importlib.util
_spec = importlib.util.spec_from_file_location(
    'disti', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-disti-pack.py'))
_disti = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_disti)
PACK1 = {p['n']: p for p in _disti.POSTS}

# --------------------------------------------------------------------- POST 7
# Not in Pack 1 — Pack 3 added it. Written here in the Pack 1 voice so the series
# does not change register at the last post. Both numbers in it are published on
# /aeo-buyers-standard: the 42% is explicitly hypothetical there and here, and the
# "0 of 200" is our own September 2026 measurement, quoted verbatim from the page.
POST7 = dict(
    n=7, title="42% of what? — the receipts post",
    url="https://aeoanalyzers.com/aeo-buyers-standard",
    li=["A dashboard tells you your AI visibility is 42%.",
        "42% of what?",
        "Which prompts. Which engines. Which dates. How many runs per question. Which answer carried the citation — and what did the model actually say around it. If you cannot get to those, the number is not a measurement. It is a mood with a percent sign.",
        "That is requirement five of the seven in the buyer's standard we published, and it is the one I would keep if I could only keep one. Metrics that drive spending should be traceable to the answer behind them.",
        "Here is what holding ourselves to it costs us. On unbranded category questions, in our own September 2026 measurement, engines recommended us in 0 of 200 recorded answers. Zero. We publish that monthly whatever it says, because a standard you apply only when the result flatters you is not a standard.",
        "You do not need our product to use this. Take the question into your next vendor call and ask it: 42% of what? Then count how many minutes it takes to reach a transcript.",
        "Tell me how that call goes — I collect the answers.",
        "https://aeoanalyzers.com/aeo-buyers-standard",
        "#AEO #AISearch #Procurement #MarTech #B2BMarketing"],
    x=["A dashboard says your AI visibility is 42%.",
       "42% of what? Which prompts, which engines, which dates, how many runs, and what did the model actually say?",
       "A number you cannot reproduce is a number you cannot dispute.",
       "https://aeoanalyzers.com/aeo-buyers-standard"])

# ------------------------------------------------- IMAGES (measured, not assumed)
# hero = the 1600x900 in-page banner. og = the 1200x630 social card. They are
# DIFFERENT files in different folders, which is what the campaign master got wrong.
IMAGES = {
 5: dict(attach="public/img/buyer-series/aeo-buyers-guide-hero-1600x900.jpg", size="1600 x 900",
         hero="public/img/buyer-series/aeo-buyers-guide-hero-1600x900.jpg",
         og="public/img/buyer-series/aeo-buyers-guide-og-1200x630.jpg",
         note="Hero and OG both exist. The hero reads “AEO software explained — Monitoring is not "
              "diagnosis. Diagnosis is not proof.”, which is the series card rather than this page's "
              "headline. Rather than wait for new art, the post copy now carries that exact line — "
              "“the thread running through all three: monitoring is not diagnosis, and diagnosis is "
              "not proof” — so the image and the words agree and the card reads as deliberate. Post it "
              "as is. The matched replacement stays queued as FIX 3 in "
              "Downloads\\AEO-IMAGE-FIXES\\README-FIXES.md, but nothing is now waiting on it."),
 6: dict(attach="public/blog/how-it-works/visual-1-pipeline.png", size="1672 x 941",
         hero=None,
         og="public/og-blog-how-it-works.png",
         note="THERE IS NO HERO FOR THIS PAGE. It has an OG card (public/og-blog-how-it-works.png, "
              "1200 x 630) and six in-body diagrams, nothing else. Attach visual-1-pipeline.png instead: "
              "it IS the drawing the post is about, it carries the logo and the wordmark, and it is the "
              "strongest single image in the whole series. It is dense in a feed at thumbnail size — "
              "which is fine here, because the post's promise is “the whole pipeline, drawn” and "
              "the tap-to-expand is the point. Fall back to the OG card only if you want a lighter image."),
 7: dict(attach="public/img/buyer-series/aeo-buyers-standard-og-1200x630.jpg", size="1200 x 630",
         hero="public/img/buyer-series/aeo-buyers-standard-hero-1600x900.jpg",
         og="public/img/buyer-series/aeo-buyers-standard-og-1200x630.jpg",
         note="This post has no page of its own — it pulls one idea out of the Buyer's Standard, so it "
              "borrows that page's art. You already used the 1600x900 HERO on the Buyer's Standard post, so "
              "attach the 1200x630 OG here: same seven cards, different composition and a different headline "
              "line, so the feed does not show your audience the same picture twice. Both have RECEIPTS as a "
              "labelled card, which is exactly what this post is about."),
}

ORDER = [  # campaign numbering (the one the founder is posting in) -> Pack 1 source
 (1, "Why AI still doesn't mention your business", 2),
 (2, "What should an AEO tool actually do?",       3),
 (3, "The AEO Buyer's Standard",                   1),
 (4, "Best AEO tools in 2026",                     4),
 (5, "The AEO Buyer's Guide — three short reads", 5),
 (6, "How AEO Analyzers works",                    6),
 (7, "42% of what? — the receipts post",      None),
]

WHY = {
 5: "The catch-all. Anyone who missed 1 to 4 can still get the whole buying model in six minutes, "
    "and it links down into all three of the longer pages.",
 6: "Product mechanics, deliberately late. By now the audience has the category, the standard and the "
    "buying problem, so this reads as evidence rather than a pitch.",
 7: "The closer. One idea, no page of its own, built to be screenshotted and taken into a procurement "
    "meeting by people who will never read the rest of the series.",
}

# ------------------------------------------------------------------- BLUESKY
# Bluesky's limit is 300 graphemes and it does NOT shorten links — the whole URL
# counts, so a 54-character link is 18% of the post before a word is written.
# That is why these are rewritten rather than trimmed from the X versions: one
# idea, one link, no hashtags. Keyed by CAMPAIGN number.
BLUESKY = {
 1: ["You did what the AEO guides said and nothing changed.",
     "llms.txt goes unrequested on 97% of sites that have one. An AI sees roughly the first 200 characters after your h1.",
     "The free self-checks, no tool required:",
     "https://aeoanalyzers.com/blog/why-ai-doesnt-mention-you"],
 2: ["\"AI visibility\" is six different outcomes with almost nothing in common.",
     "A mention is not a citation. A citation is not a recommendation. Measurement is not diagnosis.",
     "https://aeoanalyzers.com/what-should-an-aeo-tool-do"],
 3: ["We published the standard we think buyers should use to judge AEO software, then scored ourselves against it — including where we come off worst.",
     "7 requirements. 13 questions. Names no vendor.",
     "https://aeoanalyzers.com/aeo-buyers-standard"],
 4: ["We wrote the comparison of our own category and named no winner.",
     "8 tools, 7 requirements, every competitor fact dated and linked to that vendor's own page — including where we are the weaker choice.",
     "https://aeoanalyzers.com/best-aeo-tools"],
 5: ["How to buy AEO software, in six minutes.",
     "Three two-minute reads: what a tool should do, what to require before you buy, how to compare the market.",
     "Monitoring is not diagnosis. Diagnosis is not proof.",
     "https://aeoanalyzers.com/aeo-buyers-guide"],
 6: ["The whole pipeline, drawn. Six diagrams, no algorithms.",
     "Four engines, your buyers' questions, one or more runs each. Three layers scored separately. Every number backed by a stored transcript you can re-run.",
     "https://aeoanalyzers.com/blog/how-it-works"],
 7: ["A dashboard says your AI visibility is 42%.",
     "42% of what? Which prompts, which engines, which dates, how many runs, and what did the model actually say?",
     "A number you cannot reproduce is a number you cannot dispute.",
     "https://aeoanalyzers.com/aeo-buyers-standard"],
}

def bsky_len(parts):
    """Bluesky counts the FULL url — no t.co substitution — and 300 is the ceiling."""
    return sum(len(b) for b in parts) + 2 * (len(parts) - 1)

for _n, _p in BLUESKY.items():
    assert bsky_len(_p) <= 300, f"Bluesky post {_n} is {bsky_len(_p)} chars — over the 300 limit"

def x_len(parts):
    """X counts every URL as 23 characters, whatever its real length."""
    return sum((23 if b.startswith('http') else len(b)) for b in parts) + 2 * (len(parts) - 1)

assert x_len(POST7['x']) <= 280, f"X post 7 is {x_len(POST7['x'])} chars"

ALL = dict(PACK1); ALL[7] = POST7

def li_for(pack1_n, camp_n):
    return POST7['li'] if pack1_n is None else PACK1[pack1_n]['li']
def x_for(pack1_n):
    return POST7['x'] if pack1_n is None else PACK1[pack1_n]['x']

# --------------------------------------------------------------------- DOCX
def shade(par, hexcolor):
    pPr = par._p.get_or_add_pPr(); s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear'); s.set(qn('w:fill'), hexcolor); pPr.append(s)

def bold_para(d, label, val):
    p = d.add_paragraph(); p.add_run(label + ': ').bold = True; p.add_run(val); return p

def build(path):
    d = Document()
    for s in d.sections:
        s.left_margin = s.right_margin = Inches(0.9)
    n = d.styles['Normal']; n.font.name = 'Calibri'; n.font.size = Pt(11)

    d.add_heading('BLITZ POSTS 5 · 6 · 7 — with the right images', 0)
    i = d.add_paragraph('Continues the campaign from where you stopped. Posts 1 to 4 are published. '
                        'Each grey block is one post — select the whole block and copy.')
    i.runs[0].italic = True

    d.add_heading('Read this first — two things the campaign master got wrong', 2)
    d.add_paragraph(
        'NUMBERING. You are posting in the campaign master’s order, so “5, 6, 7” means the '
        'Buyer’s Guide, How it works, and the receipts post. The original disti pack numbered the same '
        'posts differently, and it has no seventh post at all. Every post below is labelled by NAME as well '
        'as number so the two orders cannot be confused. Posts 5 and 6 are the original pack’s copy, '
        'unchanged. Post 7 did not exist in the original pack, so it is written here in the same voice.')
    d.add_paragraph(
        'IMAGES. The campaign master listed OG cards. Those are the 1200 x 630 social cards that sit in a '
        'page’s <head> — they are NOT the hero banners, they live in different folders under '
        'different filenames, and for one of these three pages the hero does not exist at all. The table '
        'below names the exact file to attach for each post. Every path was opened and measured, not assumed.')

    d.add_heading('Attach these', 2)
    t = d.add_table(rows=1, cols=4); t.style = 'Light Grid Accent 1'
    for c, h in zip(t.rows[0].cells, ['Post', 'Attach this file', 'Size', 'Hero exists?']):
        c.text = h
        for par in c.paragraphs:
            for r in par.runs: r.bold = True
    for camp_n, title, _src in ORDER[4:]:
        im = IMAGES[camp_n]
        c = t.add_row().cells
        c[0].text = f"{camp_n} · {title}"
        c[1].text = im['attach']
        c[2].text = im['size']
        c[3].text = 'yes' if im['hero'] else 'NO — see the note on the post'

    d.add_paragraph()
    for camp_n, title, _src in ORDER[4:]:
        p = d.add_paragraph(); p.add_run(f"{camp_n} · ").bold = True
        p.add_run(IMAGES[camp_n]['note'])

    # ------------------------------------------------------------ the posts
    for camp_n, title, src in ORDER[4:]:
        d.add_page_break()
        d.add_heading(f"{camp_n} · {title}", 1)
        im = IMAGES[camp_n]
        bold_para(d, 'Why this one here', WHY[camp_n])
        bold_para(d, 'ATTACH', f"{im['attach']}  ({im['size']})")
        bold_para(d, 'Hero', im['hero'] or 'none exists for this page')
        bold_para(d, 'OG card', im['og'])
        bold_para(d, 'Link', ALL[camp_n]['url'] if camp_n != 7 else POST7['url'])
        if src is not None:
            bold_para(d, 'Source', f'original disti pack, post {src} — unchanged')
        else:
            bold_para(d, 'Source', 'new — written for this pack in the original pack’s voice')

        d.add_heading('LinkedIn / Facebook — select this block and copy', 2)
        body = li_for(src, camp_n)
        for j, block in enumerate(body):
            par = d.add_paragraph(block)
            par.paragraph_format.left_indent = Inches(0.12)
            par.paragraph_format.right_indent = Inches(0.12)
            par.paragraph_format.space_after = Pt(10 if j < len(body) - 1 else 16)
            shade(par, 'F2F4F5')

    # ------------------------------------------------------------- X posts
    d.add_page_break()
    d.add_heading('X posts — all seven', 1)
    d.add_paragraph(
        'From the ORIGINAL disti pack, not Packs 2 or 3, and listed in the order you are posting. Numbers 1 '
        'to 4 are here so you can backfill X for the four already on LinkedIn. Every one is inside 280 '
        'characters counting each URL as the 23 characters X charges for it, however long the link really is. '
        'Character counts are shown so you can see the headroom before you edit.')
    d.add_paragraph(
        'Post to LinkedIn first, then X about thirty minutes later. The LinkedIn post is canonical; '
        'the X post is a pointer to it.')
    d.add_paragraph(
        'ON YOUR X PREMIUM ACCOUNT you are not held to 280, so you have a choice. These short versions '
        'travel further — they can be quoted and reposted whole, and they read as a pointer rather than a '
        'duplicate of the LinkedIn post. If you would rather use the detail, paste the LinkedIn block from '
        'this document instead and cut the hashtag line down to two; five tags read as reach-farming on X '
        'in a way they do not on LinkedIn. Do not post the long and short version of the same piece.')

    for camp_n, title, src in ORDER:
        x = x_for(src)
        d.add_heading(f"{camp_n} · {title}  —  {x_len(x)}/280", 2)
        if camp_n <= 4:
            note = d.add_paragraph('LinkedIn already published — this is the X backfill.')
            note.runs[0].italic = True
        for j, block in enumerate(x):
            par = d.add_paragraph(block)
            par.paragraph_format.left_indent = Inches(0.12)
            par.paragraph_format.right_indent = Inches(0.12)
            par.paragraph_format.space_after = Pt(8 if j < len(x) - 1 else 14)
            shade(par, 'F2F4F5')

    # ---------------------------------------------------------- Bluesky
    d.add_page_break()
    d.add_heading('Bluesky posts — all seven', 1)
    d.add_paragraph(
        'Bluesky caps a post at 300 characters and, unlike X, it does not shorten links — the entire URL '
        'counts against you. On the longest of these that is 54 characters, 18% of the post, before a single '
        'word is written. So these are rewritten rather than trimmed: one idea, one link, no hashtags. '
        'Counts below are the real ones, URL included.')
    d.add_paragraph(
        'Order and rhythm are the same as everywhere else — LinkedIn first, then X, then Bluesky. Bluesky '
        'has the smallest audience of the three and the highest proportion of people who will actually read '
        'the linked page, so it is worth the extra post.')

    for camp_n, title, _src in ORDER:
        b = BLUESKY[camp_n]
        d.add_heading(f"{camp_n} · {title}  —  {bsky_len(b)}/300", 2)
        if camp_n <= 4:
            note = d.add_paragraph('LinkedIn already published — this is the Bluesky backfill.')
            note.runs[0].italic = True
        for j, block in enumerate(b):
            par = d.add_paragraph(block)
            par.paragraph_format.left_indent = Inches(0.12)
            par.paragraph_format.right_indent = Inches(0.12)
            par.paragraph_format.space_after = Pt(8 if j < len(b) - 1 else 14)
            shade(par, 'F2F4F5')

    d.save(path)

build('docs/launch/BLITZ-POSTS-5-6-7.docx')
for camp_n, title, src in ORDER:
    print(f"  {camp_n}  X {x_len(x_for(src)):3}/280   Bluesky {bsky_len(BLUESKY[camp_n]):3}/300   {title}")
print('built docs/launch/BLITZ-POSTS-5-6-7.docx')
