// Citation Sweep report → .docx (iPhone QA Sep 7 2026): iOS has no built-in
// Markdown viewer, so the sweep's key asset was unreadable on mobile. The .docx
// is a faithful rendering of the SAME report text `buildReport` produces (the .md
// stays available as the diff-clean record of truth). Generic markdown → docx:
// headings, bullets, numbered lists, pipe tables, fenced code, bold / code runs,
// whole-line italics. Code-split (dynamic import of `docx`, same as the AEO report).

type Docx = typeof import('docx');

const FONT = 'Calibri';
// A4 (11906 twips) minus the 2×1080-twip margins set on the section below.
const CONTENT_W = 9740;

/** Markdown → docx `Document`. Split out from the download so it can be built
 *  and text-extracted in a test (binary deliverables are never verified by grep).
 *  Lane C: the line-by-line renderer lives in mdToDocx.ts and is shared with the
 *  Score report's cover page, so the two reports set type identically. */
export async function buildSweepDocument(markdown: string, domain: string) {
  const D: Docx = await import('docx');
  const { mdToDocxChildren } = await import('./mdToDocx');
  const children = mdToDocxChildren(D, markdown, { contentWidth: CONTENT_W });
  return new D.Document({
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
