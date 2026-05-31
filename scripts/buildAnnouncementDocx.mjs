// Build a consolidated Word (.docx) launch announcement for AEO Analyzers from
// the markdown source docs. Run: node scripts/buildAnnouncementDocx.mjs
// Output: C:\Users\Linds\Downloads\AEO-Analyzers-Launch-Announcement.docx
//
// Lightweight markdown → docx: handles #/##/###/#### headings, - / * / N. bullets,
// > quotes, --- rules, **bold** inline, `code`, and [text](url) links.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = '/mnt/c/Users/Linds/Downloads/AEO-Analyzers-Launch-Announcement.docx';

const SOURCES = [
  { file: 'docs/blog-relaunch-2026.md', title: 'Part 1 — The Launch Announcement (long-form article)' },
  { file: 'docs/launch-announcement-kit.md', title: 'Part 2 — Channel Posts, Schedule & Image Prompts' },
  { file: 'docs/visual-canon.md', title: 'Part 3 — Visual Canon (image ↔ story mapping)' },
];

const d = await import('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = d;

const NAVY = '1a1a2e';
const GREY = '555555';

function inlineRuns(text, baseOpts = {}) {
  // links [t](u) -> "t (u)"
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  text = text.replace(/`([^`]+)`/g, '$1');
  const runs = [];
  // split on **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('**') && p.endsWith('**')) {
      runs.push(new TextRun({ text: p.slice(2, -2), bold: true, ...baseOpts }));
    } else {
      runs.push(new TextRun({ text: p, ...baseOpts }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', ...baseOpts })];
}

function mdToParagraphs(md) {
  const out = [];
  for (let raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { out.push(new Paragraph({ spacing: { after: 80 } })); continue; }
    if (/^#\s/.test(line))    { out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: inlineRuns(line.replace(/^#\s/, ''), { bold: true, size: 32, color: NAVY }) })); continue; }
    if (/^##\s/.test(line))   { out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: inlineRuns(line.replace(/^##\s/, ''), { bold: true, size: 26, color: NAVY }) })); continue; }
    if (/^###\s/.test(line))  { out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 }, children: inlineRuns(line.replace(/^###\s/, ''), { bold: true, size: 22, color: NAVY }) })); continue; }
    if (/^####\s/.test(line)) { out.push(new Paragraph({ spacing: { before: 140, after: 60 }, children: inlineRuns(line.replace(/^####\s/, ''), { bold: true, size: 20, color: GREY }) })); continue; }
    if (/^---+$/.test(line))  { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } }, spacing: { after: 120 } })); continue; }
    if (/^\s*[-*]\s/.test(line)) { out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: inlineRuns(line.replace(/^\s*[-*]\s/, ''), { size: 22, color: '333333' }) })); continue; }
    if (/^\s*\d+\.\s/.test(line)) { out.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: inlineRuns(line.replace(/^\s*/, ''), { size: 22, color: '333333' }) })); continue; }
    if (/^>\s?/.test(line)) { out.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 60 }, children: inlineRuns(line.replace(/^>\s?/, ''), { italics: true, size: 22, color: GREY }) })); continue; }
    out.push(new Paragraph({ spacing: { after: 100 }, children: inlineRuns(line, { size: 22, color: '333333' }) }));
  }
  return out;
}

const children = [
  new Paragraph({ spacing: { before: 1200 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'AEO Analyzers', bold: true, size: 56, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'Launch Announcement Kit', size: 32, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'Be the answer AI gives.', italics: true, size: 24, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'PI GenAI LLC · Lindsay Hiebert · https://www.aeoanalyzers.com', size: 20, color: '999999' })] }),
];

for (const s of SOURCES) {
  const md = readFileSync(path.join(ROOT, s.file), 'utf8');
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { after: 160 }, children: [new TextRun({ text: s.title, bold: true, size: 30, color: NAVY })] }));
  children.push(...mdToParagraphs(md));
}

const doc = new Document({
  creator: 'AEO Analyzers',
  title: 'AEO Analyzers — Launch Announcement Kit',
  sections: [{ children }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes)`);
