# -*- coding: utf-8 -*-
"""WO-AEO-BLOG-SITE-DISTRIBUTION-009 D — KC AI Expo table card and leave-behind block.

Generated, never hand-edited (binary deliverables are regenerated from their source of
record). The leave-behind paragraph is read from section 6 of the distribution pack so the
two cannot drift. The QR code is generated locally; no third-party QR service.

Writes docs/launch/expo/table-card.pdf (5 x 7 in) and leave-behind-paragraph.pdf (Letter),
plus 150 dpi PNG previews of each. No price anywhere (asserted).

Usage: python3 scripts/build-expo-pdfs.py
"""
import io, os, re
import qrcode
from qrcode.constants import ERROR_CORRECT_M
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

OUT = 'docs/launch/expo'
PACK = 'docs/launch/AEO-DISTI-PACK-the-measurement-layer.md'
URL = 'https://aeoanalyzers.com/blog/the-measurement-layer'
BG, GREEN, WHITE, GREY = '#000603', '#68E66D', '#FFFFFF', '#9DB2B7'   # contrast on BG: 12.8, 20.4, 9.2

pack = open(PACK, encoding='utf-8').read()
sec6 = pack[pack.index('## 6.'):pack.index('## 7.')]
PARA = ' '.join(l[2:].strip() for l in sec6.splitlines() if l.startswith('> '))
assert PARA.startswith('AEO Analyzers measures') and not re.search(r'\$\s?\d', PARA)

def qr_image():
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=20, border=2)
    q.add_data(URL); q.make(fit=True)
    img = q.make_image(fill_color='black', back_color='white').convert('RGB')
    b = io.BytesIO(); img.save(b, 'PNG'); b.seek(0)
    return ImageReader(b)

def spaced(c, x, y, text, font, size, color, tracking):
    c.setFont(font, size); c.setFillColor(color)
    for ch in text:
        c.drawString(x, y, ch); x += c.stringWidth(ch, font, size) + tracking

def footer(c, w, m, y):
    c.setStrokeColor(GREEN); c.setLineWidth(1.2); c.line(m, y + 16, w - m, y + 16)
    spaced(c, m, y, 'AEO ANALYZERS · AEOANALYZERS.COM', 'Helvetica', 8, WHITE, 1.6)

def qr_block(c, x, y, size):
    c.setFillColor(WHITE); c.roundRect(x - 8, y - 8, size + 16, size + 16, 8, stroke=0, fill=1)
    c.drawImage(qr_image(), x, y, size, size)

def table_card(path):
    w, h = 5 * inch, 7 * inch; m = 0.4 * inch
    c = canvas.Canvas(path, pagesize=(w, h)); c.setTitle('AEO Analyzers — KC AI Expo table card'); c.setAuthor('PIGENAI LLC')
    c.setFillColor(BG); c.rect(0, 0, w, h, stroke=0, fill=1)
    spaced(c, m, h - m - 8, 'AEO ANALYZERS · BUYER SERIES', 'Helvetica', 7.5, GREY, 1.5)
    c.setStrokeColor(GREEN); c.setLineWidth(2.5); c.line(m, h - m - 20, m + 44, h - m - 20)
    c.setFillColor(WHITE); c.setFont('Helvetica-Bold', 25); c.drawString(m, h - m - 58, 'We measured ourselves.')
    c.setFillColor(GREEN); c.setFont('Helvetica-Bold', 38); c.drawString(m, h - m - 100, 'Zero percent.')
    c.setFillColor(GREY); c.setFont('Helvetica', 8.5)
    c.drawString(m, h - m - 118, 'Recommended in 0 of 200 category answers · four engines · 13 Oct 2026')
    c.setFillColor(WHITE); c.setFont('Helvetica-Bold', 17); c.drawString(m, h - m - 150, 'Read the transcript.')
    size = 2.0 * inch; qx = (w - size) / 2; qy = 1.25 * inch
    qr_block(c, qx, qy, size)
    c.setFillColor(WHITE); c.setFont('Helvetica', 8.6); c.drawCentredString(w / 2, qy - 26, URL)
    footer(c, w, m, 0.32 * inch)
    c.showPage(); c.save()

def leave_behind(path):
    w, h = letter; m = 0.75 * inch
    c = canvas.Canvas(path, pagesize=letter); c.setTitle('AEO Analyzers — leave-behind paragraph'); c.setAuthor('PIGENAI LLC')
    c.setFillColor(BG); c.rect(0, 0, w, h, stroke=0, fill=1)
    spaced(c, m, h - m, 'AEO ANALYZERS · BUYER SERIES', 'Helvetica', 9, GREY, 1.8)
    c.setStrokeColor(GREEN); c.setLineWidth(3); c.line(m, h - m - 16, m + 60, h - m - 16)
    c.setFillColor(WHITE); c.setFont('Helvetica-Bold', 26); c.drawString(m, h - m - 58, 'What AEO Analyzers does')
    style = ParagraphStyle('p', fontName='Helvetica', fontSize=15, leading=23, textColor=WHITE)
    p = Paragraph(PARA, style); pw, ph = p.wrap(w - 2 * m, h)
    p.drawOn(c, m, h - m - 90 - ph)
    size = 1.9 * inch; qy = h - m - 90 - ph - 50 - size
    qr_block(c, m + 8, qy, size)
    c.setFillColor(GREEN); c.setFont('Helvetica-Bold', 14); c.drawString(m + size + 40, qy + size - 30, 'Read the transcript.')
    c.setFillColor(WHITE); c.setFont('Helvetica', 10.5); c.drawString(m + size + 40, qy + size - 52, URL)
    footer(c, w, m, 0.5 * inch)
    c.showPage(); c.save()

def preview(pdf):
    import fitz
    doc = fitz.open(pdf); pix = doc[0].get_pixmap(dpi=150); png = pdf[:-4] + '.png'; pix.save(png)
    text = doc[0].get_text(); assert not re.search(r'\$\s?\d', text), f'price in {pdf}'
    return png, pix.width, pix.height

os.makedirs(OUT, exist_ok=True)
table_card(f'{OUT}/table-card.pdf'); leave_behind(f'{OUT}/leave-behind-paragraph.pdf')
for f in ('table-card.pdf', 'leave-behind-paragraph.pdf'):
    png, pw, ph = preview(f'{OUT}/{f}')
    print(f'  wrote {OUT}/{f} ({os.path.getsize(f"{OUT}/{f}")} bytes) + {png} ({pw}x{ph})')
