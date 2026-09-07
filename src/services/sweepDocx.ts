// Citation Sweep report → .docx (iPhone QA Sep 7 2026): iOS has no built-in
// Markdown viewer, so the sweep's key asset was unreadable on mobile. The .docx
// is a faithful rendering of the SAME report text `buildReport` produces (the .md
// stays available as the diff-clean record of truth). Generic markdown → docx:
// headings, bullets, numbered lists, pipe tables, fenced code, bold / code runs,
// whole-line italics. Code-split (dynamic import of `docx`, same as the AEO report).

type Docx = typeof import('docx');

const FONT = 'Calibri';
const MONO = 'Consolas';
// A4 (11906 twips) minus the 2×1080-twip margins set on the section below.
const CONTENT_W = 9740;

function inlineRuns(D: Docx, text: string, base: { italics?: boolean; size?: number } = {}) {
  const { TextRun } = D;
  const runs: InstanceType<Docx['TextRun']>[] = [];
  // **bold** and `code` only — underscores are common in domains/URLs, so
  // italics are handled at line level (a line wrapped in _…_), never inline.
  const rx = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const size = base.size ?? 20;
  while ((m = rx.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size, italics: base.italics }));
    const tok = m[0];
    if (tok.startsWith('**')) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, size, italics: base.italics }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), font: MONO, size: Math.max(16, size - 2) }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), font: FONT, size, italics: base.italics }));
  if (!runs.length) runs.push(new TextRun({ text: '', font: FONT, size }));
  return runs;
}

function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

const isTableSep = (line: string) => /^\|?\s*:?-{2,}/.test(line.trim());

/** Markdown → docx `Document`. Split out from the download so it can be built
 *  and text-extracted in a test (binary deliverables are never verified by grep). */
export async function buildSweepDocument(markdown: string, domain: string) {
  const D = await import('docx');
  const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = D;

  const children: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D4D4D8' };
  const borders = { top: border, bottom: border, left: border, right: border };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // Fenced code block → monospace paragraphs, shaded.
    if (t.startsWith('```')) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: lines[i] || ' ', font: MONO, size: 16 })],
          shading: { type: ShadingType.CLEAR, fill: 'F4F4F5' },
          spacing: { before: 0, after: 0 },
        }));
        i++;
      }
      i++; // closing fence
      children.push(new Paragraph({ children: [new TextRun({ text: '', size: 8 })], spacing: { after: 60 } }));
      continue;
    }

    // Pipe table → real table (separator row dropped, header row shaded).
    if (t.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        if (!isTableSep(lines[i])) rows.push(splitCells(lines[i]));
        i++;
      }
      if (rows.length) {
        const nCols = Math.max(...rows.map((r) => r.length));
        // Explicit DXA column widths + fixed layout. A percentage-only table emits
        // a <w:tblGrid> of 100-twip columns: Word auto-fits, but Google Docs, iOS
        // Quick Look and Pages honor it literally and collapse every column to one
        // character wide (iPhone QA, Sep 7 2026). Widths are proportional to the
        // longest content in each column so the text column gets the room.
        const weights = Array.from({ length: nCols }, (_, ci) =>
          Math.min(60, Math.max(8, Math.max(...rows.map((r) => (r[ci] || '').length)))));
        const total = weights.reduce((a, b) => a + b, 0);
        const cols = weights.map((w) => Math.max(700, Math.floor((w / total) * CONTENT_W)));
        children.push(new Table({
          columnWidths: cols,
          layout: D.TableLayoutType.FIXED,
          width: { size: CONTENT_W, type: WidthType.DXA },
          rows: rows.map((cells, ri) => new TableRow({
            tableHeader: ri === 0,
            children: Array.from({ length: nCols }, (_, ci) => new TableCell({
              width: { size: cols[ci], type: WidthType.DXA },
              borders,
              shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'F4F4F5' } : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [new Paragraph({ children: inlineRuns(D, cells[ci] ?? '', { size: 18 }).map((r) => r) })],
            })),
          })),
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: '', size: 8 })], spacing: { after: 80 } }));
      }
      continue;
    }

    if (t === '') { children.push(new Paragraph({ children: [new TextRun({ text: '', size: 8 })], spacing: { after: 40 } })); i++; continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      const level = h[1].length;
      const heading = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      const size = level === 1 ? 32 : level === 2 ? 26 : 22;
      children.push(new Paragraph({
        heading,
        spacing: { before: level === 1 ? 120 : 240, after: 100 },
        children: [new TextRun({ text: h[2].replace(/\*\*/g, ''), bold: true, font: FONT, size, color: '18181B' })],
      }));
      i++; continue;
    }

    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      const level = Math.min(2, Math.floor(bullet[1].length / 2));
      children.push(new Paragraph({ bullet: { level }, spacing: { after: 40 }, children: inlineRuns(D, bullet[2]) }));
      i++; continue;
    }

    const num = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (num) {
      children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360, hanging: 360 }, children: [new TextRun({ text: `${num[1]}. `, font: FONT, size: 20 }), ...inlineRuns(D, num[2])] }));
      i++; continue;
    }

    const italic = /^_(.*)_$/.exec(t);
    if (italic) {
      children.push(new Paragraph({ spacing: { after: 80 }, children: inlineRuns(D, italic[1], { italics: true, size: 18 }) }));
      i++; continue;
    }

    children.push(new Paragraph({ spacing: { after: 80 }, children: inlineRuns(D, line) }));
    i++;
  }

  return new Document({
    creator: 'AEO Analyzers',
    title: `Citation Sweep — ${domain}`,
    description: `Citation Sweep report for ${domain}`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children }],
  });
}

export async function generateSweepDocx(markdown: string, domain: string, stamp: string): Promise<void> {
  const { Packer } = await import('docx');
  const doc = await buildSweepDocument(markdown, domain);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `citation-sweep-${domain}-${stamp}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
