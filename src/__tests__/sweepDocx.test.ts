import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { buildSweepDocument } from '../services/sweepDocx';

/** Binary deliverables are verified by real text extraction, never by raw XML
 *  grep (Word splits strings across <w:r> runs). We unzip word/document.xml,
 *  strip tags, and read the resulting plain text. */
async function docxText(markdown: string): Promise<string> {
  const doc = await buildSweepDocument(markdown, 'example.com');
  const buf = await Packer.toBuffer(doc);
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')!.async('string');
  return xml
    .replace(/<w:p[ >]/g, '\n<w:p ')
    .replace(/<w:tc[ >]/g, ' | <w:tc ')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ');
}

const SAMPLE = [
  '# Citation Sweep — lanternpost.app',
  'Brand: Lantern Post',
  '',
  '## Scorecard',
  '| Measure | Result |',
  '| --- | --- |',
  '| Found when asked by name (retrievability) | 75% (N=8) |',
  '| Recommended to new buyers (category win) | 0% (N=26) |',
  '',
  '_Category win is measured on search-grounded answers only._',
  '',
  '**Engines are confusing you with other entities (lantern.io, lanternpost.org).**',
  '',
  '- reddit.com — 9 citations',
  '1. free alternatives to Paperless Post',
  '',
  '```json',
  '{ "@type": "Organization" }',
  '```',
  '',
  'Transcript with `inline code` and **bold** text.',
].join('\n');

describe('citation sweep .docx export', () => {
  it('carries the report text through to extractable document text', async () => {
    const text = await docxText(SAMPLE);
    expect(text).toContain('Citation Sweep — lanternpost.app');
    expect(text).toContain('Brand: Lantern Post');
    expect(text).toContain('Scorecard');
    // Table cells survive as real cells with their numbers intact.
    expect(text).toContain('Found when asked by name (retrievability)');
    expect(text).toContain('75% (N=8)');
    expect(text).toContain('0% (N=26)');
    // The markdown separator row must NOT appear as a table row.
    const cells = text.split('\n').map((s) => s.replace(/\|/g, '').trim());
    expect(cells).not.toContain('---');
    // Italic caveat line keeps its words, loses its underscores.
    expect(text).toContain('Category win is measured on search-grounded answers only.');
    expect(text).not.toContain('_Category win');
  });

  it('strips markdown syntax markers from headings, bold, code and lists', async () => {
    const text = await docxText(SAMPLE);
    expect(text).not.toContain('# Citation Sweep');
    expect(text).not.toContain('## Scorecard');
    expect(text).not.toContain('**Engines are confusing');
    expect(text).not.toContain('```');
    expect(text).toContain('Engines are confusing you with other entities');
    expect(text).toContain('reddit.com — 9 citations');
    expect(text).toContain('1. free alternatives to Paperless Post');
    expect(text).toContain('{ "@type": "Organization" }');
    expect(text).toContain('inline code');
    expect(text).not.toContain('`inline code`');
  });

  it('does not fabricate content or drop transcript lines', async () => {
    const text = await docxText(SAMPLE);
    expect(text).toContain('Transcript with');
    expect(text).toContain('bold text.');
    // Nothing invented: no number appears that is not in the source markdown.
    const nums = (text.match(/\d+(?:\.\d+)?%/g) || []).filter((n) => !SAMPLE.includes(n));
    expect(nums).toEqual([]);
  });
});
