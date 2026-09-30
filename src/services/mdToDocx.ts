// WO-AEO-REPORT-POLISH-001 Lane C — markdown → docx, shared by the Sweep report (whole document)
// and the Score report (its cover page), so the two reports set type the same way.
//
// Generic markdown: headings, bullets, numbered lists, pipe tables, fenced code, **bold** and
// `code` runs, whole-line italics. Plus three directives, written as HTML comments so every
// markdown viewer ignores them (see lib/reportCover.ts DIRECTIVE):
//   <!-- cover:title -->      the next H1 is the document title (large), the line after it the meta line
//   <!-- cover:headlines -->  the next pipe table is rendered as headline tiles (big numbers)
//   <!-- cover:bars -->       the next pipe table (label | pct | detail) is a shaded bar block —
//                             cell shading and widths only, no chart library, renders everywhere
//   <!-- pagebreak -->        a page break
// Typography: Calibri 10pt body, heading hierarchy with keepNext (no orphan headings), table
// header shading, generous spacing. Key numbers are bold because the markdown marks them.

type Docx = typeof import('docx');
type Child = InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>;

const FONT = 'Calibri';
const MONO = 'Consolas';
const INK = '0F172A';
const MUTED = '52525B';
const RULE = 'D4D4D8';
const HEAD_FILL = 'EEF2F7';
const BAR_FILL = '15803D';   // green-700 on white — 4.5:1+ for the value text beside it
const BAR_EMPTY = 'E4E4E7';
const BAR_SEGMENTS = 20;

export function inlineRuns(D: Docx, text: string, base: { italics?: boolean; size?: number; color?: string; bold?: boolean } = {}) {
  const { TextRun } = D;
  const runs: InstanceType<Docx['TextRun']>[] = [];
  const rx = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const size = base.size ?? 20;
  const color = base.color ?? INK;
  while ((m = rx.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size, italics: base.italics, color, bold: base.bold }));
    const tok = m[0];
    if (tok.startsWith('**')) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, size, italics: base.italics, color }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), font: MONO, size: Math.max(16, size - 2), color }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), font: FONT, size, italics: base.italics, color, bold: base.bold }));
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
const strip = (s: string) => s.replace(/\*\*/g, '');

export function mdToDocxChildren(D: Docx, markdown: string, opts: { contentWidth: number }): Child[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak, AlignmentType } = D;
  const W = opts.contentWidth;
  const children: Child[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const gap = (after = 40) => new Paragraph({ children: [new TextRun({ text: '', size: 8 })], spacing: { after } });

  let mode: 'title' | 'headlines' | 'bars' | null = null;
  let i = 0;
  const readTable = (): string[][] => {
    const rows: string[][] = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      if (!isTableSep(lines[i])) rows.push(splitCells(lines[i]));
      i++;
    }
    return rows;
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '<!-- pagebreak -->') { children.push(new Paragraph({ children: [new PageBreak()] })); i++; continue; }
    if (t === '<!-- cover:title -->') { mode = 'title'; i++; continue; }
    if (t === '<!-- cover:headlines -->') { mode = 'headlines'; i++; continue; }
    if (t === '<!-- cover:bars -->') { mode = 'bars'; i++; continue; }
    if (t.startsWith('<!--')) { i++; continue; } // any other comment: ignore

    if (t.startsWith('```')) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        children.push(new Paragraph({ children: [new TextRun({ text: lines[i] || ' ', font: MONO, size: 16, color: INK })], shading: { type: ShadingType.CLEAR, fill: 'F4F4F5' }, spacing: { before: 0, after: 0 } }));
        i++;
      }
      i++;
      children.push(gap(60));
      continue;
    }

    if (t.startsWith('|')) {
      const rows = readTable();
      if (!rows.length) continue;

      if (mode === 'headlines') {
        mode = null;
        // rows: [plain labels], [values], [precise], [notes?]
        const n = rows[0].length;
        const colW = Math.floor(W / n);
        const mk = (text: string, size: number, color: string, bold = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 20 }, children: inlineRuns(D, text, { size, color, bold }) });
        children.push(new Table({
          columnWidths: Array(n).fill(colW), layout: D.TableLayoutType.FIXED, width: { size: W, type: WidthType.DXA },
          rows: [new TableRow({ children: Array.from({ length: n }, (_, ci) => new TableCell({
            width: { size: colW, type: WidthType.DXA }, borders: { ...noBorders, top: { style: BorderStyle.SINGLE, size: 12, color: BAR_FILL } },
            margins: { top: 120, bottom: 120, left: 60, right: 120 },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            children: [
              mk(rows[0][ci] || '', 18, MUTED, true),
              mk(strip(rows[1]?.[ci] || ''), 52, INK, true),
              mk(rows[2]?.[ci] || '', 17, MUTED),
              ...(rows[3]?.[ci] ? [mk(rows[3][ci], 16, MUTED)] : []),
            ],
          })) })],
        }));
        children.push(gap(120));
        continue;
      }

      if (mode === 'bars') {
        mode = null;
        const bars = rows.slice(1); // the first pipe row is the (empty) markdown header
        const labelW = 2400, valueW = 2000;
        const segW = Math.floor((W - labelW - valueW) / BAR_SEGMENTS);
        const cols = [labelW, ...Array(BAR_SEGMENTS).fill(segW), valueW];
        const tw = labelW + segW * BAR_SEGMENTS + valueW;
        children.push(new Table({
          columnWidths: cols, layout: D.TableLayoutType.FIXED, width: { size: tw, type: WidthType.DXA },
          rows: bars.map(([label, pctText, detail]) => {
            const pctNum = /^(\d+)%$/.exec(pctText || '');
            const filled = pctNum ? Math.round((Number(pctNum[1]) / 100) * BAR_SEGMENTS) : 0;
            return new TableRow({ children: [
              new TableCell({ width: { size: labelW, type: WidthType.DXA }, borders: noBorders, margins: { top: 50, bottom: 50, right: 100 }, children: [new Paragraph({ children: inlineRuns(D, label || '', { size: 18, bold: true }) })] }),
              ...Array.from({ length: BAR_SEGMENTS }, (_, k) => new TableCell({
                width: { size: segW, type: WidthType.DXA }, borders: noBorders,
                shading: { type: ShadingType.CLEAR, fill: k < filled ? BAR_FILL : BAR_EMPTY },
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: ' ', size: 14 })] })],
              })),
              new TableCell({ width: { size: valueW, type: WidthType.DXA }, borders: noBorders, margins: { top: 50, bottom: 50, left: 120 }, children: [new Paragraph({ children: [
                new TextRun({ text: pctText || '', bold: true, font: FONT, size: 18, color: INK }),
                new TextRun({ text: detail ? `  ${detail}` : '', font: FONT, size: 15, color: MUTED }),
              ] })] }),
            ] });
          }),
        }));
        children.push(gap(120));
        continue;
      }

      // Ordinary pipe table: header shaded, DXA widths proportional to content.
      const nCols = Math.max(...rows.map((r) => r.length));
      const weights = Array.from({ length: nCols }, (_, ci) => Math.min(60, Math.max(8, Math.max(...rows.map((r) => (r[ci] || '').length)))));
      const total = weights.reduce((a, b) => a + b, 0);
      const cols = weights.map((w) => Math.max(700, Math.floor((w / total) * W)));
      children.push(new Table({
        columnWidths: cols, layout: D.TableLayoutType.FIXED, width: { size: W, type: WidthType.DXA },
        rows: rows.map((cells, ri) => new TableRow({
          tableHeader: ri === 0, cantSplit: true,
          children: Array.from({ length: nCols }, (_, ci) => new TableCell({
            width: { size: cols[ci], type: WidthType.DXA }, borders,
            shading: ri === 0 ? { type: ShadingType.CLEAR, fill: HEAD_FILL } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: inlineRuns(D, cells[ci] ?? '', { size: 18, bold: ri === 0 }) })],
          })),
        })),
      }));
      children.push(gap(80));
      continue;
    }

    if (t === '') { children.push(gap(40)); i++; continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      const level = h[1].length;
      if (mode === 'title' && level === 1) {
        children.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: strip(h[2]), bold: true, font: FONT, size: 44, color: INK })] }));
        i++;
        if (i < lines.length && lines[i].trim()) {
          children.push(new Paragraph({ spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE } }, children: inlineRuns(D, lines[i].trim(), { size: 19, color: MUTED }) }));
          i++;
        }
        mode = null;
        continue;
      }
      const heading = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      const size = level === 1 ? 34 : level === 2 ? 27 : 22;
      children.push(new Paragraph({
        heading, keepNext: true,
        spacing: { before: level === 1 ? 160 : level === 2 ? 300 : 200, after: level === 3 ? 80 : 120 },
        border: level === 2 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE } } : undefined,
        children: [new TextRun({ text: strip(h[2]), bold: true, font: FONT, size, color: INK })],
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
      children.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360, hanging: 360 }, children: [new TextRun({ text: `${num[1]}. `, font: FONT, size: 20, color: INK }), ...inlineRuns(D, num[2])] }));
      i++; continue;
    }
    const italic = /^_(.*)_$/.exec(t);
    if (italic) {
      children.push(new Paragraph({ spacing: { after: 80 }, children: inlineRuns(D, italic[1], { italics: true, size: 18, color: MUTED }) }));
      i++; continue;
    }
    if (t === '---') { children.push(new Paragraph({ spacing: { after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } }, children: [new TextRun({ text: '', size: 8 })] })); i++; continue; }

    children.push(new Paragraph({ spacing: { after: 90, line: 276 }, children: inlineRuns(D, line) }));
    i++;
  }
  return children;
}
