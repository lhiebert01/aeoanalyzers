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
const OUT = '/mnt/c/Users/Linds/Downloads/AEO-Analyzers-MASTER-Announcement.docx';

const SOURCES = [
  { file: 'docs/brand-messaging-guide.md', title: 'Part 0 — Brand & Messaging Guide (single source of truth)' },
  { file: 'docs/launch-posts-today.md', title: 'Part 1 — POST TODAY (final, accurate, paste-ready: all channels + features/benefits + Day Pass)' },
  { file: 'docs/launch-announcement-kit.md', title: 'Part 2 — Posting Calendar & Plan (when / where to post)' },
  { file: 'docs/master-announcement.md', title: 'Part 3 — Full Post Library (all pieces, with image references)' },
  { file: 'docs/article-be-the-answer.md', title: 'Part 4 — Substack / Medium Article (ready to publish: title + intro + full body)' },
  { file: 'docs/blog-relaunch-2026.md', title: 'Part 5 — The Long-Form Relaunch Article (alternate)' },
  { file: 'docs/image-prompt-playbook.md', title: 'Part 6 — Image Prompt Playbook (regenerate / enhance)' },
  { file: 'docs/visual-canon.md', title: 'Part 7 — Visual Canon (existing-image ↔ story mapping)' },
];

const d = await import('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType } = d;

function tableFrom(rows) {
  // rows: array of arrays of cell strings (first row = header)
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map((c) =>
          new TableCell({
            width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
            shading: ri === 0 ? { type: ShadingType.SOLID, color: '1a1a2e' } : undefined,
            children: [new Paragraph({ children: inlineRuns(c, ri === 0 ? { bold: true, size: 18, color: 'ffffff' } : { size: 18, color: '333333' }) })],
          })
        ),
      })
    ),
  });
}

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
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    const line = raw.replace(/\s+$/, '');
    // Markdown table: collect consecutive | rows
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const block = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { block.push(lines[i]); i++; }
      i--; // step back; outer loop will i++
      const rows = block
        .map((r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
        .filter((cells) => !cells.every((c) => /^:?-+:?$/.test(c) || c === '')); // drop separator row
      if (rows.length) out.push(tableFrom(rows));
      out.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }
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
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'Master Announcement — posts, article, image playbook', size: 30, color: GREY })] }),
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

// Write a target; if it's locked (open in Word → EACCES/EBUSY), fall back to a
// -v2 name instead of crashing, so a lock on one copy never blocks the other.
function writeResilient(target, label) {
  try {
    writeFileSync(target, buf);
    console.log(`Wrote ${label}: ${target} (${buf.length} bytes)`);
  } catch (e) {
    const alt = target.replace(/\.docx$/, '-v2.docx');
    try {
      writeFileSync(alt, buf);
      console.log(`⚠️  ${label} locked (${e.code}) — wrote ${alt} instead. Close Word and re-run for the canonical name.`);
    } catch (e2) {
      console.log(`⚠️  ${label} could not be written (${e.code}/${e2.code}) — close Word and re-run.`);
    }
  }
}

// Repo source copy + the Downloads convenience copy.
writeResilient(path.join(ROOT, 'docs', 'AEO-Analyzers-MASTER-Announcement.docx'), 'repo copy');
writeResilient(OUT, 'Downloads copy');
