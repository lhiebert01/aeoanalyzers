// WO-AEO-ENGINE-COUNT-CURRENCY-008 §6 — lint L-ENGINE-1, the pure half.
//
// Every sentence of published copy that states an engine count, or lists the answer engines
// without Grok, must either
//   (a) be a CURRENT statement that names its plan in the same sentence — "five" with "Pro and
//       Business", "four" with "Day Pass" — or
//   (b) appear in the reviewed allowlist (docs/engine-count-allowlist.json) as DATED, ILLUSTRATIVE,
//       GENERAL or SCORE.
// Anything else fails the build. Import-free so the build script and the tests share it.

export type EngineClass = 'CURRENT' | 'DATED' | 'ILLUSTRATIVE' | 'GENERAL' | 'SCORE';
export interface AllowEntry { file: string; text: string; class: Exclude<EngineClass, 'CURRENT'>; note?: string }
export interface LintHit { file: string; line: number; sentence: string; kind: 'count' | 'list'; ok: boolean; class: EngineClass | 'UNMARKED'; why: string }

const COUNT = /\b(?:(?:two|three|four|five|2|3|4|5)(?:\s*-\s*|\s+)(?:live\s+|major\s+|leading\s+)?(?:AI\s+)?(?:answer\s+)?(?:engines?|assistants?|engine panel)\b|all\s+(?:four|five)\b(?=[^.]{0,40}\b(?:engines?|assistants?)\b)|(?:four|five)-engine\b|every major (?:answer )?engine)/i;
const NAMES = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];

/** Split prose into sentences, keeping a line number for each. */
export function sentencesOf(text: string): { s: string; line: number }[] {
  const out: { s: string; line: number }[] = [];
  const lines = text.split('\n');
  let buf = '', start = 1;
  const flush = (ln: number) => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) out.push({ s: t, line: start }); buf = ''; start = ln; };
  lines.forEach((l, i) => {
    const parts = l.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
    parts.forEach((p, j) => { if (!buf) start = i + 1; buf += (buf ? ' ' : '') + p; if (j < parts.length - 1) flush(i + 1); });
    if (/^\s*$/.test(l) || /[.!?]["”)]?\s*$/.test(l) || l.length < 3) flush(i + 2);
  });
  flush(lines.length);
  return out;
}

export function classify(file: string, sentence: string, line: number, allow: AllowEntry[]): LintHit | null {
  const count = COUNT.test(sentence);
  const named = NAMES.filter((n) => sentence.includes(n)).length;
  const list = named >= 3 && !/\bGrok\b/.test(sentence);
  if (!count && !list) return null;
  const kind = count ? 'count' : 'list';
  const a = allow.find((e) => (e.file === file || e.file === '*') && sentence.includes(e.text));
  if (a) return { file, line, sentence, kind, ok: true, class: a.class, why: a.note || 'allowlisted' };
  const phrases = [...sentence.matchAll(new RegExp(COUNT.source, 'gi'))].map((m) => m[0].toLowerCase());
  const five = phrases.some((p) => /\b(five|5)\b/.test(p)), four = phrases.some((p) => /\b(four|4)\b/.test(p)) || (list && !count);
  const proBiz = /\b(Pro|Business)\b/.test(sentence), day = /Day Pass/.test(sentence);
  if (count && phrases.some((p) => /every major/.test(p)) && !proBiz) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: '"every major engine" is not a plan-attached count' };
  if (count && five && !proBiz) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: '"five" without "Pro and Business" in the same sentence' };
  if (count && four && !day) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: '"four" without "Day Pass" in the same sentence' };
  if (count && !five && !four && !phrases.some((p) => /every major/.test(p))) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: 'engine count that is neither the sweep panel nor allowlisted' };
  if (list && !day) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: 'engine list without Grok, and no Day Pass in the sentence' };
  const iFive = sentence.search(/\b(five|5)(?:\s*-\s*|\s+)(?:live\s+)?(?:AI\s+)?(?:answer\s+)?engine/i), iFour = sentence.search(/\b(four|4)(?:\s*-\s*|\s+)(?:live\s+)?(?:AI\s+)?(?:answer\s+)?engine/i);
  if (iFive >= 0 && iFour >= 0 && iFour < iFive) return { file, line, sentence, kind, ok: false, class: 'UNMARKED', why: 'lead with five: Pro and Business first, the Day Pass last' };
  return { file, line, sentence, kind, ok: true, class: 'CURRENT', why: 'plan named in the same sentence' };
}

/** Published text of an HTML page: visible text, meta descriptions, alt text and JSON-LD strings. */
export function htmlText(html: string): string {
  const dec = (t: string) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&#8217;|&#39;/g, '’').replace(/&ldquo;|&rdquo;|&quot;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·').replace(/&[a-z]+;/g, ' ');
  const extra: string[] = [];
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description|og:title|twitter:title|og:image:alt|twitter:image:alt)["'][^>]*>/gi)) { const c = m[0].match(/content=["']([^"']*)["']/i); if (c) extra.push(dec(c[1]) + '.'); }
  for (const m of html.matchAll(/\balt=["']([^"']+)["']/gi)) extra.push(dec(m[1]) + '.');
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const walk = (v: any) => { if (typeof v === 'string') extra.push(v.endsWith('.') ? v : v + '.'); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(JSON.parse(m[1])); } catch { /* skip */ }
  }
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|div|td|th|tr|figcaption|blockquote|title|section|article)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ');
  return dec(body) + '\n' + extra.join('\n');
}

/** Copy inside source files: string literals and JSX text, comments removed. */
export function sourceText(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
}

export function lintText(file: string, text: string, allow: AllowEntry[]): LintHit[] {
  return sentencesOf(text).map(({ s, line }) => classify(file, s, line, allow)).filter((h): h is LintHit => !!h);
}
