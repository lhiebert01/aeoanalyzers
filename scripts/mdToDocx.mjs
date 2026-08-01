// Generic Markdown → .docx converter (reuses the `docx` package already in the repo).
//   node scripts/mdToDocx.mjs <input.md> <output.docx> ["Doc Title"]
// Handles #/##/###/#### headings, --- rules, - bullets, 1. lists, > quotes, and
// inline **bold** / *italic* / [text](url). Built for the launch/POSSE packs.

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, title] = process.argv;
if (!inPath || !outPath) { console.error('usage: node scripts/mdToDocx.mjs <input.md> <output.docx> ["Title"]'); process.exit(1); }

const d = await import('docx');
const { Document, Packer, Paragraph, TextRun, ExternalHyperlink, HeadingLevel, AlignmentType, BorderStyle } = d;

const NAVY = '0E3A44';   // teal-deep, on brand
const GREY = '55606a';
const LINK = '0B6E7A';   // teal, for hyperlinks

const link = (text, url, base) => new ExternalHyperlink({ link: url, children: [new TextRun({ text, color: LINK, underline: {}, ...base })] });

function inlineRuns(text, base = {}) {
  const runs = [];
  // bold | italic | [text](url) | `code` | bare URL  — real clickable hyperlinks.
  const rx = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|(https?:\/\/[^\s)]+)/g;
  let last = 0, m;
  while ((m = rx.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[1] !== undefined) runs.push(new TextRun({ text: m[1], bold: true, ...base }));
    else if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], italics: true, ...base }));
    else if (m[3] !== undefined) runs.push(link(m[3], m[4], base));                    // [text](url)
    else if (m[5] !== undefined) runs.push(new TextRun({ text: m[5], font: 'Consolas', ...base }));
    else if (m[6] !== undefined) runs.push(link(m[6].replace(/[.,]$/, ''), m[6].replace(/[.,]$/, ''), base)); // bare URL
    last = rx.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs.length ? runs : [new TextRun({ text: '', ...base })];
}

function mdToParagraphs(md) {
  const out = [];
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { out.push(new Paragraph({ spacing: { after: 80 } })); continue; }
    if (/^#\s/.test(line))    { out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 120 }, children: inlineRuns(line.replace(/^#\s/, ''), { bold: true, size: 30, color: NAVY }) })); continue; }
    if (/^##\s/.test(line))   { out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: inlineRuns(line.replace(/^##\s/, ''), { bold: true, size: 25, color: NAVY }) })); continue; }
    if (/^###\s/.test(line))  { out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 }, children: inlineRuns(line.replace(/^###\s/, ''), { bold: true, size: 22, color: NAVY }) })); continue; }
    if (/^####\s/.test(line)) { out.push(new Paragraph({ spacing: { before: 140, after: 60 }, children: inlineRuns(line.replace(/^####\s/, ''), { bold: true, size: 20, color: GREY }) })); continue; }
    if (/^---+$/.test(line))  { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } }, spacing: { after: 120 } })); continue; }
    if (/^\s*[-*]\s/.test(line)) { out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: inlineRuns(line.replace(/^\s*[-*]\s/, ''), { size: 21, color: '333333' }) })); continue; }
    if (/^\s*\d+\.\s/.test(line)) { out.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: inlineRuns(line.replace(/^\s*/, ''), { size: 21, color: '333333' }) })); continue; }
    if (/^>\s?/.test(line)) { out.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 60 }, children: inlineRuns(line.replace(/^>\s?/, ''), { size: 21, color: '333333' }) })); continue; }
    out.push(new Paragraph({ spacing: { after: 100 }, children: inlineRuns(line, { size: 21, color: '333333' }) }));
  }
  return out;
}

const md = readFileSync(inPath, 'utf8');
const children = [];
if (title) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: title, bold: true, size: 34, color: NAVY })] }));
children.push(...mdToParagraphs(md));

const doc = new Document({ sections: [{ properties: {}, children }] });
const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);
console.error(`wrote ${outPath} (${buf.length} bytes)`);
