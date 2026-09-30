// WO-AEO-REPORT-POLISH-001 Lane E — "Download PDF" for the Citation Sweep.
//
// Route chosen (documented per the order): the browser's own print-to-PDF over a print-styled
// rendering of the SAME markdown the .md and .docx come from (lib/mdToHtml.ts). No new
// serverless function (the project sits at the Hobby plan's function cap), no PDF library, no
// second template. The document <title> is the filename browsers propose —
// citation-sweep-<domain>-<date> — and on iPhone Safari the print sheet's share menu saves the
// PDF to Files. A pop-up blocker returns null from window.open; the caller reports that.
import { printDocument } from '../lib/mdToHtml';

export function openSweepPdf(markdown: string, domain: string, stamp: string): boolean {
  const stem = `citation-sweep-${domain}-${stamp}`;
  const html = printDocument(markdown, stem);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the new document one paint before the print sheet takes over.
  w.setTimeout(() => { try { w.focus(); w.print(); } catch { /* the page is still there to print manually */ } }, 250);
  return true;
}
