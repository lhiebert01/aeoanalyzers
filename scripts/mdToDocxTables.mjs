// Markdown → .docx WITH real tables, reusing src/services/sweepDocx.ts (which
// emits explicit DXA column widths + a fixed layout, so tables render correctly
// in Word, Google Docs, iOS Quick Look and Pages — not only in Word).
//   npx tsx scripts/mdToDocxTables.mjs <input.md> <output.docx> ["Title"]
import { readFileSync, writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { buildSweepDocument } from '../src/services/sweepDocx.js';

const [, , inPath, outPath, title] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: npx tsx scripts/mdToDocxTables.mjs <input.md> <output.docx> ["Title"]');
  process.exit(1);
}
const doc = await buildSweepDocument(readFileSync(inPath, 'utf8'), title || inPath);
writeFileSync(outPath, await Packer.toBuffer(doc));
console.log(`wrote ${outPath}`);
