import { describe, it, expect, vi } from 'vitest';

/** iPhone / Google Docs QA, Sep 7 2026.
 *
 *  A docx table sized only in percentages emits `<w:tblGrid>` with a default
 *  `<w:gridCol w:w="100"/>` per column — 100 twips, about one character wide.
 *  Microsoft Word ignores that grid and auto-fits, so the file looks correct on
 *  a laptop. Google Docs, iOS Quick Look, iOS Mail preview and Pages honor the
 *  grid literally, so every column collapses and the table reads as garbled or
 *  disappears. Both report generators must therefore emit real DXA column
 *  widths and a fixed layout. */

async function documentXml(buf: ArrayBuffer | Buffer): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buf as any);
  return zip.file('word/document.xml')!.async('string');
}

const grids = (xml: string) => xml.match(/<w:tblGrid>.*?<\/w:tblGrid>/gs) || [];

describe('docx tables render outside Microsoft Word', () => {
  it('citation sweep report: every table has real column widths and a fixed layout', async () => {
    const { Packer } = await import('docx');
    const { buildSweepDocument } = await import('../services/sweepDocx');
    const md = [
      '| Measure | Result |',
      '| --- | --- |',
      '| Found when asked by name (retrievability) | 75% (N=8) |',
      '| Recommended to new buyers (category win) | 0% (N=26) |',
    ].join('\n');
    const xml = await documentXml(await Packer.toBuffer(await buildSweepDocument(md, 'lanternpost.app')));
    const g = grids(xml);
    expect(g.length).toBe(1);
    // No collapsed columns, and the widths add up to the printable width.
    expect(g[0]).not.toContain('w:w="100"/>');
    const widths = [...g[0].matchAll(/w:w="(\d+)"/g)].map((m) => Number(m[1]));
    expect(widths.length).toBe(2);
    expect(Math.min(...widths)).toBeGreaterThan(700);
    expect(widths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(9746);
    expect(xml).toContain('<w:tblLayout w:type="fixed"/>');
    expect(xml).toContain('<w:tblW w:type="dxa"');
  });

  it('AEO analysis report: every table has real column widths and a fixed layout', async () => {
    const g: any = globalThis;
    g.document = {
      createElement: () => ({ set href(_v: any) {}, download: '', click() {}, remove() {} }),
      body: { appendChild() {}, removeChild() {} },
    };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} } as any);

    const { Packer } = await import('docx');
    let captured: any = null;
    const originalToBlob = (Packer as any).toBlob;
    (Packer as any).toBlob = async (doc: any) => (captured = await (Packer as any).toBuffer(doc));
    try {
      const { generateDocxReport } = await import('../services/docxGenerator');
      await generateDocxReport(
        {
          score: 89,
          citationProbability: 88,
          summary: 's',
          criteria: [{ name: 'C', score: 8, feedback: 'f' }],
          recommendations: [],
          schemaSnippet: '',
          scoreBreakdown: { entity: 80, density: 70, clarity: 90, structure: 85 },
          contentRewrites: [{ page: 'Home', current: 'fast', proposed: 'loads in 1.2s' }],
          queryContentGap: { generatedQuestions: [{ question: 'What is it?', answerQuality: 'partial' }] },
        } as any,
        'https://lanternpost.app',
        'Lindsay Hiebert'
      );
    } finally {
      (Packer as any).toBlob = originalToBlob;
    }

    const xml = await documentXml(captured);
    const gs = grids(xml);
    // Score-rating, score-breakdown, content-rewrite and knowledge-gap tables.
    expect(gs.length).toBe(4);
    for (const grid of gs) {
      expect(grid).not.toContain('w:w="100"/>');
      const widths = [...grid.matchAll(/w:w="(\d+)"/g)].map((m) => Number(m[1]));
      expect(Math.min(...widths)).toBeGreaterThan(700);
      // A4 (11906) minus the 2×1440 default margins.
      expect(widths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(9026);
    }
    expect((xml.match(/<w:tblLayout w:type="fixed"\/>/g) || []).length).toBe(4);
  });
});

