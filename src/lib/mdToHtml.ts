// WO-AEO-REPORT-POLISH-001 Lane E — the report markdown as print-ready HTML, for the PDF.
//
// Same subset and the same three directives as services/mdToDocx.ts, so the PDF and the docx
// come from one text and cannot carry different numbers. Print CSS: A4, page breaks where the
// markdown says so, no colour that depends on a background the printer will drop.
import { DIRECTIVE } from './reportCover';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
const cells = (line: string) => { let t = line.trim(); if (t.startsWith('|')) t = t.slice(1); if (t.endsWith('|')) t = t.slice(0, -1); return t.split('|').map((c) => c.trim()); };
const isSep = (l: string) => /^\|?\s*:?-{2,}/.test(l.trim());

export const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 Calibri, "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  .meta { color: #52525b; font-size: 9.5pt; border-bottom: 1px solid #d4d4d8; padding-bottom: 6pt; margin-bottom: 12pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1px solid #d4d4d8; padding-bottom: 2pt; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; page-break-after: avoid; }
  p { margin: 0 0 6pt; } ul, ol { margin: 0 0 6pt 18pt; padding: 0; } li { margin: 0 0 2pt; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 8pt; font-size: 9.5pt; page-break-inside: auto; }
  th, td { border: 1px solid #d4d4d8; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #eef2f7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  pre { background: #f4f4f5; font: 8.5pt/1.35 Consolas, monospace; padding: 6pt; white-space: pre-wrap; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  em.note { color: #52525b; }
  hr { border: 0; border-top: 1px solid #d4d4d8; margin: 8pt 0; }
  .pagebreak { page-break-before: always; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin: 0 0 12pt; }
  .tile { border-top: 3px solid #15803d; background: #f8fafc; padding: 8pt 8pt 6pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tile .plain { font-size: 9pt; font-weight: 700; color: #52525b; } .tile .value { font-size: 26pt; font-weight: 800; line-height: 1.1; margin: 2pt 0; }
  .tile .precise, .tile .note { font-size: 8.5pt; color: #52525b; }
  .bars { width: 100%; border-collapse: collapse; margin: 0 0 10pt; } .bars td { border: 0; padding: 2pt 4pt; font-size: 9pt; }
  .bars .label { width: 28%; font-weight: 700; } .bars .track { width: 52%; } .bars .val { width: 20%; }
  .track div { height: 8pt; background: #e4e4e7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .track div div { height: 8pt; background: #15803d; }
`;

export function mdToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let mode: 'title' | 'headlines' | 'bars' | null = null;
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  let i = 0;
  const readTable = () => { const rows: string[][] = []; while (i < lines.length && lines[i].trim().startsWith('|')) { if (!isSep(lines[i])) rows.push(cells(lines[i])); i++; } return rows; };
  while (i < lines.length) {
    const line = lines[i]; const t = line.trim();
    if (t === DIRECTIVE.pagebreak) { closeList(); out.push('<div class="pagebreak"></div>'); i++; continue; }
    if (t === DIRECTIVE.title) { mode = 'title'; i++; continue; }
    if (t === DIRECTIVE.headlines) { mode = 'headlines'; i++; continue; }
    if (t === DIRECTIVE.bars) { mode = 'bars'; i++; continue; }
    if (t.startsWith('<!--')) { i++; continue; }
    if (t.startsWith('```')) {
      closeList(); i++; const code: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(esc(lines[i++]));
      i++; out.push(`<pre>${code.join('\n')}</pre>`); continue;
    }
    if (t.startsWith('|')) {
      closeList(); const rows = readTable(); if (!rows.length) continue;
      if (mode === 'headlines') {
        mode = null; const n = rows[0].length;
        out.push('<div class="tiles">');
        for (let c = 0; c < n; c++) out.push(`<div class="tile"><div class="plain">${inline(rows[0][c] || '')}</div><div class="value">${inline(rows[1]?.[c] || '')}</div><div class="precise">${inline(rows[2]?.[c] || '')}</div>${rows[3]?.[c] ? `<div class="note">${inline(rows[3][c])}</div>` : ''}</div>`);
        out.push('</div>'); continue;
      }
      if (mode === 'bars') {
        mode = null; out.push('<table class="bars">');
        for (const [label, pctText, detail] of rows.slice(1)) {
          const m = /^(\d+)%$/.exec(pctText || ''); const w = m ? Number(m[1]) : 0;
          out.push(`<tr><td class="label">${inline(label || '')}</td><td class="track"><div><div style="width:${w}%"></div></div></td><td class="val"><b>${esc(pctText || '')}</b> <span style="color:#52525b">${esc(detail || '')}</span></td></tr>`);
        }
        out.push('</table>'); continue;
      }
      out.push('<table>');
      rows.forEach((r, ri) => out.push(`<tr>${r.map((c) => (ri === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`));
      out.push('</table>'); continue;
    }
    if (t === '') { closeList(); i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      closeList(); const lvl = h[1].length;
      if (mode === 'title' && lvl === 1) {
        out.push(`<h1>${inline(h[2])}</h1>`); i++;
        if (i < lines.length && lines[i].trim()) { out.push(`<div class="meta">${inline(lines[i].trim())}</div>`); i++; }
        mode = null; continue;
      }
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue;
    }
    const b = /^\s*[-*]\s+(.*)$/.exec(line);
    if (b) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(b[1])}</li>`); i++; continue; }
    const n = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (n) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(n[2])}</li>`); i++; continue; }
    closeList();
    if (t === '---') { out.push('<hr>'); i++; continue; }
    const it = /^_(.*)_$/.exec(t);
    if (it) { out.push(`<p><em class="note">${inline(it[1])}</em></p>`); i++; continue; }
    out.push(`<p>${inline(line)}</p>`); i++;
  }
  closeList();
  return out.join('\n');
}

/** A complete print document. The <title> is what browsers use as the default PDF filename. */
export function printDocument(markdown: string, filenameStem: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(filenameStem)}</title><style>${PRINT_CSS}</style></head><body>${mdToHtml(markdown)}</body></html>`;
}
