// WO-014 — the step-by-step guide as a Word file, in the reference guide's style: US Letter,
// Calibri, green section rules, shaded "copy this text" boxes, "Where to start" / "Done when"
// lines, minutes per step, and a dark-headed tracking table at the end. Built from the same
// Guide model as the PDF and the public pages (lib/stepGuide.ts), so they cannot differ.
import type { Guide } from '../lib/stepGuide';

type Docx = typeof import('docx');

const FONT = 'Calibri';
const INK = '0F172A';
const GREEN = '1F7A4D';
const BOX = 'EEF7F1';
const RULES = 'F8FAFC';
const HEAD = '0B1F17';
const W = 12240 - 2 * 1080; // US Letter width minus 0.75in margins

export async function buildGuideDocument(g: Guide) {
  const D: Docx = await import('docx');
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, HeadingLevel, ExternalHyperlink } = D;
  const runs = (text: string, base: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) => {
    const out: any[] = [];
    // **bold** and bare https links, as in the HTML renderer
    const rx = /(\*\*[^*]+\*\*|https:\/\/[^\s)]+[^\s).,])/g;
    let last = 0; let m: RegExpExecArray | null;
    const t = (s: string, bold = base.bold) => new TextRun({ text: s, font: FONT, size: base.size ?? 21, bold, italics: base.italics, color: base.color ?? INK });
    while ((m = rx.exec(text))) {
      if (m.index > last) out.push(t(text.slice(last, m.index)));
      const tok = m[0];
      if (tok.startsWith('**')) out.push(t(tok.slice(2, -2), true));
      else out.push(new ExternalHyperlink({ link: tok, children: [new TextRun({ text: tok, font: FONT, size: base.size ?? 21, color: '14532D', underline: {} })] }));
      last = m.index + tok.length;
    }
    if (last < text.length) out.push(t(text.slice(last)));
    return out.length ? out : [t('')];
  };
  const p = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; after?: number; numbered?: boolean; level?: number } = {}) =>
    new Paragraph({ children: runs(text, o), spacing: { after: o.after ?? 100 }, ...(o.numbered ? { numbering: { reference: 'steps', level: o.level ?? 0 } } : {}) });
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const line = { style: BorderStyle.SINGLE, size: 4, color: 'B7DCC5' };
  const box = (title: string, lines: string[], fill: string, mono = false) => new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W], layout: 'fixed' as any,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      borders: { top: line, bottom: line, left: line, right: line },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [p(title, { bold: true, after: 60 }), ...lines.map((l) => mono
        ? new Paragraph({ children: [new TextRun({ text: l, font: 'Consolas', size: 17, color: INK })], spacing: { after: 0 } })
        : p(l, { after: 60 }))],
    })] })],
  });
  const grid = (head: string[], rows: string[][], widths: number[]) => new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths, layout: 'fixed' as any,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEAD }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: FONT, size: 19 })] })] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } }, children: [p(c || ' ', { size: 19, after: 0 })] })) })),
    ],
  });
  const h1 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 320, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 4 } }, children: [new TextRun({ text, font: FONT, size: 30, bold: true, color: INK })] });
  const h2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 80 }, children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: INK })] });
  const gap = () => new Paragraph({ children: [], spacing: { after: 80 } });

  const c: any[] = [];
  c.push(new Paragraph({ children: [new TextRun({ text: 'AEO ANALYZERS · STEP-BY-STEP GUIDE', font: FONT, size: 18, bold: true, color: '14532D' })], spacing: { after: 80 } }));
  c.push(new Paragraph({ children: [new TextRun({ text: g.title, font: FONT, size: 40, bold: true, color: INK })], spacing: { after: 80 } }));
  c.push(p(g.subtitle, { after: 200 }));
  c.push(h1('Start here'));
  for (const l of g.startHere) c.push(p(l));
  c.push(p('The order of work', { bold: true }));
  g.order.forEach((l) => c.push(p(l, { numbered: true })));
  for (const part of g.parts) {
    c.push(h1(`${part.title} (${part.owner})`));
    for (const l of part.intro) c.push(p(l));
    for (const b of part.boxes) { c.push(box(b.title, b.tone === 'rules' ? b.lines.map((l, i) => `${i + 1}. ${l}`) : b.lines, b.tone === 'copy' ? BOX : RULES)); c.push(gap()); }
    for (const t of part.tables) { c.push(h2(t.title)); c.push(grid(t.head, t.rows, [2400, 3880, W - 6280])); c.push(gap()); }
    part.steps.forEach((s, i) => {
      c.push(h2(`${i + 1}. ${s.title}${s.minutes ? ` (about ${s.minutes} minutes)` : ''}`));
      if (s.whereToStart) c.push(p(`**Where to start:** ${s.whereToStart}`));
      s.steps.forEach((l) => c.push(p(l, { numbered: true })));
      if (s.copy) { c.push(box(s.copyTitle || 'Copy this text', s.copy, BOX)); c.push(gap()); }
      if (s.code) { c.push(box(s.copyTitle || 'Paste this', s.code.split('\n'), BOX, true)); c.push(gap()); }
      for (const n of s.notes || []) c.push(p(n, { italics: true }));
      c.push(p(`**Done when:** ${s.doneWhen}`, { after: 160 }));
    });
    for (const l of part.outro || []) c.push(p(l));
  }
  c.push(h1('Tracking table'));
  c.push(p('Fill this in as you go. Marking a step done in your Record, with its date and the address once live, fills this table the next time you download the guide. Downloading does not mark anything done.'));
  c.push(grid(['Step', 'Owner', 'Where', 'Address once live', 'Date done', 'In your Record?'], g.tracking.map((r) => [r.step, r.owner, r.where, r.address, r.date, r.inRecord]), [2900, 1000, 1500, 2160, 1250, W - 8810]));

  return new Document({
    creator: 'AEO Analyzers', title: g.fileStem, description: g.title,
    styles: { default: { document: { run: { font: FONT, size: 21, color: INK } } } },
    numbering: { config: [{ reference: 'steps', levels: [{ level: 0, format: 'decimal' as any, text: '%1.', alignment: 'left' as any, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children: c }],
  });
}

export async function downloadGuideDocx(g: Guide): Promise<void> {
  const { Packer } = await import('docx');
  const blob = await Packer.toBlob(await buildGuideDocument(g));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${g.fileStem}.docx`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/** PDF: the browser's print-to-PDF over the same model, as the sweep report does. */
export async function openGuidePdf(g: Guide): Promise<boolean> {
  const { guidePrintHtml } = await import('../lib/stepGuide');
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(guidePrintHtml(g)); w.document.close();
  w.setTimeout(() => { try { w.focus(); w.print(); } catch { /* still printable by hand */ } }, 250);
  return true;
}
