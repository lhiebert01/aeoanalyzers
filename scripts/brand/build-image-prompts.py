# -*- coding: utf-8 -*-
"""Generate the two image-prompt deliverables, MD and DOCX.

EVERY prompt is emitted COMPLETE and STANDALONE. A reader copies one block and has the
whole prompt — palette, type, graphic language, forbidden list, required furniture, text
discipline and the composition. Nothing is assembled from pieces at the point of use.
The shared text lives here once so the twelve prompts cannot drift apart."""
import os, re
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = 'docs/brand'

SYSTEM = """BRAND SYSTEM — AEO Analyzers. Follow exactly.

PALETTE, exclusive. Background near-black #000603, with a subtle radial lift toward the
centre no more than two stops lighter. Primary and dominant accent bright green #68E66D —
the image must read as a green image at a glance. Supporting accents, used only where they
carry meaning: amber #E8B23C for partial or tier-dependent states, clay #F2705C for absent
or missing, neutral grey-teal #9DB2B7 for inert structure, grids and unlabelled shapes.
All type pure white #FFFFFF, secondary type white at 70% opacity. NO BLUE AND NO TEAL
ANYWHERE.

TYPE. Headlines in a heavy geometric grotesque, tight tracking, sentence case. Never a
serif. Labels and eyebrows in UPPERCASE with wide letter-spacing of about 0.18em, small,
white.

GRAPHIC LANGUAGE — use it, do not minimise it. Dimensional cards with soft shadow and a
1px coloured edge. Outlined bars with partial fill and a visible numeric value. A circular
score ring with a coloured arc and a large white numeral. Fragments of answer-transcript
text set small and dim, suggesting the evidence behind a number. Thin connector lines.
Crisp geometric grids. Detail and density are wanted; this is a reference graphic, not a
minimal poster.

DEPTH ALLOWED. Soft drop shadows, a gentle radial vignette, one plane sitting above
another. NOT ALLOWED: neon glow, bevels, 3-D extrusion, lens flare, photography, stock
imagery, gradients used as decoration.

NEVER INCLUDE. Shields, padlocks, circuit boards, robot faces, brains, magnifying glasses,
speedometers, podiums, trophies, stars, rating badges, medals, competitor logos, competitor
names anywhere in the artwork, or any call-to-action button.

REQUIRED FURNITURE. Eyebrow top-left in UPPERCASE letterspaced white. A thin green #68E66D
hairline rule across the lower third. The words AEO ANALYZERS lower-left and
AEOANALYZERS.COM lower-right, both UPPERCASE letterspaced white and small.

TEXT DISCIPLINE. Every word rendered must be spelled exactly as written below. High
contrast, readable at thumbnail size. Nothing decorative behind type."""

def prompt(size, comp):
    return SYSTEM + "\n\nCOMPOSITION — " + size + "\n\n" + comp.strip()

# ---------------------------------------------------------------- SHORT SERIES
SHORT = [
("Short 1 — Hero", "1600 × 900 landscape", """
Editorial infographic, edge to edge. Across the middle, five evenly spaced stations joined
by one thin green connector running left to right. Each station is a dimensional card with
a soft shadow and a 1px edge, containing a large white numeral 1 to 5, with an UPPERCASE
letterspaced white label beneath it: OBSERVE, DIAGNOSE, REMEDIATE, VERIFY, EVIDENCE.

The cards carry DIFFERENT STATES along the row, so it reads as a diagnosis with real
outcomes rather than a menu of features: the first two filled green #68E66D, the third
part-filled amber #E8B23C, the fourth outlined clay #F2705C, the fifth neutral #9DB2B7.

Upper right, raised on its own plane with a soft shadow: a circular score ring with a green
arc and a large white numeral, and behind it three lines of small dim transcript text
suggesting the evidence the number came from.

Eyebrow top-left: AEO ANALYZERS · BUYER SERIES
Headline, upper left, heavy white grotesque: What should an AEO tool actually do?
Sub-line beneath in green: A dashboard is not a diagnosis.
"""),
("Short 1 — OG card", "1200 × 630 landscape", """
Left two-thirds: a very large white headline reading: A dashboard is not a diagnosis.
Beneath it, a smaller green line reading: What should an AEO tool actually do?

Right third: five short outlined horizontal bars stacked vertically, filled to different
lengths in green #68E66D, amber #E8B23C, clay #F2705C and neutral #9DB2B7, each with a tiny
UPPERCASE white label — OBSERVE, DIAGNOSE, REMEDIATE, VERIFY, EVIDENCE — and a small white
numeric value at the right end of each bar. Behind the bars, two lines of small dim
transcript text.

Must be readable as a feed thumbnail at quarter size.
"""),
("Short 2 — Hero", "1600 × 900 landscape", """
Seven tall gate-like cards standing in a row, each a dimensional card with a soft shadow
and a 1px green edge, partially filled with green #68E66D to different heights. One thin
green line passes horizontally through all seven at the same level — a threshold every tool
must cross.

One UPPERCASE letterspaced white word beneath each gate: OBSERVE, DIAGNOSE, REMEDIATE,
VERIFY, RECEIPTS, SCALE, ECONOMICS.

Behind the gates, faint neutral #9DB2B7 grid lines receding. In front, one card floating
slightly proud of the row showing an outlined bar, a white percentage, and a line of small
dim transcript text beneath it — a requirement with its receipt attached.

Eyebrow top-left: AEO ANALYZERS · PURCHASING STANDARD
Headline, heavy white grotesque: The AEO Buyer's Standard
Sub-line in green: Seven requirements. Apply them to us too.
"""),
("Short 2 — OG card", "1200 × 630 landscape", """
A huge white headline on the left reading: The AEO Buyer's Standard
Beneath it a green sub-line reading: 7 requirements before you buy AEO software.

Along the bottom third, seven small gates with tiny UPPERCASE white labels — Observe,
Diagnose, Remediate, Verify, Receipts, Scale, Economics — outlined in neutral #9DB2B7 and
DELIBERATELY UNFILLED, because a standard is not a scorecard. Give them depth with soft
shadows and a fine green grid behind, so the card reads as composed rather than empty.

Must be readable as a feed thumbnail at quarter size.
"""),
("Short 3 — Hero", "1600 × 900 landscape", """
Upper half: eight identical unlabelled rectangles outlined in neutral #9DB2B7, arranged in
a loose row, DELIBERATELY EQUAL — no ranking, no ordering, nothing highlighted, nothing
raised among them.

They converge on a single wide band across the centre labelled in UPPERCASE letterspaced
white: THE AEO BUYER'S STANDARD. Only this band has presence — a dimensional card with a
soft shadow, a 1px green edge and a fine internal grid. The eight rectangles sit flat on
the background plane.

From the band, six thin green lines fan downward to six UPPERCASE white labels:
ENTERPRISE INTELLIGENCE · FOCUSED ANALYTICS · BROAD MONITORING · SEO + GEO ·
AGENT EXPERIENCE · DIAGNOSE, FIX, PROVE

Eyebrow top-left: AEO ANALYZERS · CATEGORY REFERENCE
Headline: Best AEO tools & software in 2026
Sub-line in green: Compare the operating model, not the feature count.

ABSOLUTELY NO podium, badge, star, trophy or winner mark of any kind.
"""),
("Short 3 — OG card", "1200 × 630 landscape", """
A large white headline on the left reading: Best AEO tools & software in 2026
Beneath it a green sub-line reading: What to compare before you buy.

Right side: a seven-row checklist of short bars outlined in neutral #9DB2B7, ALL UNFILLED
AND EQUAL — a standard, not a scorecard — each with a tiny UPPERCASE white label.

No vendor names anywhere in the artwork. No logos, no stars, no ranking, no winner badges.
Must be readable as a feed thumbnail at quarter size.
"""),
]

# ---------------------------------------------------------------- LONG FORM
LONG = [
("Long 1 — Hero", "1600 × 900 landscape", """
A single AI answer enters from the left as a dimensional card carrying four lines of small
dim transcript text, then passes through four sequential workstations labelled in UPPERCASE
letterspaced white: MONITOR, DIAGNOSE, REMEDIATE, VERIFY — followed by a smaller ledger
panel labelled RECEIPTS.

THE ANSWER CARD VISIBLY CHANGES STATE at each station: first raw text; then one line
highlighted clay #F2705C as the problem found; then a repair artifact shown as a small
green-edged code-like block; then the same answer repeated with a green #68E66D check mark
and a numeric value beside it.

Each station is a dimensional card with a soft shadow and a 1px edge, joined by a thin
green connector. The RECEIPTS ledger shows three stacked rows of dim transcript text with
small white timestamps.

Eyebrow top-left: AEO ANALYZERS · BUYER SERIES
Headline: AEO software explained
Sub-line in green: Monitoring is not diagnosis. Diagnosis is not proof.
"""),
("Long 1 — OG card", "1200 × 630 landscape", """
Left two-thirds: a very large white headline reading: Monitoring is not diagnosis.
Second line in green reading: Diagnosis is not proof.

Lower right: four connected dimensional boxes labelled in UPPERCASE white — OBSERVE,
DIAGNOSE, FIX, VERIFY — the first two filled green #68E66D, the third part-filled amber
#E8B23C, the fourth outlined neutral #9DB2B7, each with a small white numeric value. Two
lines of dim transcript text behind them.

Must be readable as a feed thumbnail at quarter size.
"""),
("Long 2 — Hero", "1600 × 900 landscape", """
Seven evenly spaced gateway panels form an evaluation path across the frame. Each is a
dimensional card with a soft shadow and a 1px green edge, partially filled green #68E66D to
different heights. Labels exactly, UPPERCASE letterspaced white beneath each: OBSERVE,
DIAGNOSE, REMEDIATE, VERIFY, RECEIPTS, SCALE, ECONOMICS.

THE FIRST FIVE sit under a thin bracket labelled FUNCTIONAL REQUIREMENTS; THE LAST TWO
under a bracket labelled PROCUREMENT REQUIREMENTS. Two groups, one path. A single thin
green line passes through all seven at the same level.

Behind them, faint neutral #9DB2B7 grid lines receding. In front, one card floating
slightly proud showing an outlined bar, a white percentage and a line of dim transcript
text — a requirement with its receipt attached.

Eyebrow top-left: AEO ANALYZERS · PURCHASING STANDARD
Title, top left, heavy white grotesque: The AEO Buyer's Standard

No vendor logos. No ranking symbols.
"""),
("Long 2 — OG card", "1200 × 630 landscape", """
A huge white headline reading: The AEO Buyer's Standard
Beneath it a green sub-line reading: 7 requirements serious buyers should use before
purchasing AEO software.

Along the bottom, seven small gates with abbreviated UPPERCASE white labels, outlined in
neutral #9DB2B7 and UNFILLED — a standard is not a scorecard. Give them depth with soft
shadows and a fine grid behind.

Set in the lower right, a small pull-quote in green reading: AEO metrics should have
receipts.

Must be extremely readable as a feed thumbnail at quarter size.
"""),
("Long 3 — Hero", "1600 × 900 landscape", """
Eight identical unlabelled software cards outlined in neutral #9DB2B7, arranged loosely and
DELIBERATELY EQUAL — no ordering, no highlight, nothing raised among them.

They flow toward a central seven-part framework band labelled in UPPERCASE letterspaced
white: THE AEO BUYER'S STANDARD. Only this band has presence — a dimensional card with a
soft shadow, a 1px green edge and a fine internal grid.

From it, six thin green lines branch to six UPPERCASE white destinations:
ENTERPRISE INTELLIGENCE · FOCUSED ANALYTICS · BROAD MONITORING · AGENT EXPERIENCE ·
SEO + GEO · DIAGNOSE, FIX, PROVE

Eyebrow top-left: AEO ANALYZERS · CATEGORY REFERENCE
Headline: Best AEO tools & software in 2026
Sub-line in green: Compare the operating model before you compare the feature count.

NO winner mark, stars, podium, medals or vendor logos.
"""),
("Long 3 — OG card", "1200 × 630 landscape", """
A large white headline on the left reading: Best AEO tools & software in 2026
Beneath it a green sub-line reading: What to compare before you buy.

Right side: the seven Buyer's Standard labels as a simple checklist of short bars outlined
in neutral #9DB2B7, ALL UNFILLED AND EQUAL.

NO VENDOR NAMES ANYWHERE IN THE ARTWORK. No logos, no rankings, no stars, no winner badges.
Must be readable as a feed thumbnail at quarter size.
"""),
]

NOTES = """PRODUCTION NOTES

Proof every rendered word. Generators mangle text. If a headline comes back with a typo,
keep the illustration and set the type yourself — do not re-roll and hope.

Export opaque RGB with no alpha channel. A PNG carrying transparency renders black-on-black
in some feeds. Inspect the channel; do not judge by eye.

Never upscale. Generate at or above final size and downscale only. JPEG quality 95 at 4:4:4
chroma, or PNG-24 for flat vector work.

Check every OG card at quarter size before publishing. If the sub-line is unreadable as a
feed thumbnail, the card has failed however good it looks at full size.

Do not tint any colour toward the background to soften it. Measured contrast on #000603:
white 20.4:1, green #68E66D 12.8:1, amber #E8B23C 10.6:1, clay #F2705C 7.1:1, neutral
#9DB2B7 9.2:1. Every one clears WCAG AAA and each is at its value for a reason."""

INTRO = {
 'SHORT-BLOG-PROMPTS': ("SHORT BLOG — image prompts",
   "Replaces the appendix in AEO_Analyzers_Buyers_Standard_SHORT_Series.docx. Six images: "
   "hero 1600x900 and OG card 1200x630 for each of the three published short reads.\n\n"
   "EVERY PROMPT BELOW IS COMPLETE AND STANDALONE. Copy one block, paste it, generate. "
   "Nothing needs to be assembled from other sections.\n\n"
   "What changed: the original appendix specified ink-teal #08343B with bright teal #2DD4BF "
   "and cream #F4F1EA, plus pictographic icons — eye, radar, magnifying glass, wrench. None "
   "of that is the brand. Colours were sampled directly from the shipped asset "
   "aeoanalyzers-og-brand.png: background #000603, signal #68E66D bright GREEN not teal, "
   "type #FFFFFF. The shipped card uses no pictographic icons at all; its motif is the "
   "data-bar — an outlined rectangle with a partial fill and a visible value."),
 'BUYER-GUIDE-PROMPTS': ("BUYER GUIDE / LONG-FORM — image prompts",
   "Replaces the appendix in AEO_Analyzers_Buyers_Standard_LONG_Form_Series.docx. Six images: "
   "hero 1600x900 and OG card 1200x630 for each of the three long-form pieces.\n\n"
   "EVERY PROMPT BELOW IS COMPLETE AND STANDALONE. Copy one block, paste it, generate. "
   "Nothing needs to be assembled from other sections.\n\n"
   "What changed: the original appendix specified ink-teal with bright teal and cream, plus "
   "simple flat icons. Colours were sampled from the shipped asset aeoanalyzers-og-brand.png: "
   "background #000603, signal #68E66D bright GREEN not teal, type #FFFFFF, and no "
   "pictographic icons. Two further changes of substance: the cream SERIF headline is dropped "
   "because the brand headline face is a heavy geometric grotesque; and the vendor list that "
   "ran along the bottom of the Long 3 OG card is removed, because naming seven competitors "
   "inside a published image — undated, unsourced and uncorrectable — is a claim we cannot "
   "maintain, and a screenshotted card outlives the page it came from."),
 'BLOG-HERO-PROMPTS': ("BLOG HEROES — image prompts",
   "Three published posts carry a working OG card and no body image at all: "
   "/blog/what-you-actually-get (872 words), /blog/reading-isnt-citing (1,218) and "
   "/blog/are-you-the-answer-ai-gives (1,291). Each is a wall of prose.\n\n"
   "EVERY PROMPT BELOW IS COMPLETE AND STANDALONE. Copy one block, paste it, generate.\n\n"
   "Sized 1672 x 941 to match the hero already shipped on /blog/i-scored-zero. Two "
   "constraints are specific to this set. Competitors are never named inside artwork, "
   "because a screenshotted card outlives the page that dated the claim. And the Meridian "
   "post is a WORKED SAMPLE, so its figures either carry the word SAMPLE in the image or "
   "do not appear — these prompts take the second option and render no numeral at all."),
}

# ------------------------------------------------------------------ BLOG HEROES
# Three published posts carry a working OG card and NOTHING in the body: 872 to 1,291
# words of unbroken prose. These are the heroes that fix that. Sized 1672 x 941 to match
# the Part 1 hero already shipped at /blog/i-scored-zero, so the set is consistent.
#
# One rule here that does not apply to the buyer-series prompts: the Meridian post is a
# WORKED SAMPLE. Its numbers describe a demonstration company, not a customer and not us.
# A card outlives the page it came from, so those figures either carry the word SAMPLE in
# the artwork or they do not appear at all. The prompts below take the second option.
BLOG = [
("Blog hero — What you actually get", "1672 x 941 landscape", """
Editorial infographic, edge to edge, built as a VERTICAL STACK of five deliverables — the
thing a customer receives, not a process they follow.

Right half: five full-width dimensional cards stacked with even gaps, each with a soft
shadow and a 1px green #68E66D edge. Each card carries a large white numeral at the left
(1, 2, 3, 4, 5), then an UPPERCASE letterspaced white label. Render all five cards at
EQUAL weight, equal height and equal fill — this is a list of things delivered, not a
ranking, not a maturity ladder and not a progress bar. Do not make later cards larger,
brighter or more filled than earlier ones.

Left half: the headline, and beneath it a small panel of dim transcript-style text
suggesting the stored answers the plan is built from, with one short line highlighted in
green to imply a passage being lifted as evidence.

THE TRANSCRIPT PANEL IS ILLUSTRATIVE AND MUST SAY SO. Head it with the words
TRANSCRIPT · ILLUSTRATIVE, not "stored response" and not "live". The lines inside are
invented filler standing in for a real stored answer, so the panel must not present itself
as a record of anything. Set the body lines dim enough to read as texture rather than as
content — legible as shape, not as a quotable claim. Give them no line numbers, no
timestamps and no figures of any kind; a crisp, numbered, fully legible transcript reads as
real evidence, and inventing evidence is the one thing this company cannot do in a picture
about evidence.

Eyebrow top-left: AEO ANALYZERS · WHAT YOU ACTUALLY GET

NUMBERS. The only numerals in this image are the card numbers 1 to 5, which are labels.
Do not render any percentage, score, count, price, rating, line number or date anywhere —
including inside the transcript panel — and do not invent a figure to fill a card.

EXACT VISIBLE TEXT — render each item exactly once:
AEO ANALYZERS · WHAT YOU ACTUALLY GET
A sweep does not end at a score.
CODE FIXES TO PASTE IN
CORRECTIONS FOR WHAT AI GETS WRONG
AN OFF-SITE PLAN FROM REAL CITATIONS
A BATTLE-MAP OF THE QUESTIONS
PROOF THE FIXES WORKED
Every number backed by a stored transcript.
AEO ANALYZERS
AEOANALYZERS.COM
"""),

("Blog hero — Reading isn't citing", "1672 x 941 landscape", """
Editorial infographic, edge to edge, built as a CONTRAST between two unequal quantities.

Left two-thirds: a dense field of many small neutral grey-teal #9DB2B7 page glyphs — plain
rectangles with two or three lines of dim rule work, no icons — arranged in a loose grid to
read as "everything was read". Above the field, one thin green connector leaves the mass
and travels right.

Right third: a single dimensional card, raised on its own plane with a soft shadow and a
1px clay #F2705C edge, standing empty — outlined, unfilled — to read as "and none of it
was cited". The connector arrives at it and stops short, not touching.

The visual argument is the ratio: a crowd of grey on the left, one empty outline on the
right. Do not fill the right-hand card.

Eyebrow top-left: AEO ANALYZERS · HONEST-ZERO, PART 2

NUMBERS. Render the numeral 265 once, large and white, over the grey field, with the
words AT LEAST set small directly above it — the telemetry behind this figure dropped
writes, so it is a FLOOR and not an exact count, and a bare 265 would overstate what we
can prove. A dropped write can only lose a crawl, never invent one. Render no other
numeral anywhere — no percentages, no counts, no axis values.

EXACT VISIBLE TEXT — render each item exactly once:
AEO ANALYZERS · HONEST-ZERO, PART 2
AT LEAST
265
CRAWLER VISITS IN TEN DAYS
A floor, not an exact count — the telemetry dropped writes.
CITED
Reading is passive. Citing is active.
Being read is an input. Being cited is an outcome.
AEO ANALYZERS
AEOANALYZERS.COM
"""),

("Blog hero — Is your brand the answer AI gives", "1672 x 941 landscape", """
Editorial infographic, edge to edge, built as ONE ANSWER with a shortlist inside it.

Centre-right: a large dimensional answer panel, raised with a soft shadow and a 1px
neutral #9DB2B7 edge, styled as an assistant's reply — a stack of dim white text lines.
Inside it, three short source chips sit inline: two filled neutral grey-teal #9DB2B7 and
UNLABELLED, and one outlined in clay #F2705C and empty. The empty outlined chip is the
point: the buyer asked, the answer named somebody, and it was not you.

Left: the headline, and beneath it one green #68E66D underline rule.

The two filled chips must carry NO text of any kind. Do not invent competitor names, do
not letter them A and B, do not add logos or initials. They are anonymous because naming
a competitor inside a published image is a claim that cannot be dated or corrected once
the card is screenshotted.

Eyebrow top-left: AEO ANALYZERS · CATEGORY QUESTIONS

NUMBERS. Render no numeral anywhere in this image. No percentages, no counts, no scores.
The figures in this post describe a demonstration company, and a card outlives its caption.

EXACT VISIBLE TEXT — render each item exactly once:
AEO ANALYZERS · CATEGORY QUESTIONS
Is your brand the answer AI gives?
Or is a competitor?
WHO GETS NAMED WHEN YOUR NAME IS NOT IN THE QUESTION
AEO ANALYZERS
AEOANALYZERS.COM
"""),
("Blog hero — I scored zero (two-panel, corrected)", "1672 x 941 landscape", """
Editorial infographic, edge to edge, built as TWO PANELS SIDE BY SIDE showing the same four
engines answering two different kinds of question. This replaces an earlier draft that used
the engines' real logos and two invented bar charts; neither appears here.

Lower half, two large dimensional panels of equal size, each raised on its own plane with a
soft shadow. LEFT panel has a 1px green #68E66D edge. RIGHT panel has a 1px clay #F2705C
edge. Inside each, a vertical list of four rows. Each row is the engine's NAME set in white
sentence case — ChatGPT, Claude, Perplexity, Gemini — followed by a thin neutral #9DB2B7
leader line and a status mark at the right. In the LEFT panel all four marks are green
check marks. In the RIGHT panel all four marks are clay crosses. Same four names, same
order, both sides.

Above each panel, its own large numeral and label. Left: 98% in green, labelled BRANDED
RETRIEVABILITY, with a small white asterisk immediately after the numeral. Right: 0% in
clay, labelled CATEGORY CITATION WIN.

Upper left: the eyebrow, the headline, and the sub-line.

NO LOGOS. Do not draw the OpenAI, Anthropic, Google, Gemini or Perplexity marks, or any
approximation of them. The engines appear as plain white text names only.

NO CHARTS. Do not add bar charts, sparklines, trend lines, progress bars, gauges, arrows
implying growth, or any ascending sequence of shapes. There is no time series behind this
image and a chart would assert one. The four check marks and four crosses ARE the data.

NUMBERS. Exactly two figures appear: 98% and 0%. Render no other numeral anywhere — no
axis values, no counts, no sample sizes inside the artwork, no dates.

NO NEON. Flat dimensional cards with soft shadows only. No glowing doorways, no light
spill on a floor, no bevels, no 3-D extrusion, no lens flare, no reflections.

EXACT VISIBLE TEXT — render each item exactly once:
AEO ANALYZERS · HONEST-ZERO, PART 1
I ran my own AI-visibility tool on my own site. It scored 0%.
The engines had already read the site. They just did not cite it when buyer questions mattered.
98%
*
BRANDED RETRIEVABILITY
ASK BY NAME. THEY FIND YOU.
0%
CATEGORY CITATION WIN
ASK WHAT BUYERS ASK. YOU ARE NOT THERE.
ChatGPT
Claude
Perplexity
Gemini
*98% predates transcript retention and cannot be re-derived. See corrections.
AEO ANALYZERS
AEOANALYZERS.COM

Set the asterisk footnote line small, in neutral #9DB2B7, directly beneath the left panel.
It is not decoration and it must be legible: the image is allowed to carry that number only
because it carries the caveat with it.
"""),
]

def write_md(key, items):
    title, intro = INTRO[key]
    out = [f"# {title}\n", intro, "\n---\n"]
    for name, size, comp in items:
        out.append(f"\n## {name} · {size}\n")
        out.append("```text")
        out.append(prompt(size, comp))
        out.append("```\n")
    out.append("\n---\n\n## " + NOTES.split('\n')[0] + "\n")
    out.append("\n".join(NOTES.split('\n')[2:]))
    open(f"{OUT}/{key}.md", 'w', encoding='utf-8').write("\n".join(out))

def write_docx(key, items):
    title, intro = INTRO[key]
    d = Document()
    for s in d.sections:
        s.left_margin = s.right_margin = Inches(0.8)
    d.add_heading(title, 0)
    for para in intro.split('\n\n'):
        d.add_paragraph(para)
    for name, size, comp in items:
        d.add_page_break()
        d.add_heading(f"{name} · {size}", level=1)
        p = d.add_paragraph()
        p.add_run("Complete prompt — copy everything below this line.").italic = True
        box = d.add_paragraph(prompt(size, comp))
        for run in box.runs:
            run.font.name = 'Consolas'; run.font.size = Pt(9)
        box.paragraph_format.left_indent = Inches(0.15)
        box.paragraph_format.space_after = Pt(10)
    d.add_page_break()
    d.add_heading("Production notes", level=1)
    for para in NOTES.split('\n\n')[1:]:
        d.add_paragraph(para.replace('\n', ' '))
    d.save(f"{OUT}/{key}.docx")

for key, items in [('SHORT-BLOG-PROMPTS', SHORT), ('BUYER-GUIDE-PROMPTS', LONG),
                   ('BLOG-HERO-PROMPTS', BLOG)]:
    write_md(key, items); write_docx(key, items)
    md = open(f"{OUT}/{key}.md", encoding='utf-8').read()
    print(f"{key}: {len(items)} standalone prompts | md {len(md)} chars | docx written")
