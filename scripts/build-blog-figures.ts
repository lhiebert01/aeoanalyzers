/**
 * WO-016: explanatory figures for the November 2026 blog pages.
 *
 * Every figure is HTML + inline SVG rendered by headless Chromium and saved as WebP.
 * Every number on a data figure is RECOMPUTED here from docs/baselines/*.json with the
 * same rules as scripts/build-evidence.py, and asserted, so a changed baseline throws
 * instead of shipping a stale figure. Illustrative figures carry a visible
 * "Illustrative example" label and use no real company names.
 *
 * After rendering, every text element is checked in the page for a 7:1 contrast ratio
 * against its actual (blended) background; any failure throws.
 *
 * Run: npx tsx scripts/build-blog-figures.ts [id ...]
 * Reads only repo files, the Windows Segoe UI fonts and the chip mark in public/img/brand.
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { wilsonInterval, confidenceLabel } from '../src/lib/citationSweep';

const BASE = 'docs/baselines';
const OUT = 'public/img/blog/2026-11';
const HIW = 'public/blog/how-it-works';

// ---------------------------------------------------------------- data (asserted)
// Same pattern as NOT_FOUND in scripts/build-evidence.py.
const NOT_FOUND = new RegExp(
  "(could ?n'?t find|couldn.t find|unable to find|no (?:specific )?(?:website|information|results?)" +
    ' (?:specifically )?(?:at|about|for)|don\'?t have (?:any )?(?:specific )?information' +
    "|(?:do not|don'?t|does not|doesn'?t) (?:contain|include|mention|have) (?:any )?(?:specific )?information (?:about|on|for))",
  'i',
);
type Run = { engine: string; queryType: string; domainCited?: boolean; transcript?: string };
const load = (f: string) => JSON.parse(readFileSync(`${BASE}/${f}`, 'utf8'));
const runs = (f: string, kind: string): Run[] => load(f).runs.filter((r: Run) => r.queryType === kind);
const isFound = (r: Run) => !!r.domainCited && !NOT_FOUND.test(r.transcript || '');
function assertEq(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

const MONTHS = [
  { m: 'Aug', long: 'August', f: 'aeoanalyzers-SERIES-ANCHOR-2026-08-01.json', restated: true, want: 55 },
  { m: 'Sep', long: 'September', f: 'aeoanalyzers-2026-09-01.json', restated: false, want: 80 },
  { m: 'Oct', long: 'October', f: 'aeoanalyzers-2026-10-08.json', restated: false, want: 88 },
  { m: 'Nov', long: 'November', f: 'aeoanalyzers-2026-11-01.json', restated: false, want: 78 },
].map((x) => {
  const b = runs(x.f, 'branded');
  const c = runs(x.f, 'category');
  const pct = Math.round((100 * b.filter(isFound).length) / b.length);
  const catHits = c.filter((r) => !!r.domainCited).length;
  assertEq(`${x.m} found-by-name %`, pct, x.want);
  assertEq(`${x.m} by-name N`, b.length, 40);
  assertEq(`${x.m} recommended`, [catHits, c.length], [0, 200]);
  return { ...x, pct, n: b.length, cat: catHits, catN: c.length };
});

const NOV = 'aeoanalyzers-2026-11-01.json';
const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', perplexity: 'Perplexity', gemini: 'Gemini', openai: 'ChatGPT' };
const PER_ENGINE = ['claude', 'perplexity', 'gemini', 'openai'].map((e) => {
  const rs = runs(NOV, 'branded').filter((r) => r.engine === e);
  return { key: e, name: ENGINE_LABEL[e], found: rs.filter(isFound).length, n: rs.length };
});
assertEq('Nov per-engine found', PER_ENGINE.map((p) => [p.name, p.found, p.n]), [
  ['Claude', 10, 10], ['Perplexity', 10, 10], ['Gemini', 10, 10], ['ChatGPT', 1, 10],
]);

const SC = load(NOV).sourceCoverage;
const scRows = SC.rows as { verdict: string }[];
const scYes = scRows.filter((r) => r.verdict === 'yes').length;
const scUnread = scRows.filter((r) => r.verdict === 'unreadable').length;
assertEq('Nov source coverage', [scRows.length, scYes, scUnread, SC.named, SC.recurringPages, SC.couldNotRead], [40, 0, 4, 0, 40, 4]);

// said-vs-site: the phrase Claude used for us in its by-name answers, and our registry short text.
const QUOTE = 'AI simulation engine';
const claudeBy = runs(NOV, 'branded').filter((r) => r.engine === 'claude');
const quoteHits = claudeBy.filter((r) => (r.transcript || '').toLowerCase().includes(QUOTE.toLowerCase())).length;
assertEq('Claude "AI simulation engine" by-name answers', [quoteHits, claudeBy.length], [10, 10]);
const REGISTRY = readFileSync('docs/identity/ENTITY-REGISTRY.md', 'utf8');
const SHORT = 'Measures what AI answer engines say when buyers ask for a recommendation.';
if (!REGISTRY.includes(`Short: ${SHORT}`)) throw new Error('registry short text changed: docs/identity/ENTITY-REGISTRY.md');

// Engine panels, from the single source.
const ENGINES = JSON.parse(readFileSync('src/data/engines.json', 'utf8'));
const V11: string[] = ENGINES.panels['v1.1'].engines;
const V12: string[] = ENGINES.panels['v1.2'].engines;
assertEq('panel v1.2 = v1.1 + extra', V12.slice(0, V11.length), V11);
const EXTRA = V12.slice(V11.length); // Grok
assertEq('plans', [ENGINES.plans['Day Pass'], ENGINES.plans.Pro, ENGINES.plans.Business], ['v1.1', 'v1.2', 'v1.2']);

// ---------------------------------------------------------------- style
const fontR = readFileSync('/mnt/c/Windows/Fonts/segoeui.ttf').toString('base64');
const fontB = readFileSync('/mnt/c/Windows/Fonts/segoeuib.ttf').toString('base64');
const MARK = readFileSync('public/img/brand/aeo-analyzers-chip-mark.svg', 'utf8');
const mark = (px: number) => MARK.replace('<svg ', `<svg width="${px}" height="${px}" aria-hidden="true" `);

const C = {
  bg: '#0A0F1C', panel: '#131C30', panel2: '#18233A', line: '#2A3856', teal: '#2FD39A', tealDeep: '#0F2A26',
  purple: '#8B7CF6', lav: '#B4A9FF', grey: '#C9D1DC', muted: '#AEB7C4', white: '#FFFFFF', cyan: '#4FD1E8',
};

const CSS = `
@font-face{font-family:Seg;font-weight:400;src:url(data:font/ttf;base64,${fontR})}
@font-face{font-family:Seg;font-weight:700;src:url(data:font/ttf;base64,${fontB})}
*{box-sizing:border-box}
html,body{margin:0;background:${C.bg}}
body{font-family:Seg,sans-serif;color:${C.grey};width:1600px}
.fig{width:1600px;padding:56px 64px 44px;background:${C.bg}}
.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:40px}
.t{font-weight:700;font-size:46px;line-height:1.1;color:${C.white};letter-spacing:-.01em;margin:0}
.s{font-size:24px;line-height:1.4;color:${C.grey};margin:12px 0 0;max-width:1150px}
.pill{display:inline-block;white-space:nowrap;font-weight:700;font-size:18px;letter-spacing:.06em;text-transform:uppercase;
  color:${C.lav};background:${C.bg};border:2px solid ${C.purple};border-radius:999px;padding:8px 18px}
.pill.teal{color:${C.teal};border-color:${C.teal}}
.panel{background:${C.panel};border:2px solid ${C.line};border-radius:22px}
.ft{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:36px;padding-top:22px;border-top:1px solid ${C.line}}
.src{font-size:19px;line-height:1.4;color:${C.muted};background:${C.bg}}
.brand{display:flex;align-items:center;gap:12px;font-weight:700;font-size:18px;letter-spacing:.08em;color:${C.white};white-space:nowrap}
.k{color:${C.teal}} .l{color:${C.lav}}
.row{display:flex;gap:28px}
.arrow{flex:none;align-self:center;color:${C.teal}}
.num{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;
  background:${C.teal};color:${C.bg};font-weight:700;font-size:26px;flex:none}
h3{margin:0;font-weight:700;color:${C.white}}
p{margin:0}
`;

const ARROW = (w = 56, color = C.teal) =>
  `<svg class="arrow" width="${w}" height="32" viewBox="0 0 ${w} 32" aria-hidden="true"><path d="M2 16H${w - 6}M${w - 18} 5l12 11-12 11" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON = (d: string, color = C.teal, s = 44) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex:none" aria-hidden="true">${d}</svg>`;
const I = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  scale: '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  quote: '<path d="M4 6h16v10H9l-5 4z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  ruler: '<path d="M3 17l14-14 4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.4 0 4 1.3 4.6 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9.5 18h5"/>',
  repeat: '<path d="M4 11a8 8 0 0 1 14-4.5L20 8M20 4v4h-4"/><path d="M20 13a8 8 0 0 1-14 4.5L4 16M4 20v-4h4"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  net: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6.8l3.3 3.9M7 17.2l3.3-3.9M14 11l3.3-3.9M14 13l3.3 3.9M7 6h10M7 18h10"/>',
  dots: '<circle cx="5" cy="6" r="1"/><circle cx="11" cy="4" r="1"/><circle cx="17" cy="7" r="1"/><circle cx="8" cy="11" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="20" cy="14" r="1"/><circle cx="5" cy="16" r="1"/><circle cx="11" cy="18" r="1"/><circle cx="17" cy="19" r="1"/>',
  help: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9.8 8.6a2.3 2.3 0 1 1 3.1 2.1c-.6.3-.9.7-.9 1.3v.4"/><path d="M12 14.6h.01"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/><circle cx="16" cy="15" r=".8"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  mountain: '<path d="M2 20l7-11 4 6 2-3 7 8z"/><path d="M9 9V3l4 1.5L9 6"/>',
  handshake: '<path d="M2 11l4-4 4 2 3-2 3 1 6 4"/><path d="M6 13l4 4c.8.8 2 .8 2.8 0M9 12l4 4c.8.8 2 .8 2.8 0M12 11l3.5 3.5c.8.8 2 .8 2.8 0L22 11"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  chart: '<path d="M4 20V14M10 20V9M16 20V4M2 20h20"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="7"/>',
  toolbox: '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M9 8V5h6v3M3 13h18M11 12h2v3h-2z"/>',
  hammer: '<path d="M4 7l4-4 3 1 2 2-1 1 1 1-3 3-1-1-1 1-2-2z"/><path d="M11 11l9 9-2 2-9-9"/>',
  screwdriver: '<path d="M14 3l7 7-3 3-7-7z"/><path d="M12 9l-8 8 3 3 8-8M4 17l-1 4 4-1"/>',
};

const header = (title: string, sub?: string, pill?: string) => `
<div class="hd"><div><h1 class="t">${title}</h1>${sub ? `<p class="s">${sub}</p>` : ''}</div>${pill ? `<span class="pill">${pill}</span>` : ''}</div>`;
const footer = (src: string) => `
<div class="ft"><p class="src">${src}</p><div class="brand">${mark(34)}<span>AEO ANALYZERS</span></div></div>`;
const ILL = 'Illustrative example';

// ---------------------------------------------------------------- figures
type Fig = { id: string; html: string; alt: string; caption: string; also?: string };
const figs: Fig[] = [];

// 1. seven-requirements
{
  const reqs: [string, string, string][] = [
    ['Observe', 'Can it measure the outcome you actually care about?', I.eye],
    ['Diagnose', 'Can it tell you why the result happened?', I.search],
    ['Remediate', 'Does it tell you what to change?', I.wrench],
    ['Verify', 'Can it prove the fix worked?', I.check],
    ['Receipts', 'Can you inspect the evidence?', I.doc],
    ['Scale', 'Does it fit the operating problem you actually have?', I.layers],
    ['Economics', 'What are you actually paying for?', I.scale],
  ];
  const card = ([t, q, ic]: [string, string, string], i: number) => `
  <div class="panel" style="flex:1;padding:30px 30px 34px;${i === 0 ? `border-color:${C.teal}` : ''}">
    ${ICON(ic, i === 0 ? C.teal : C.lav, 46)}
    <h3 style="font-size:32px;margin:18px 0 10px">${t}</h3>
    <p style="font-size:22px;line-height:1.4;color:${C.grey}">${q}</p>
  </div>`;
  figs.push({
    id: 'seven-requirements',
    html: `${header('Seven requirements for an AEO tool', 'Purchasing requirements to put to any vendor, ours included.')}
    <div class="row" style="margin-bottom:28px">${reqs.slice(0, 4).map(card).join('')}</div>
    <div class="row" style="padding:0 calc((100% - 28px*3)/8 + 14px)">${reqs.slice(4).map((r, i) => card(r, i + 4)).join('')}</div>
    ${footer('From the AEO Buyer’s Standard.')}`,
    alt: 'Seven rounded panels, one per purchasing requirement for an AEO tool: Observe (can it measure the outcome you actually care about?), Diagnose (can it tell you why the result happened?), Remediate (does it tell you what to change?), Verify (can it prove the fix worked?), Receipts (can you inspect the evidence?), Scale (does it fit the operating problem you actually have?) and Economics (what are you actually paying for?).',
    caption: 'The seven purchasing requirements from the AEO Buyer’s Standard: Observe, Diagnose, Remediate, Verify, Receipts, Scale and Economics.',
  });
}

// 2. three-layers (rebuild of how-it-works visual-2, neutral placeholders)
{
  const okC = (c: string, glyph: 'check' | 'q' | 'x') => {
    const g = glyph === 'check' ? '<path d="M15 25l7 7 13-14"/>' : glyph === 'x' ? '<path d="M17 17l16 16M33 17L17 33"/>'
      : '<path d="M19.5 19.5a5.5 5.5 0 1 1 7.5 5.2c-1.3.6-2 1.6-2 3V30"/><circle cx="25" cy="36" r="0.8" fill="currentColor"/>';
    return `<svg width="64" height="64" viewBox="0 0 50 50" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:${c};flex:none" aria-hidden="true"><circle cx="25" cy="25" r="22"/>${g}</svg>`;
  };
  const panel = (n: number, col: string, txt: string, title: string, sub: string, body: string, q: string, ans: string, scoreIcon: string, score: string) => `
  <div class="panel" style="flex:1;padding:34px 32px 30px;border-color:${col}55;display:flex;flex-direction:column">
    <div style="display:flex;gap:20px;align-items:center">
      <span class="num" style="background:${col === C.purple ? C.lav : col};width:60px;height:60px;font-size:30px">${n}</span>
      <div><h3 style="font-size:27px;letter-spacing:.03em;white-space:nowrap">${title}</h3><p style="font-size:21px;font-style:italic;color:${txt};margin-top:4px">${sub}</p></div>
    </div>
    <p style="font-size:21px;line-height:1.45;margin:22px 0 24px;min-height:122px">${body}</p>
    <div style="background:${C.panel2};border:1.5px solid ${C.line};border-radius:16px;padding:16px 20px;display:flex;gap:14px;align-items:center;font-size:21px;color:${C.white}">
      ${ICON(I.person, col, 30)}<span>${q}</span></div>
    <div style="background:${C.panel2};border:1.5px solid ${C.line};border-radius:16px;padding:20px;margin-top:14px;display:flex;gap:14px;flex:1;min-height:236px">
      ${ICON(I.sparkle, col, 30)}<div style="flex:1;font-size:21px;line-height:1.55;color:${C.white}">${ans}</div></div>
    <div style="display:flex;gap:18px;align-items:center;margin-top:24px;padding-top:22px;border-top:1px solid ${C.line}">
      ${ICON(scoreIcon, col, 44)}<div><p style="font-weight:700;color:${C.white};font-size:21px">We score:</p><p style="font-size:21px;color:${txt}">${score}</p></div></div>
  </div>`;
  const list = (items: string[]) => `<ol style="margin:10px 0 0;padding-left:26px">${items.map((x) => `<li>${x}</li>`).join('')}</ol><p>…</p>`;
  const html = `${header('The three layers we measure', 'Three questions. Three measurements. One complete picture of your AI visibility.', ILL)}
  <div class="row" style="gap:26px">
    ${panel(1, C.teal, C.teal, 'FOUND BY NAME?', '(when buyers ask about you)',
      'When someone asks AI about your brand by name, does it return the right information — and cite your site?',
      'What is Your brand?',
      `<div style="display:flex;gap:12px;align-items:flex-end"><div style="flex:1"><p>Your brand is … (the answer describes what you do, correctly)</p>
       <p style="margin-top:14px"><span style="display:inline-flex;gap:8px;align-items:center;color:${C.teal};border:1.5px solid ${C.line};border-radius:10px;padding:6px 12px;background:${C.panel}">${ICON(I.link, C.teal, 20)}your site</span></p></div>${okC(C.teal, 'check')}</div>`,
      I.target, 'Did it find you by name and cite you?')}
    ${panel(2, C.cyan, C.cyan, 'RECOMMENDED?', '(when buyers ask the category)',
      'When someone asks AI for recommendations in your category, are you among the answers it suggests?',
      'What are the best tools in your category?',
      `<div style="display:flex;gap:12px;align-items:flex-end"><div style="flex:1"><p>Here are the best options:</p>${list(['Another company', 'Another company', `<span style="color:${C.cyan};font-weight:700;border-bottom:2px dashed ${C.cyan}">Your brand?</span>`])}</div>${okC(C.cyan, 'q')}</div>`,
      I.trophy, 'Did it recommend you for the category?')}
    ${panel(3, C.purple, C.lav, 'WHO’S CITED INSTEAD?', '(the names taking your spot)',
      'When you’re not recommended, which brands are AI answer engines choosing — and citing — instead of you?',
      'What are the best tools in your category?',
      `<div style="display:flex;gap:12px;align-items:flex-end"><div style="flex:1"><p>Here are the best options:</p>${list(['Another company', 'Another company', 'Another company'])}</div>${okC(C.purple, 'x')}</div>`,
      I.users, 'Who is cited instead of you — and how often?')}
  </div>
  ${footer('Illustrative example: placeholder names, not a real answer.')}`;
  figs.push({
    id: 'three-layers', also: `${HIW}/visual-2-three-layers-v2.webp`, html,
    alt: 'Illustrative example of the three layers AEO Analyzers measures, in three panels. 1, Found by name? When someone asks AI about your brand by name, does it return the right information and cite your site? The example answer to "What is Your brand?" describes the brand and links your site, with a check mark. We score: did it find you by name and cite you? 2, Recommended? When someone asks for recommendations in your category, are you among the answers? The example list reads Another company, Another company, then "Your brand?" with a question mark. We score: did it recommend you for the category? 3, Who\'s cited instead? The example list reads Another company three times, with a cross. We score: who is cited instead of you, and how often? Placeholder names, not a real answer.',
    caption: 'Illustrative example. The three layers a sweep reports separately: found by name, recommended for the category, and who is cited instead. Placeholder names, not a real answer.',
  });
}

// 3. what-the-engine-reads
{
  const cardW = 96, gap = 14, x0 = 0;
  const lit = Array.from({ length: 10 }, (_, i) => `
    <div style="position:absolute;left:${x0 + i * (cardW + gap)}px;top:300px;width:${cardW}px;height:150px;border-radius:16px;background:${C.tealDeep};border:2px solid ${C.teal};padding:14px 12px">
      <p style="font-weight:700;font-size:34px;color:${C.white};line-height:1">${i + 1}</p>
      <div style="margin-top:18px;height:6px;border-radius:3px;background:${C.teal};width:80%"></div>
      <div style="margin-top:10px;height:6px;border-radius:3px;background:${C.teal};width:60%;opacity:.7"></div>
      <div style="margin-top:10px;height:6px;border-radius:3px;background:${C.teal};width:70%;opacity:.5"></div>
    </div>`).join('');
  const litEnd = x0 + 10 * (cardW + gap) - gap; // 1086
  const html = `${header('What the engine reads', 'The answer engine runs a search and reads the top results. A page far down the list is never reached.')}
  <div style="position:relative;height:600px">
    <div style="position:absolute;left:${litEnd / 2 - 210}px;top:0;width:420px;height:96px;border-radius:20px;background:${C.panel};border:2px solid ${C.teal};display:flex;align-items:center;justify-content:center;gap:16px">
      ${ICON(I.bot, C.teal, 44)}<span style="font-weight:700;font-size:28px;color:${C.white}">The answer engine</span></div>
    <svg width="${litEnd}" height="210" style="position:absolute;left:0;top:94px" aria-hidden="true">
      <defs><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.teal}" stop-opacity=".38"/><stop offset="1" stop-color="${C.teal}" stop-opacity=".08"/></linearGradient></defs>
      <polygon points="${litEnd / 2 - 150},0 ${litEnd / 2 + 150},0 ${litEnd},206 0,206" fill="url(#bm)"/></svg>
    <p style="position:absolute;left:0;width:${litEnd}px;top:180px;text-align:center;font-weight:700;font-size:26px;color:${C.white}">Reads positions 1 to 10</p>
    ${lit}
    <div style="position:absolute;left:${litEnd + 30}px;width:${1472 - litEnd - 30 - 200}px;top:360px;border-top:3px dashed ${C.line}"></div>
    <p style="position:absolute;left:${litEnd + 30}px;width:${1472 - litEnd - 30 - 200}px;top:384px;text-align:center;font-size:20px;color:${C.muted}">11 to 67</p>
    <div style="position:absolute;right:0;top:300px;width:170px;height:150px;border-radius:16px;background:${C.panel};border:2px dashed #46567A;padding:14px 16px">
      <p style="font-weight:700;font-size:40px;color:${C.muted};line-height:1">68</p>
      <div style="margin-top:18px;height:6px;border-radius:3px;background:#2E3B58;width:80%"></div>
      <div style="margin-top:10px;height:6px;border-radius:3px;background:#2E3B58;width:60%"></div>
      <div style="margin-top:10px;height:6px;border-radius:3px;background:#2E3B58;width:70%"></div>
    </div>
    <p style="position:absolute;right:0;width:330px;top:470px;text-align:right;font-size:21px;line-height:1.4;color:${C.grey}"><b style="color:${C.white}">Our /best-aeo-tools page</b><br>average position 68<br>Never reached</p>
    <p style="position:absolute;left:0;top:470px;width:${litEnd}px;text-align:center;font-size:21px;color:${C.grey}">Search results the engine reads before it answers</p>
  </div>
  ${footer('Position 68: our own Search Console average for /best-aeo-tools, three months to November 1st, 2026.')}`;
  figs.push({
    id: 'what-the-engine-reads', html,
    alt: 'Diagram titled "What the engine reads". An answer engine at the top shines a beam down onto ten lit search-result cards numbered 1 to 10, labeled "Reads positions 1 to 10". A dashed gap marked "11 to 67" leads to a dim card far to the right numbered 68, labeled "Our /best-aeo-tools page, average position 68, never reached". Position 68 is our own Search Console average for /best-aeo-tools over the three months to November 1st, 2026.',
    caption: 'The engine reads the top of the results. Position 68 is our own Search Console average for /best-aeo-tools over the three months to November 1st, 2026.',
  });
}

// 4. six-steps
{
  const steps = [
    'Write two kinds of questions',
    'Ask with web search on, five times each',
    'Keep every answer and its sources',
    'Score found, accurate, recommended separately',
    'Read the sources behind category answers',
    'Repeat monthly, same questions, same engines',
  ];
  const card = (t: string, i: number) => `<div class="panel" style="flex:1;padding:32px 32px 36px;display:flex;flex-direction:column;gap:22px">
    <span class="num" style="width:60px;height:60px;font-size:30px">${i + 1}</span><h3 style="font-size:30px;line-height:1.3">${t}</h3></div>`;
  figs.push({
    id: 'six-steps',
    html: `${header('Six steps to monitor your brand in AI answers', 'The same procedure every month, so the numbers can be compared.')}
    <div class="row" style="margin-bottom:28px">${steps.slice(0, 3).map(card).join('')}</div>
    <div class="row">${steps.slice(3).map((s, i) => card(s, i + 3)).join('')}</div>
    ${footer('AEO Analyzers: how to monitor a brand in AI answer engines.')}`,
    alt: 'Six numbered step cards: 1 Write two kinds of questions; 2 Ask with web search on, five times each; 3 Keep every answer and its sources; 4 Score found, accurate, recommended separately; 5 Read the sources behind category answers; 6 Repeat monthly, same questions, same engines.',
    caption: 'Six steps for monitoring a brand in AI answers: two kinds of questions, web search on, five runs each, every answer stored, three separate scores, and the same panel every month.',
  });
}

// 5. per-engine-nov
{
  const dots = (k: number, n: number) => Array.from({ length: n }, (_, i) => i < k
    ? `<span style="width:34px;height:34px;border-radius:50%;background:${C.teal};display:inline-block"></span>`
    : `<span style="width:34px;height:34px;border-radius:50%;border:3px solid #5A6A8C;display:inline-block"></span>`).join('');
  const rows = PER_ENGINE.map((p) => `<div style="display:flex;align-items:center;gap:40px;padding:26px 36px;border-top:1px solid ${C.line}">
    <span style="width:220px;font-weight:700;font-size:32px;color:${C.white}">${p.name}</span>
    <span style="display:flex;gap:14px;flex:1">${dots(p.found, p.n)}</span>
    <span style="width:200px;text-align:right;font-weight:700;font-size:32px;color:${C.white}">${p.found} <span style="font-weight:400;color:${C.grey}">of ${p.n}</span></span></div>`).join('');
  figs.push({
    id: 'per-engine-nov',
    html: `${header('Found by name, November 1st, 2026', 'Our own measurement: questions about AEO Analyzers by name, web search on, 10 answers per engine.')}
    <div class="panel" style="overflow:hidden">${rows.replace('border-top:1px', 'border-top:0px')}</div>
    <div style="display:flex;gap:40px;margin-top:22px;font-size:20px;color:${C.grey}">
      <span style="display:flex;gap:10px;align-items:center"><span style="width:22px;height:22px;border-radius:50%;background:${C.teal};display:inline-block"></span>Found: our site among the answer’s sources</span>
      <span style="display:flex;gap:10px;align-items:center"><span style="width:22px;height:22px;border-radius:50%;border:3px solid #5A6A8C;display:inline-block"></span>Not found</span></div>
    ${footer('Source: docs/baselines/aeoanalyzers-2026-11-01.json, stored answers (panel v1.1).')}`,
    alt: `Table titled "Found by name, November 1st, 2026", our own measurement, ten answers per engine shown as dots. ${PER_ENGINE.map((p) => `${p.name}: ${p.found} of ${p.n}`).join('; ')}.`,
    caption: 'Found by name per engine on November 1st, 2026, our own measurement: one engine found us once in ten tries while the other three found us every time. Source: docs/baselines/aeoanalyzers-2026-11-01.json.',
  });
}

// 6. mention-citation-recommendation
{
  const box = (ic: string, t: string, d: string, ex: string) => `<div class="panel" style="flex:1;padding:34px 32px;display:flex;flex-direction:column;gap:18px">
    ${ICON(ic, C.teal, 48)}<h3 style="font-size:36px">${t}</h3><p style="font-size:23px;line-height:1.45">${d}</p>
    <div style="margin-top:auto;background:${C.panel2};border:1.5px solid ${C.line};border-radius:14px;padding:18px 20px;font-size:20px;line-height:1.5;color:${C.white}">${ex}</div></div>`;
  const hl = (s: string) => `<span style="color:${C.teal};font-weight:700">${s}</span>`;
  figs.push({
    id: 'mention-citation-recommendation',
    html: `${header('Mention, citation, recommendation', 'Three different things. Count them separately.', ILL)}
    <div class="row">
      ${box(I.quote, 'Mention', 'Your name is in the answer text.', `“… tools such as ${hl('Your brand')} track this …”`)}
      ${ARROW()}
      ${box(I.link, 'Citation', 'Your domain is among the sources.', `Sources:<br>1. another-site<br>2. ${hl('your site')}<br>3. another-site`)}
      ${ARROW()}
      ${box(I.trophy, 'Recommendation', 'Named as an option for a buyer’s category question.', `“Best options for your category?”<br>1. ${hl('Your brand')}<br>2. Another company`)}
    </div>
    ${footer('Illustrative example: placeholder names, not a real answer.')}`,
    alt: 'Three boxes. Mention: your name is in the answer text (example: "tools such as Your brand track this"). Citation: your domain is among the sources (example source list with your site second). Recommendation: named as an option for a buyer\'s category question (example list with Your brand first). Illustrative example with placeholder names.',
    caption: 'Illustrative example. A mention, a citation and a recommendation are three different outcomes; a tool should count each one separately.',
  });
}

// 7. reach-read-attribute
{
  const p = (ic: string, t: string, q: string, items: string[]) => `<div class="panel" style="flex:1;padding:34px 34px 38px">
    <div style="display:flex;gap:16px;align-items:center">${ICON(ic, C.teal, 48)}<h3 style="font-size:38px">${t}</h3></div>
    <p style="font-size:22px;color:${C.grey};margin:14px 0 22px">${q}</p>
    ${items.map((x) => `<div style="display:flex;gap:14px;align-items:center;font-size:24px;color:${C.white};padding:12px 0;border-top:1px solid ${C.line}">${ICON(I.check, C.teal, 30)}${x}</div>`).join('')}</div>`;
  figs.push({
    id: 'reach-read-attribute',
    html: `${header('What answer engine readiness means', 'Three things a page has to get right, in order.')}
    <div class="row">
      ${p(I.globe, 'Reach', 'Can the engine get to the page?', ['Crawler allowed', 'Page indexable'])}${ARROW()}
      ${p(I.book, 'Read', 'Can it understand and quote it?', ['Content in the HTML', 'Clear headings', 'Quotable passages'])}${ARROW()}
      ${p(I.tag, 'Attribute', 'Can it tell whose page it is?', ['Structured data', 'Stable @id', 'Linked profiles'])}
    </div>
    ${footer('AEO Analyzers: scoring pages for answer engine readiness.')}`,
    alt: 'Three panels in order. Reach (can the engine get to the page?): crawler allowed, page indexable. Read (can it understand and quote it?): content in the HTML, clear headings, quotable passages. Attribute (can it tell whose page it is?): structured data, stable @id, linked profiles.',
    caption: 'Answer engine readiness in three parts: Reach, Read and Attribute.',
  });
}

// 8. answers-sources-naming
{
  const bars = [100, 82, 66, 52, 40];
  const names = [false, false, true, false, false];
  const stage = (t: string, d: string, body: string) => `<div class="panel" style="flex:1;padding:30px 30px 34px;display:flex;flex-direction:column">
    <h3 style="font-size:27px;white-space:nowrap">${t}</h3><p style="font-size:21px;margin:8px 0 22px;min-height:58px">${d}</p>${body}</div>`;
  const answers = `<div style="position:relative;height:250px">${[0, 1, 2].map((i) => `<div style="position:absolute;left:${i * 18}px;top:${i * 18}px;right:${(2 - i) * 18}px;height:200px;border-radius:14px;background:${C.panel2};border:1.5px solid ${i === 2 ? C.teal : C.line};padding:18px">
      ${i === 2 ? `<div style="display:flex;gap:10px;align-items:center;font-size:20px;color:${C.white}">${ICON(I.chat, C.teal, 26)}Answer + its sources</div>
      <div style="margin-top:16px;height:6px;width:85%;border-radius:3px;background:#3A4868"></div><div style="margin-top:10px;height:6px;width:70%;border-radius:3px;background:#3A4868"></div>
      <div style="margin-top:20px;display:flex;gap:8px">${[1, 2, 3].map(() => `<span style="width:56px;height:22px;border-radius:6px;border:1.5px solid ${C.teal}"></span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
  const ranked = bars.map((w) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">${ICON(I.doc, C.grey, 26)}<span style="font-size:20px;color:${C.white};width:110px">Cited page</span>
    <span style="flex:1"><span style="display:block;height:16px;border-radius:0 4px 4px 0;background:${C.purple};width:${w}%"></span></span></div>`).join('');
  const naming = bars.map((_, i) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">${ICON(I.doc, C.grey, 26)}<span style="font-size:20px;color:${C.white};flex:1">Cited page</span>
    ${names[i] ? `<span style="font-weight:700;font-size:18px;color:${C.bg};background:${C.teal};border-radius:999px;padding:3px 14px">Names you</span>`
      : `<span style="font-size:18px;color:${C.grey};border:1.5px solid #5A6A8C;border-radius:999px;padding:2px 14px;background:${C.panel}">Does not</span>`}</div>`).join('');
  figs.push({
    id: 'answers-sources-naming',
    html: `${header('From stored answers to the pages that decide them', 'Rank what the engine cites instead, then check which of those pages name you.', ILL)}
    <div class="row">
      ${stage('Stored answers', 'Every answer kept with its sources.', answers)}${ARROW()}
      ${stage('Cited pages', 'Ranked by how often the engine cites them.', ranked)}${ARROW()}
      ${stage('Which of them name you', 'Read each page: are you on it?', naming)}
    </div>
    ${footer('Illustrative example: no real counts or pages shown.')}`,
    alt: 'Illustrative flow in three steps: stored answers, each kept with its sources; the cited pages ranked by how often the engine cites them (bars of decreasing length, no counts); and which of those pages name you (one page marked "Names you", the others "Does not"). No real counts or pages shown.',
    caption: 'Illustrative example. Start from the stored answers, rank the pages the engine cites, then read which of those pages name you.',
  });
}

// 9. said-vs-site
{
  const col = (lbl: string, accent: string, txt: string, ic: string, quote: string, who: string) => `<div class="panel" style="flex:1;padding:40px 40px 44px;border-color:${accent}">
    <div style="display:flex;gap:14px;align-items:center">${ICON(ic, accent, 40)}<p style="font-weight:700;font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:${txt}">${lbl}</p></div>
    <p style="font-weight:700;font-size:44px;line-height:1.25;color:${C.white};margin:30px 0 26px">${quote}</p>
    <p style="font-size:22px;line-height:1.45;color:${C.grey}">${who}</p></div>`;
  figs.push({
    id: 'said-vs-site',
    html: `${header('What the engine said vs what our site says', 'The same company, described two different ways.', 'Our own data, November 1st, 2026')}
    <div class="row" style="align-items:stretch">
      ${col('What the engine said', C.purple, C.lav, I.chat, `“${QUOTE}”`, `Claude, in ${quoteHits} of ${claudeBy.length} by-name answers about AEO Analyzers, November 1st, 2026.`)}
      <div style="align-self:center;font-weight:700;font-size:64px;color:${C.white}">≠</div>
      ${col('What our site says', C.teal, C.teal, I.globe, `“${SHORT}”`, 'AEO Analyzers’ own short description, the same text on our site and our listings.')}
    </div>
    ${footer('Source: docs/baselines/aeoanalyzers-2026-11-01.json (stored answers) and docs/identity/ENTITY-REGISTRY.md.')}`,
    alt: `Two columns labeled "Our own data, November 1st, 2026". Left, what the engine said: "${QUOTE}" — Claude, in ${quoteHits} of ${claudeBy.length} by-name answers about AEO Analyzers. Right, what our site says: "${SHORT}" A not-equal sign between them.`,
    caption: `Our own data, November 1st, 2026: Claude called AEO Analyzers an "${QUOTE}" in ${quoteHits} of ${claudeBy.length} by-name answers; our own description says something else. Source: stored answers in docs/baselines/aeoanalyzers-2026-11-01.json.`,
  });
}

// 10. prompt-engine-run-grid (illustrative; the tally is computed from the grid drawn)
{
  const prompts = ['Best tool for your category?', 'Top options for a small team?', 'Alternatives to Company A?', 'Which tool is easiest to set up?'];
  const engines = ['Engine 1', 'Engine 2', 'Engine 3', 'Engine 4'];
  // Y = Your brand, A = Company A, B = Company B, - = nobody named
  const G = [
    ['AAYA-', 'AABAA', 'AYAAB', 'A-AAA'],
    ['YAYB-', 'BBAYB', 'AAY-A', 'BAABA'],
    ['BBYB-', 'BYBBB', '-BBYB', 'BBB-B'],
    ['AYAA-', 'AAAAB', 'YAAYA', 'AA-AA'],
  ];
  const col: Record<string, string> = { Y: C.teal, A: C.purple, B: C.grey };
  const dot = (c: string) => c === '-' ? `<span style="width:24px;height:24px;border-radius:50%;border:3px solid #5A6A8C;display:inline-block"></span>`
    : `<span style="width:24px;height:24px;border-radius:50%;background:${col[c]};display:inline-block"></span>`;
  const tally: Record<string, number> = { A: 0, B: 0, Y: 0, '-': 0 };
  G.flat().join('').split('').forEach((c) => tally[c]++);
  const total = G.flat().join('').length;
  assertEq('grid runs', total, prompts.length * engines.length * 5);
  const head = `<div style="display:grid;grid-template-columns:330px repeat(4,1fr);gap:0;align-items:center">
    <span></span>${engines.map((e) => `<span style="text-align:center;font-weight:700;font-size:22px;color:${C.white};padding-bottom:14px">${e}</span>`).join('')}
    ${prompts.map((p, r) => `<span style="font-size:21px;color:${C.white};padding:18px 16px 18px 0;border-top:1px solid ${C.line}">${p}</span>${G[r].map((cell) => `<span style="display:flex;gap:7px;justify-content:center;padding:18px 0;border-top:1px solid ${C.line}">${cell.split('').map(dot).join('')}</span>`).join('')}`).join('')}</div>`;
  const tl = (k: string, name: string) => `<div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid ${C.line}">${dot(k)}<span style="flex:1;font-size:22px;color:${C.white}">${name}</span><span style="font-weight:700;font-size:24px;color:${C.white}">${tally[k]}</span></div>`;
  figs.push({
    id: 'prompt-engine-run-grid',
    html: `${header('Every prompt, every engine, five runs', 'Each dot is one run, colored by the company the answer named first.', ILL)}
    <div class="row" style="gap:32px;align-items:flex-start">
      <div class="panel" style="flex:1;padding:28px 30px">${head}</div>
      <div class="panel" style="width:340px;padding:28px 28px 20px"><h3 style="font-size:26px">Who got named</h3><p style="font-size:19px;margin:6px 0 12px">out of ${total} runs</p>
        ${tl('A', 'Company A')}${tl('B', 'Company B')}${tl('Y', 'Your brand')}${tl('-', 'Nobody named')}</div>
    </div>
    ${footer('Illustrative example: placeholder questions, engines and companies; not real results.')}`,
    alt: `Illustrative grid of example questions (rows) by engines (columns), each cell holding five dots for five runs, colored by the company named first. Side tally "Who got named" out of ${total} runs: Company A ${tally.A}, Company B ${tally.B}, Your brand ${tally.Y}, nobody named ${tally['-']}. Placeholder questions, engines and companies; not real results.`,
    caption: 'Illustrative example. Benchmarking means every prompt on every engine, several runs each, tallied by who got named. Placeholder names, not real results.',
  });
}

// 11. listing-loop
{
  const st = (n: number, ic: string, t: string) => `<div class="panel" style="flex:1;padding:34px 32px 38px;display:flex;flex-direction:column;gap:20px">
    <div style="display:flex;gap:16px;align-items:center"><span class="num">${n}</span>${ICON(ic, C.teal, 44)}</div><h3 style="font-size:30px;line-height:1.3">${t}</h3></div>`;
  figs.push({
    id: 'listing-loop',
    html: `${header('Directory listings, one loop', 'Start from what the engines already cite, then check whether it changed anything.')}
    <div class="row">${st(1, I.search, 'Find the directories engines cite in your answers')}${ARROW()}${st(2, I.list, 'List with the same name, description and link everywhere')}${ARROW()}${st(3, I.repeat, 'Check the next sweep')}</div>
    <div style="margin:0 120px 66px;height:70px;border:3px solid ${C.teal};border-top:0;border-radius:0 0 28px 28px;position:relative">
      <span style="position:absolute;left:50%;bottom:-20px;transform:translateX(-50%);background:${C.bg};padding:0 20px;font-size:21px;color:${C.grey}">then start again from step 1</span>
      <svg width="28" height="24" viewBox="0 0 28 24" style="position:absolute;left:-15.5px;top:-12px" aria-hidden="true"><path d="M2 20L14 4l12 16" fill="none" stroke="${C.teal}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    ${footer('AEO Analyzers guide: directory listings.')}`,
    alt: 'Three steps in a loop: 1 Find the directories engines cite in your answers; 2 List with the same name, description and link everywhere; 3 Check the next sweep; then start again from step 1.',
    caption: 'The directory-listing loop: find the directories the engines cite, list consistently, and check the next sweep.',
  });
}

// 12. one-entity
{
  const W = 1472, H = 560, cx = W / 2, cy = H / 2;
  const sats = [
    { t: 'Website', ic: I.globe, x: 260, y: 110 }, { t: 'Professional profile', ic: I.person, x: W - 260, y: 110 },
    { t: 'Company database', ic: I.folder, x: 260, y: H - 110 }, { t: 'Directory listings', ic: I.list, x: W - 260, y: H - 110 },
  ];
  const html = `${header('One entity', 'One name, one identifier, linked profiles.')}
  <div style="position:relative;width:${W}px;height:${H}px">
    <svg width="${W}" height="${H}" style="position:absolute;inset:0" aria-hidden="true">${sats.map((s) => `<line x1="${cx}" y1="${cy}" x2="${s.x}" y2="${s.y}" stroke="${C.teal}" stroke-width="4" stroke-dasharray="1 11" stroke-linecap="round"/>`).join('')}</svg>
    <div style="position:absolute;left:${cx - 210}px;top:${cy - 110}px;width:420px;height:220px;border-radius:24px;background:${C.tealDeep};border:3px solid ${C.teal};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
      ${ICON(I.target, C.teal, 52)}<h3 style="font-size:36px">Your entity record</h3><p style="font-size:21px;color:${C.white}">one name · one identifier</p></div>
    ${sats.map((s) => `<div style="position:absolute;left:${s.x - 160}px;top:${s.y - 52}px;width:320px;height:104px;border-radius:20px;background:${C.panel};border:2px solid ${C.line};display:flex;align-items:center;justify-content:center;gap:16px">
      ${ICON(s.ic, C.lav, 36)}<span style="font-weight:700;font-size:26px;color:${C.white}">${s.t}</span></div>`).join('')}
  </div>
  ${footer('Every profile uses the same name and links back to the same identifier.')}`;
  figs.push({
    id: 'one-entity', html,
    alt: 'One central node, "Your entity record: one name, one identifier", linked by dotted lines to four profiles: Website, Professional profile, Company database and Directory listings. Every profile uses the same name and links back to the same identifier.',
    caption: 'One name, one identifier, linked profiles: your website, professional profile, company database and directory listings all point back to the same entity record.',
  });
}

// 13. ledger-chart
{
  const plotH = 380;
  const grid = [0, 25, 50, 75, 100].map((v) => `<div style="position:absolute;left:0;right:0;bottom:${(v / 100) * plotH}px;border-top:1px solid ${v === 0 ? '#5A6A8C' : C.line}"></div>
    <span style="position:absolute;left:-74px;width:60px;text-align:right;bottom:${(v / 100) * plotH - 12}px;font-size:18px;color:${C.muted}">${v}%</span>`).join('');
  const bars = MONTHS.map((m) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
    <span style="font-weight:700;font-size:34px;color:${C.white};margin-bottom:10px">${m.pct}%</span>
    <div style="width:120px;height:${(m.pct / 100) * plotH}px;background:${C.teal};border-radius:6px 6px 0 0"></div></div>`).join('');
  const labels = MONTHS.map((m) => `<div style="flex:1;text-align:center;padding-top:14px">
    <p style="font-weight:700;font-size:24px;color:${C.white}">${m.long} 2026</p><p style="font-size:19px;color:${C.muted};margin-top:2px">N=${m.n}${m.restated ? ' · <span style="color:' + C.lav + '">restated</span>' : ''}</p></div>`).join('');
  const rec = MONTHS.map((m) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:120px;height:4px;border-radius:2px;background:${C.lav}"></div><p style="font-weight:700;font-size:26px;color:${C.white}">${m.cat} of ${m.catN}</p></div>`).join('');
  figs.push({
    id: 'ledger-chart',
    html: `${header('Found by name, but not recommended', 'AEO Analyzers’ own monthly measurement, August to November 2026.')}
    <div class="panel" style="padding:36px 40px 30px 120px">
      <p style="font-weight:700;font-size:24px;color:${C.white};margin-left:-80px;margin-bottom:26px">Found by name <span style="font-weight:400;color:${C.grey}">· share of by-name answers that found our site</span></p>
      <div style="position:relative;height:${plotH + 56}px"><div style="position:absolute;left:0;right:0;bottom:0;height:${plotH}px">${grid}</div>
        <div style="position:absolute;inset:0;display:flex">${bars}</div></div>
      <div style="display:flex">${labels}</div>
      <div style="margin:30px 0 0 -80px;padding-top:26px;border-top:1px solid ${C.line}">
        <p style="font-weight:700;font-size:24px;color:${C.white};margin-bottom:22px">Recommended to buyers <span style="font-weight:400;color:${C.grey}">· category answers that cited our site</span></p>
        <div style="display:flex;margin-left:80px">${rec}</div></div>
    </div>
    ${footer('Source: AEO Analyzers’ own monthly measurement (panel v1.1), stored answers.')}`,
    alt: `Bar chart of AEO Analyzers' own monthly measurement, August to November 2026. Found by name (share of 40 by-name answers that found our site): ${MONTHS.map((m) => `${m.long} ${m.pct}%${m.restated ? ' (restated)' : ''}`).join(', ')}. Recommended to buyers (category answers that cited our site): ${MONTHS[0].cat} of ${MONTHS[0].catN} in every month. Source: panel v1.1, stored answers.`,
    caption: 'Found by name rose from 55% in August (restated) to 80%, 88% and 78% (N=40 each), while recommended to buyers stayed at 0 of 200 every month. Source: AEO Analyzers’ own monthly measurement (panel v1.1), stored answers.',
  });
}

// 14. named-0-of-40
{
  const sq = scRows.map((r) => r.verdict === 'unreadable'
    ? `<span style="width:52px;height:52px;border-radius:10px;border:2px dashed #7A88A8;display:inline-block;background:repeating-linear-gradient(45deg,transparent 0 6px,#2E3B58 6px 9px)"></span>`
    : r.verdict === 'yes' ? `<span style="width:52px;height:52px;border-radius:10px;background:${C.teal};display:inline-block"></span>`
      : `<span style="width:52px;height:52px;border-radius:10px;border:2px solid #5A6A8C;display:inline-block;background:${C.panel2}"></span>`).join('');
  figs.push({
    id: 'named-0-of-40',
    html: `<div class="panel" style="display:flex;gap:64px;align-items:center;padding:56px 60px">
      <div style="flex:1">
        <p style="font-weight:700;font-size:26px;letter-spacing:.06em;text-transform:uppercase;color:${C.teal}">Named on</p>
        <p style="font-weight:700;font-size:148px;line-height:1;color:${C.white};margin:12px 0 18px">${SC.named} of ${SC.recurringPages}</p>
        <p style="font-size:28px;line-height:1.4;color:${C.grey}">most-read pages for our category questions, November 1st, 2026 (${SC.couldNotRead} could not be read)</p>
      </div>
      <div><div style="display:grid;grid-template-columns:repeat(8,52px);gap:12px">${sq}</div>
        <div style="display:flex;gap:28px;margin-top:22px;font-size:19px;color:${C.grey}">
          <span style="display:flex;gap:10px;align-items:center"><span style="width:20px;height:20px;border-radius:5px;border:2px solid #5A6A8C;display:inline-block"></span>Does not name us</span>
          <span style="display:flex;gap:10px;align-items:center"><span style="width:20px;height:20px;border-radius:5px;border:2px dashed #7A88A8;display:inline-block"></span>Could not be read</span></div></div>
    </div>
    ${footer('Source: docs/baselines/aeoanalyzers-2026-11-01.json, source coverage of the pages the engines cited for our category questions.')}`,
    alt: `Stat tile: "Named on ${SC.named} of ${SC.recurringPages}" most-read pages for our category questions, November 1st, 2026 (${SC.couldNotRead} could not be read). A grid of ${SC.recurringPages} squares: ${SC.recurringPages - SC.couldNotRead - scYes} outlined squares for pages that do not name us and ${SC.couldNotRead} hatched squares for pages that could not be read; none filled.`,
    caption: `On November 1st, 2026, none of the ${SC.recurringPages} pages the engines read most for our category questions named AEO Analyzers (${SC.couldNotRead} could not be read). Source: our own measurement, docs/baselines/aeoanalyzers-2026-11-01.json.`,
  });
}

// 15. measure-act-record
{
  const p = (ic: string, t: string, d: string, sub: string) => `<div class="panel" style="flex:1;padding:36px 34px 40px">
    ${ICON(ic, C.teal, 50)}<h3 style="font-size:40px;margin:18px 0 12px">${t}</h3><p style="font-size:24px;line-height:1.4;color:${C.white}">${d}</p>
    <p style="font-size:21px;line-height:1.45;color:${C.grey};margin-top:14px">${sub}</p></div>`;
  figs.push({
    id: 'measure-act-record',
    html: `${header('Measure, act, record', 'How to get recommended: a loop you can check, not a promise.')}
    <div class="row">${p(I.search, 'Measure', 'What the engines say, stored.', 'Every answer kept with its sources.')}${ARROW()}
      ${p(I.list, 'Act', 'The steps, in order, with owners.', 'Each step says who does it.')}${ARROW()}
      ${p(I.clock, 'Record', 'Dated actions beside the next measurement.', 'Timing, not cause.')}</div>
    ${footer('AEO Analyzers: getting recommended by AI answer engines.')}`,
    alt: 'Three panels: Measure (what the engines say, stored; every answer kept with its sources) leads to Act (the steps, in order, with owners) leads to Record (dated actions beside the next measurement; timing, not cause).',
    caption: 'Measure what the engines say, act on the steps in order, and record dated actions beside the next measurement. The record shows timing, not cause.',
  });
}

// 16. pipeline (rebuild of how-it-works visual-1)
{
  const stage = (n: number, t: string, top: string, bottom: string) => `<div class="panel" style="flex:1;padding:26px 22px 26px;display:flex;flex-direction:column;align-items:center;text-align:center;border-color:${C.teal}66">
    <p style="font-weight:700;font-size:19px;letter-spacing:.03em;color:${C.teal};white-space:nowrap">${n} · ${t}</p>
    <div style="height:210px;display:flex;align-items:center;justify-content:center;width:100%">${top}</div>
    <div style="width:100%;border-top:2px solid ${C.teal};margin:6px 0 22px"></div>${bottom}</div>`;
  const chip = (s: string, extra = '') => `<span style="display:inline-block;font-size:18px;color:${C.white};border:1.5px solid ${C.teal};border-radius:999px;padding:5px 12px;background:${C.panel};${extra}">${s}</span>`;
  const eng = (s: string, sub = '') => `<div style="border:1.5px solid ${C.line};background:${C.panel2};border-radius:12px;padding:8px 6px;font-weight:700;font-size:19px;color:${C.white}">${s}${sub ? `<div style="font-weight:400;font-size:15px;color:${C.grey}">${sub}</div>` : ''}</div>`;
  const meas = (ic: string, t: string) => `<div style="display:flex;gap:12px;align-items:center;font-size:20px;color:${C.white};text-align:left">${ICON(ic, C.teal, 32)}${t}</div>`;
  const ck = (t: string) => `<div style="display:flex;gap:10px;align-items:flex-start;font-size:19px;line-height:1.35;color:${C.grey};text-align:left;margin-bottom:12px">${ICON(I.check, C.teal, 26)}<span>${t}</span></div>`;
  const get = (ic: string, t: string, sub = '') => `<div style="border:1.5px solid ${C.line};background:${C.panel2};border-radius:12px;padding:10px 14px;margin-bottom:10px;text-align:left">
    <div style="display:flex;gap:12px;align-items:center;font-weight:700;font-size:19px;color:${C.white}">${ICON(ic, C.teal, 28)}${t}</div>${sub ? `<p style="font-size:16px;color:${C.grey};margin:4px 0 0 40px">${sub}</p>` : ''}</div>`;
  const html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:38px">
      <div class="brand" style="font-size:22px">${mark(60)}<span>AEO ANALYZERS</span></div>
      <h1 class="t" style="font-size:64px;letter-spacing:.02em">THE PIPELINE</h1><div style="width:236px"></div></div>
    <div class="row" style="gap:18px;align-items:stretch">
      ${stage(1, 'YOUR DOMAIN', ICON(I.globe, C.teal, 120),
        `<h3 style="font-size:28px">We read your site</h3><p style="font-size:19px;line-height:1.5;margin:12px 0 20px">brand · category · competitors · draft questions</p>
         <span style="display:inline-flex;gap:10px;align-items:center;border:2px solid ${C.teal};border-radius:999px;padding:8px 20px;font-size:20px;color:${C.white};margin-top:auto">${ICON(I.check, C.teal, 26)}you confirm</span>`)}
      ${stage(2, 'THE QUESTIONS', ICON(I.list, C.teal, 120),
        `<h3 style="font-size:28px">Your buyer questions</h3><p style="font-size:19px;margin:12px 0 16px">three kinds:</p>
         <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${chip('about-you')}${chip('category')}${chip('head-to-head')}</div>`)}
      ${stage(3, 'THE INTERROGATION',
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%">${V11.map((e) => eng(e)).join('')}${EXTRA.map((e) => `<div style="grid-column:1/3">${eng(e, 'on Pro and Business')}</div>`).join('')}</div>`,
        `<h3 style="font-size:24px;line-height:1.3">the engines on your plan × every question × several runs</h3>
         <p style="font-size:19px;margin:10px 0 14px">web search <b class="k">ON</b></p>
         <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${chip('search-grounded', 'font-size:17px;white-space:nowrap')}${chip('answered-from-memory', 'font-size:17px;white-space:nowrap')}</div>
         <p style="font-size:17px;color:${C.grey};margin-top:10px">kept separate</p>`)}
      ${stage(4, 'THE MEASUREMENT',
        `<div style="display:flex;flex-direction:column;gap:22px">${meas(I.search, 'found by name')}${meas(I.trophy, 'recommended to buyers')}${meas(I.users, 'who’s cited instead')}</div>`,
        `${ck('accuracy check')}${ck('look-alike detection')}${ck('sample size &amp; confidence on every number')}`)}
      ${stage(5, 'THE DELIVERABLES', ICON(I.doc, C.teal, 120),
        `<h3 style="font-size:26px;margin-bottom:14px">What you get</h3><div style="width:100%">${get(I.target, 'scorecard')}${get(I.chat, 'stored transcripts')}${get(I.list, 'action plan', 'code fixes · content agenda · tiered source list')}</div>`)}
    </div>
    <div style="position:relative;margin:0 141px 0 636px;height:96px;border:3px solid ${C.teal};border-top:0;border-radius:0 0 26px 26px">
      <svg width="28" height="24" viewBox="0 0 28 24" style="position:absolute;left:-15.5px;top:-12px" aria-hidden="true"><path d="M2 20L14 4l12 16" fill="none" stroke="${C.teal}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="position:absolute;left:50%;bottom:-24px;transform:translateX(-50%);white-space:nowrap;display:inline-flex;gap:12px;align-items:center;background:${C.bg};border:2px solid ${C.teal};border-radius:999px;padding:8px 18px;font-size:18px;color:${C.white}">${ICON(I.repeat, C.teal, 26)}Re-sweep monthly — same questions, same way — watch the number move.</span></div>
    <div style="height:30px"></div>`;
  figs.push({
    id: 'pipeline', also: `${HIW}/visual-1-pipeline-v2.webp`, html,
    alt: `The AEO Analyzers pipeline in five stages. 1 Your domain: we read your site and propose brand, category, competitors and draft questions; you confirm. 2 The questions: your buyer questions, in three kinds: about-you, category and head-to-head. 3 The interrogation: the engines on your plan (${V11.join(', ')}, plus ${EXTRA.join(', ')} on Pro and Business) × every question × several runs, web search on, with search-grounded and answered-from-memory answers kept separate. 4 The measurement: found by name, recommended to buyers and who's cited instead, with an accuracy check, look-alike detection, and sample size and confidence on every number. 5 The deliverables: a scorecard, stored transcripts and an action plan (code fixes, content agenda, tiered source list). A loop returns to stage 3: re-sweep monthly, same questions, same way, and watch the number move.`,
    caption: 'How a Citation Sweep runs: your domain, your buyer questions, the engines on your plan with web search on, the measurement, and the deliverables, then the same sweep again each month.',
  });
}

// 17. why-several-runs (rebuild of how-it-works visual-3; illustrative grid, stats computed from it)
{
  const engines = V11; // panel v1.1 engine names, plain text
  // 1 = cited, 0 = not cited. Same pattern as the original visual.
  const G = ['10101', '01010', '10111', '11001'];
  assertEq('runs grid rows = engines', G.length, engines.length);
  const runsN = 5;
  const total = G.length * runsN;
  const cited = G.join('').split('').filter((c) => c === '1').length;
  const pct = Math.round((100 * cited) / total);
  const wi = wilsonInterval(cited, total);
  const conf = confidenceLabel(total);
  assertEq('why-several-runs numbers', [cited, total, pct, wi.low, wi.high, conf], [12, 20, 60, 39, 78, 'high confidence']);
  const yes = `<svg width="64" height="64" viewBox="0 0 50 50" aria-hidden="true"><path d="M12 26l9 9 17-19" fill="none" stroke="${C.teal}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const no = `<svg width="52" height="52" viewBox="0 0 50 50" aria-hidden="true"><path d="M13 13l24 24M37 13L13 37" fill="none" stroke="#7D899E" stroke-width="5.5" stroke-linecap="round"/></svg>`;
  const cell = (c: string) => `<div style="height:104px;border-radius:16px;display:flex;align-items:center;justify-content:center;${c === '1'
    ? `background:${C.tealDeep};border:2px solid ${C.teal}` : `background:${C.panel2};border:2px solid ${C.line}`}">${c === '1' ? yes : no}</div>`;
  const grid = `<div style="display:grid;grid-template-columns:250px repeat(${runsN},1fr);gap:12px;align-items:center">
    <span></span>${Array.from({ length: runsN }, (_, i) => `<span style="text-align:center;font-weight:700;font-size:22px;color:${C.teal}">Run ${i + 1}</span>`).join('')}
    ${engines.map((e, r) => `<div style="height:104px;display:flex;flex-direction:column;justify-content:center;padding-left:22px;border-radius:16px;background:${C.panel};border:2px solid ${C.line}">
      <span style="font-weight:700;font-size:26px;color:${C.white}">${e}</span><span style="font-size:19px;color:${C.grey}">web search on</span></div>${G[r].split('').map(cell).join('')}`).join('')}</div>`;
  const dots = Array.from({ length: total }, (_, i) => `<span style="width:20px;height:20px;border-radius:50%;display:inline-block;${i < cited ? `background:${C.teal}` : 'border:3px solid #5A6A8C'}"></span>`).join('');
  const stat = (lbl: string, body: string, extra = '') => `<div style="flex:1;padding:0 28px;${extra}"><p style="font-weight:700;font-size:19px;letter-spacing:.06em;text-transform:uppercase;color:${C.teal};margin-bottom:12px">${lbl}</p>${body}</div>`;
  const html = `${header('Why several runs?', 'A single answer is random. The pattern is a measurement.', ILL)}
  <div class="row" style="gap:24px;align-items:stretch">
    <div class="panel" style="width:300px;padding:26px 24px;display:flex;flex-direction:column">
      <p style="font-weight:700;font-size:19px;letter-spacing:.06em;text-transform:uppercase;color:${C.teal}">The same question</p>
      <p style="font-size:26px;line-height:1.35;color:${C.white};margin:14px 0 18px">“What are the best AI visibility tools?”</p>
      <div style="display:flex;gap:10px;align-items:center;font-size:20px;color:${C.grey};padding-top:16px;border-top:1px solid ${C.line}">${ICON(I.search, C.teal, 26)}Web search: on</div>
      <p style="font-size:20px;line-height:1.45;color:${C.grey};margin-top:22px">Asked ${runsN} times on each of ${engines.length} engines.</p>
    </div>
    <div style="flex:1">${grid}</div>
    <div class="panel" style="width:230px;padding:26px 22px;display:flex;flex-direction:column;gap:18px;justify-content:center">
      <div><div style="display:flex;gap:8px;align-items:center">${ICON(I.check, C.teal, 30)}<span style="font-weight:700;font-size:19px;letter-spacing:.04em;color:${C.teal}">CITED</span></div>
        <p style="font-size:19px;line-height:1.4;margin-top:8px">Your brand is cited in the answer.</p></div>
      <div style="border-top:1px solid ${C.line}"></div>
      <div><div style="display:flex;gap:8px;align-items:center"><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#7D899E" stroke-width="1.7"/><path d="M9 9l6 6M15 9l-6 6" stroke="#7D899E" stroke-width="1.7" stroke-linecap="round"/></svg><span style="font-weight:700;font-size:19px;letter-spacing:.04em;color:${C.white}">NOT CITED</span></div>
        <p style="font-size:19px;line-height:1.4;margin-top:8px">You are not cited in the answer.</p></div>
    </div>
  </div>
  <div class="panel" style="display:flex;margin-top:28px;padding:30px 0">
    ${stat('Total answers', `<p style="font-weight:700;font-size:54px;line-height:1;color:${C.white}">${total}</p><p style="font-size:20px;margin-top:10px">${engines.length} engines × ${runsN} runs</p>`)}
    ${stat('Cite rate', `<div style="display:flex;gap:20px;align-items:center"><p style="font-weight:700;font-size:54px;line-height:1;color:${C.teal}">${pct}%</p><p style="font-size:20px;line-height:1.35;color:${C.white}">${cited} of ${total} answers<br>cited you</p></div>
      <div style="display:grid;grid-template-columns:repeat(10,20px);gap:8px;margin-top:16px">${dots}</div>`, `border-left:1px solid ${C.line};flex:1.5`)}
    ${stat('Range and confidence', `<div style="position:relative;height:14px;border-radius:7px;background:${C.panel2};border:1px solid ${C.line};margin:22px 0 8px">
        <div style="position:absolute;top:-1px;bottom:-1px;left:${wi.low}%;width:${wi.high - wi.low}%;background:${C.purple};border-radius:7px"></div>
        <div style="position:absolute;top:-6px;left:calc(${pct}% - 12px);width:24px;height:24px;border-radius:50%;background:${C.teal};border:3px solid ${C.bg}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:18px;color:${C.muted}"><span>0%</span><span>100%</span></div>
      <p style="font-size:20px;line-height:1.4;color:${C.white};margin-top:10px">${wi.low}% to ${wi.high}% (95% range)<br>sample size ${total} · ${conf}</p>`, `border-left:1px solid ${C.line};flex:1.6`)}
  </div>
  ${footer('Illustrative example: not real results. The range is a Wilson 95% interval, the same method the sweep report uses.')}`;
  figs.push({
    id: 'why-several-runs', html,
    alt: `Illustrative example titled "Why several runs? A single answer is random. The pattern is a measurement." The same question, "What are the best AI visibility tools?", with web search on, asked ${runsN} times on each of ${engines.length} engines (${engines.join(', ')}). A grid of ${total} answers marks each run cited (check) or not cited (cross): ${engines.map((e, r) => `${e} ${G[r].split('').map((c) => (c === '1' ? 'cited' : 'not cited')).join(', ')}`).join('; ')}. Total answers: ${total} (${engines.length} engines × ${runsN} runs). Cite rate: ${pct}%, ${cited} of ${total} answers cited you. Range and confidence: ${wi.low}% to ${wi.high}% (95% range), sample size ${total}, ${conf}. Not real results; the range is a Wilson 95% interval, the same method the sweep report uses.`,
    caption: `Illustrative example. One answer can go either way; ${total} answers give a cite rate (${pct}% here) with a range (${wi.low}% to ${wi.high}%) and a sample size. Not real results.`,
  });
}

// 18. reading-isnt-citing (rebuild of how-it-works visual-4)
{
  const step = (ic: string, col: string, t: string, d: string) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px">
    <p style="font-weight:700;font-size:19px;letter-spacing:.05em;text-transform:uppercase;color:${C.white};min-height:54px;display:flex;align-items:flex-end;justify-content:center">${t}</p>
    <div style="width:116px;height:116px;border-radius:50%;background:${C.panel2};border:2px solid ${col};display:flex;align-items:center;justify-content:center">${ICON(ic, col, 60)}</div>
    <p style="font-size:20px;line-height:1.35;color:${C.grey}">${d}</p></div>`;
  const join = (steps: string[], col: string) => steps.join(`<div style="flex:none;padding-top:92px">${ARROW(44, col)}</div>`);
  const span = (col: string, txt: string, label: string, ic: string) => `<div style="display:flex;align-items:center;gap:16px;margin:26px 0 22px">
    <div style="flex:1;border-top:2px solid ${col}"></div>${ICON(ic, col, 28)}<span style="font-weight:700;font-size:19px;letter-spacing:.06em;color:${txt}">${label}</span><div style="flex:1;border-top:2px solid ${col}"></div></div>`;
  const side = (n: number, col: string, txt: string, title: string, tag: string, d: string, steps: string, lbl: string, lic: string, boxIc: string, boxT: string, boxD: string) => `
    <div class="panel" style="padding:32px 36px 34px;border-color:${col}88">
      <div style="display:flex;gap:28px;align-items:baseline;flex-wrap:wrap"><h3 style="font-size:34px;color:${txt}">${n}. ${title}</h3><p style="font-size:23px;font-style:italic;font-weight:700;color:${txt}">${tag}</p></div>
      <p style="font-size:22px;color:${C.grey};margin:8px 0 26px">${d}</p>
      <div style="display:flex;align-items:flex-start;gap:6px">${steps}</div>
      ${span(col, txt, lbl, lic)}
      <div style="display:flex;gap:22px;align-items:center;background:${C.panel2};border:2px solid ${col};border-radius:16px;padding:20px 26px">
        ${ICON(boxIc, col, 52)}<p style="font-size:22px;line-height:1.4;color:${C.white}"><b style="color:${txt}">${boxT}</b> ${boxD}</p></div>
    </div>`;
  const training = join([
    step(I.bot, C.lav, 'Crawlers', 'Discover and fetch pages across the web'),
    step(I.doc, C.lav, 'Raw pages', 'Text from across the web'),
    step(I.layers, C.lav, 'Process and ingest', 'Clean, dedupe, chunk and ingest'),
    step(I.net, C.lav, 'Model training', 'Patterns learned. Knowledge encoded.'),
  ], C.lav);
  const live = join([
    step(I.help, C.teal, 'Buyer question', 'A real question in the moment'),
    step(I.chat, C.teal, 'Multi-query generation', 'Different ways to search the web'),
    step(I.radar, C.teal, 'Live retrieval', 'Search the web right now'),
    step(I.trophy, C.teal, 'Ranking contest', 'Sources compete. Only a few win.'),
    step(I.list, C.teal, 'Answer with citations', 'Top sources are cited in the answer'),
  ], C.teal);
  const html = `${header('Reading isn’t citing', `AI engines <b style="color:${C.lav}">read</b> a vast amount of the web when they train.<br>They <b class="k">cite</b> a small set of sources when they answer.`)}
  ${side(1, C.purple, C.lav, 'Training pipeline', 'Slow. Diffuse. Months.', 'Crawlers read massive amounts of content to build a general knowledge model.', training, 'WEEKS TO MONTHS', I.clock, I.dots, 'Huge, diffuse knowledge.', 'The model has read a lot, but that doesn’t mean it will cite it.')}
  <div style="display:flex;align-items:center;gap:20px;margin:22px 0">
    <div style="flex:1;border-top:1px solid ${C.line}"></div>
    <span style="font-weight:700;font-size:26px;color:${C.white};width:76px;height:76px;border-radius:50%;border:2px solid ${C.line};background:${C.bg};display:flex;align-items:center;justify-content:center">vs.</span>
    <div style="flex:1;border-top:1px solid ${C.line}"></div></div>
  ${side(2, C.teal, C.teal, 'Live retrieval pipeline', 'Fast. Selective. Seconds.', 'At answer time, the engine runs a real-time race to find and rank the best sources.', live, 'SECONDS, AT ANSWER TIME', I.bolt, I.list, 'Small, selective set.', 'Only the strongest, most relevant, most trustworthy sources get cited.')}
  <div class="panel" style="display:flex;align-items:center;gap:30px;margin-top:28px;padding:28px 36px">
    ${ICON(I.scale, C.teal, 56)}<p style="font-weight:700;font-size:26px;letter-spacing:.04em;color:${C.teal};white-space:nowrap">THE TAKEAWAY</p>
    <div style="align-self:stretch;border-left:1px solid ${C.line}"></div>
    <div><p style="font-size:28px;color:${C.white}">Being read during training ≠ being cited in answers.</p>
      <p style="font-size:21px;color:${C.grey};margin-top:6px">Citation is earned in a real-time contest, not guaranteed by being in the training data.</p></div>
  </div>
  ${footer('We measure what happens in the live retrieval pipeline, because that’s what decides visibility.')}`;
  figs.push({
    id: 'reading-isnt-citing', html,
    alt: 'Diagram titled "Reading isn\'t citing": AI engines read a vast amount of the web when they train; they cite a small set of sources when they answer. 1. Training pipeline, slow, diffuse, months: crawlers read massive amounts of content to build a general knowledge model. Four steps: Crawlers (discover and fetch pages across the web), Raw pages (text from across the web), Process and ingest (clean, dedupe, chunk and ingest), Model training (patterns learned, knowledge encoded). Weeks to months. Result: huge, diffuse knowledge; the model has read a lot, but that doesn\'t mean it will cite it. Versus 2. Live retrieval pipeline, fast, selective, seconds: at answer time, the engine runs a real-time race to find and rank the best sources. Five steps: Buyer question (a real question in the moment), Multi-query generation (different ways to search the web), Live retrieval (search the web right now), Ranking contest (sources compete, only a few win), Answer with citations (top sources are cited in the answer). Seconds, at answer time. Result: a small, selective set; only the strongest, most relevant, most trustworthy sources get cited. The takeaway: being read during training is not the same as being cited in answers; citation is earned in a real-time contest, not guaranteed by being in the training data. We measure what happens in the live retrieval pipeline, because that\'s what decides visibility.',
    caption: 'Training reads a vast amount of the web over weeks to months; live retrieval picks a few sources at answer time. Citation is decided in the second pipeline, which is the one a sweep measures.',
  });
}

// 19. attainability-ladder (rebuild of how-it-works visual-5)
{
  const tier = (n: number, col: string, txt: string, bg: string, indent: number, ic: string, title: string, lead: string, kinds: string[], chip: string, exIc: string, ex: string) => `
    <div style="margin:0 ${indent}px 0 ${indent}px;display:flex;border-radius:20px;overflow:hidden;border:2px solid ${col};background:${bg}">
      <div style="width:96px;flex:none;background:${txt};display:flex;align-items:center;justify-content:center"><span style="font-weight:700;font-size:64px;color:${C.bg}">${n}</span></div>
      <div style="flex:1;display:flex;gap:24px;padding:26px 30px">${ICON(ic, txt, 64)}
        <div style="flex:1"><h3 style="font-size:36px;letter-spacing:.03em;color:${txt}">${title}</h3>
          <p style="font-size:23px;font-weight:700;color:${C.white};margin:8px 0 6px">${lead}</p>
          <p style="font-size:20px;color:${C.grey}">${kinds.join(' • ')}</p>
          <span style="display:inline-block;margin-top:14px;font-size:19px;color:${C.white};border:1.5px solid ${col};border-radius:10px;padding:5px 16px;background:${C.bg}">${chip}</span></div>
        <div style="width:330px;flex:none;border-left:1px solid ${C.line};padding-left:26px">
          <div style="display:flex;gap:12px;align-items:center">${ICON(exIc, txt, 36)}<p style="font-weight:700;font-size:19px;letter-spacing:.06em;color:${txt}">EXAMPLES</p></div>
          <p style="font-size:20px;line-height:1.45;color:${C.white};margin-top:10px">${ex}</p></div>
      </div></div>`;
  const tip = (ic: string, col: string, t: string, d: string) => `<div style="flex:1;display:flex;gap:16px;align-items:flex-start;padding:0 24px;border-left:1px solid ${C.line}">${ICON(ic, col, 44)}
    <div><p style="font-weight:700;font-size:19px;letter-spacing:.05em;color:${col}">${t}</p><p style="font-size:19px;line-height:1.4;color:${C.white};margin-top:4px">${d}</p></div></div>`;
  const html = `${header('The attainability ladder', `Not every citation is equally in reach. <span class="k">Focus your effort where you can move the needle.</span>`)}
  <div style="display:flex;gap:28px">
    <div style="width:200px;flex:none;display:flex;flex-direction:column;align-items:center;text-align:center;font-weight:700;font-size:19px;letter-spacing:.05em;line-height:1.35">
      <p style="color:${C.lav}">HARDER<br>TO MOVE</p>
      <svg width="24" height="20" viewBox="0 0 24 20" style="margin-top:12px" aria-hidden="true"><path d="M2 18L12 3l10 15" fill="none" stroke="${C.grey}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="flex:1;border-left:3px solid ${C.grey};margin-top:-14px"></div>
      <p style="color:${C.white};padding:14px 0">MORE TIME,<br>MORE INFLUENCE,<br>LESS CONTROL</p>
      <div style="flex:1;border-left:3px solid ${C.grey}"></div>
      <p style="color:${C.teal};margin-top:12px">EASIER<br>TO MOVE</p>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:16px">
      ${tier(3, C.purple, C.lav, '#171433', 56, I.mountain, 'ASPIRATIONAL', 'Labeled honestly, not assigned as homework.', ['Major publications', 'Analyst reports', 'Government and standards'], 'High authority. Low control. Long horizon.', I.target, 'Industry reports, academic research, news sites, analyst firms, standards organizations.')}
      ${tier(2, C.cyan, C.cyan, '#0E2430', 28, I.handshake, 'EARN', 'Pitchable: roundups, communities, directories.', ['Lists', 'Reviews', 'Partnerships', 'Events', 'Guest features'], 'Relationship-based. Influenceable. Earn the spot.', I.users, 'Top tools lists, community recommendations, newsletters, podcasts, industry associations.')}
      ${tier(1, C.teal, C.teal, C.tealDeep, 0, I.doc, 'DO NOW', 'Self-serve: your profiles, your pages.', ['Website', 'Help center', 'Docs', 'Social profiles', 'Knowledge base'], 'High control. Fastest movement. Start here.', I.check, 'Your website content, schema markup, business and review-site profiles, help docs, case studies.')}
    </div>
  </div>
  <div class="panel" style="display:flex;align-items:center;margin-top:30px;padding:28px 0 28px 30px">
    <div style="flex:1.3;display:flex;gap:18px;align-items:center;padding-right:24px">${ICON(I.target, C.teal, 56)}<p style="font-size:24px;line-height:1.35;color:${C.white}">An action plan should spend your time where movement is possible.</p></div>
    ${tip(I.clock, C.teal, 'MAXIMIZE IMPACT', 'Focus on what you can influence and improve.')}
    ${tip(I.chart, C.cyan, 'BUILD MOMENTUM', 'Win the early wins. Earn the next ones.')}
    ${tip(I.mountain, C.lav, 'THINK LONG TERM', 'Pursue the big opportunities without wasting cycles.')}
  </div>
  ${footer('We label each opportunity by attainability so you know where movement is possible, and where it isn’t (yet).')}`;
  figs.push({
    id: 'attainability-ladder', html,
    alt: 'Diagram titled "The attainability ladder": not every citation is equally in reach; focus your effort where you can move the needle. Three stacked tiers, with an axis from "easier to move" at the bottom to "harder to move" at the top: more time, more influence, less control. Tier 1, Do now: self-serve, your profiles, your pages; website, help center, docs, social profiles, knowledge base; high control, fastest movement, start here; examples: your website content, schema markup, business and review-site profiles, help docs, case studies. Tier 2, Earn: pitchable, roundups, communities, directories; lists, reviews, partnerships, events, guest features; relationship-based, influenceable, earn the spot; examples: top tools lists, community recommendations, newsletters, podcasts, industry associations. Tier 3, Aspirational: labeled honestly, not assigned as homework; major publications, analyst reports, government and standards; high authority, low control, long horizon; examples: industry reports, academic research, news sites, analyst firms, standards organizations. Below: an action plan should spend your time where movement is possible. Maximize impact: focus on what you can influence and improve. Build momentum: win the early wins, earn the next ones. Think long term: pursue the big opportunities without wasting cycles. We label each opportunity by attainability so you know where movement is possible, and where it isn\'t (yet).',
    caption: 'The attainability ladder: Do now (your own pages and profiles), Earn (lists, communities, directories) and Aspirational (major publications and analysts), each opportunity labeled by how far it is in reach.',
  });
}

// 20. fix-prove (rebuild of how-it-works visual-6; gauge values are illustrative)
{
  const gauge = (value: number, col: string, track: string, big: string, unit: string, label: string) => {
    const cx = 210, cy = 200, r = 160;
    const p = (t: number, rr = r) => { const a = ((150 + t * 240) * Math.PI) / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
    const arc = (t: number) => { const [x0, y0] = p(0), [x1, y1] = p(t); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${t * 240 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const t = value / 100;
    const ticks = Array.from({ length: 11 }, (_, i) => { const [a, b] = p(i / 10, r + 18), [c, d] = p(i / 10, r + (i % 5 ? 26 : 32)); return `<path d="M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${d.toFixed(1)}" stroke="#5A6A8C" stroke-width="2.5" stroke-linecap="round"/>`; }).join('');
    const [nx, ny] = p(t, r);
    const [zx, zy] = p(0, r), [hx, hy] = p(1, r);
    return `<div style="position:relative;width:420px;height:330px;margin:0 auto">
      <svg width="420" height="330" style="position:absolute;inset:0" aria-hidden="true">
        <path d="${arc(1)}" fill="none" stroke="${track}" stroke-width="22" stroke-linecap="round"/>
        <path d="${arc(t)}" fill="none" stroke="${col}" stroke-width="22" stroke-linecap="round"/>${ticks}
        <circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="15" fill="${C.white}" stroke="${C.bg}" stroke-width="4"/></svg>
      <p style="position:absolute;left:0;right:0;top:66px;text-align:center;font-size:20px;color:${C.grey}">50</p>
      <p style="position:absolute;left:0;right:0;top:104px;text-align:center;font-weight:700;font-size:92px;line-height:1;color:${col === C.purple ? C.lav : col}">${big}</p>
      <p style="position:absolute;left:0;right:0;top:200px;text-align:center;font-size:26px;color:${C.grey}">${unit}</p>
      <p style="position:absolute;left:0;right:0;top:240px;text-align:center;font-weight:700;font-size:19px;letter-spacing:.05em;color:${C.white}">${label}</p>
      <p style="position:absolute;left:${zx - 30}px;width:60px;top:${zy + 22}px;text-align:center;font-size:20px;color:${C.grey}">0</p>
      <p style="position:absolute;left:${hx - 30}px;width:60px;top:${hy + 22}px;text-align:center;font-size:20px;color:${C.grey}">100</p>
      <p style="position:absolute;left:0;right:0;top:300px;text-align:center;font-size:19px;font-style:italic;color:${C.white}">${ILL}</p>
    </div>`;
  };
  const pt = (ic: string, col: string, txt: string, t: string, d: string) => `<div style="display:flex;gap:18px;align-items:center;padding:14px 0;border-top:1px solid ${C.line}">
    <div style="width:62px;height:62px;flex:none;border-radius:50%;border:2px solid ${col};display:flex;align-items:center;justify-content:center">${ICON(ic, txt, 32)}</div>
    <div><p style="font-weight:700;font-size:22px;color:${txt}">${t}</p><p style="font-size:20px;line-height:1.4;color:${C.white}">${d}</p></div></div>`;
  const side = (col: string, txt: string, tag: string, title: string, q: string, d: string, g: string, pts: string) => `
    <div class="panel" style="flex:1;padding:30px 34px 22px;border-color:${col}">
      <div style="display:flex;gap:18px;align-items:center"><span style="white-space:nowrap;font-weight:700;font-size:16px;letter-spacing:.06em;color:${txt};border:2px solid ${col};border-radius:999px;padding:6px 14px;background:${C.bg}">${tag}</span>
        <h3 style="white-space:nowrap;font-size:34px;letter-spacing:.02em;color:${txt}">${title}</h3></div>
      <p style="font-weight:700;font-size:25px;color:${C.white};margin-top:14px">${q}</p><p style="font-size:21px;color:${C.grey};margin-top:4px">${d}</p>
      <div style="margin:18px 0 14px">${g}</div>${pts}</div>`;
  const html = `<div class="hd"><div><h1 class="t"><span class="k">Fix</span> ⟷ <span class="l">Prove</span></h1><p class="s">Two sides. One system. Better visibility.</p></div><span class="pill">${ILL}</span></div>
  <div class="row" style="gap:24px;align-items:stretch">
    ${side(C.teal, C.teal, 'INSIDE-OUT', 'AEO SCORE', 'Is your site built to be cited?', 'This is about you and your site.',
      gauge(88, C.teal, C.line, '88', 'out of 100', 'AEO SCORE'),
      pt(I.code, C.teal, C.teal, 'Built to be cited', 'Schema, structure, entities, clarity, authority signals.') +
      pt(I.wrench, C.teal, C.teal, 'Actionable fixes', 'Technical fixes, content gaps and authority building.') +
      pt(I.doc, C.teal, C.teal, 'You control this', 'Improvements you make inside your site.'))}
    <div style="width:300px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px">
      <div style="position:relative;width:300px;height:170px">
        <svg width="300" height="170" style="position:absolute;inset:0" aria-hidden="true"><path d="M4 40H210V6L296 85 210 164V130H4z" fill="${C.panel2}" stroke="${C.lav}" stroke-width="2.5" stroke-linejoin="round"/></svg>
        <div style="position:absolute;left:22px;top:52px;font-weight:700;font-size:21px;line-height:1.55;color:${C.white};background:${C.panel2}"><p><span class="k">FIX</span> with the score</p><p><span class="l">PROVE</span> with the sweep</p></div></div>
      <p style="font-size:21px;line-height:1.45;text-align:center;color:${C.white}">Improve what you control. Then measure what the world sees.</p>
      <div class="panel" style="padding:24px 22px;text-align:center;border-color:${C.teal};display:flex;flex-direction:column;align-items:center;gap:10px">
        ${ICON(I.target, C.teal, 46)}<h3 style="font-size:24px;color:${C.teal};letter-spacing:.04em">THE GOAL</h3>
        <p style="font-size:20px;line-height:1.45;color:${C.white}">Close the gap between how your site is built and how AI engines actually cite you.</p></div>
    </div>
    ${side(C.purple, C.lav, 'OUTSIDE-IN', 'CITATION SWEEP', 'Are you actually cited?', 'This is about how AI engines answer buyers.',
      gauge(12, C.purple, C.line, '12%', 'of answers', 'CITATION RATE'),
      pt(I.search, C.purple, C.lav, 'Measure reality', 'AI engines, real questions, multiple runs, web search on.') +
      pt(I.users, C.purple, C.lav, 'Outside-in proof', 'What gets cited, what competes, and who takes your spot.') +
      pt(I.chart, C.purple, C.lav, 'You can prove this', 'Reproducible sweeps, transcripts, sample size and confidence.'))}
  </div>
  <div class="panel" style="display:flex;align-items:center;margin-top:26px;padding:26px 0">
    <div style="flex:1;display:flex;gap:18px;align-items:center;padding:0 30px">${ICON(I.shield, C.teal, 52)}<div style="font-size:24px;line-height:1.4"><p class="k">Score tells you what to fix.</p><p style="color:${C.white}">Sweep tells you if it worked.</p></div></div>
    <div style="flex:1.1;display:flex;gap:18px;align-items:center;padding:0 30px;border-left:1px solid ${C.line}">${ICON(I.trophy, C.lav, 52)}<div style="font-size:24px;line-height:1.4;color:${C.lav}"><p>Better structure earns the opportunity.</p><p>Better authority wins the citation.</p></div></div>
    <div style="flex:.9;padding:0 30px;border-left:1px solid ${C.line}"><p style="font-weight:700;font-size:18px;letter-spacing:.06em;color:${C.lav}">ENGINES A SWEEP ASKS</p>
      <p style="font-size:21px;color:${C.white};margin-top:6px">${V11.join(' · ')}</p><p style="font-size:19px;color:${C.grey};margin-top:2px">plus ${EXTRA.join(', ')} on Pro and Business</p></div>
  </div>
  ${footer('We use the same questions, the same way, every time, so you can track real movement over time. Gauge values are illustrative.')}`;
  figs.push({
    id: 'fix-prove', html,
    alt: `Illustrative example titled "Fix ⟷ Prove: two sides, one system, better visibility." Left, inside-out, AEO Score: is your site built to be cited? This is about you and your site. A gauge labeled AEO Score reads 88 out of 100 (illustrative example). Built to be cited: schema, structure, entities, clarity, authority signals. Actionable fixes: technical fixes, content gaps and authority building. You control this: improvements you make inside your site. Middle, an arrow: fix with the score, prove with the sweep. Improve what you control, then measure what the world sees. The goal: close the gap between how your site is built and how AI engines actually cite you. Right, outside-in, Citation Sweep: are you actually cited? This is about how AI engines answer buyers. A gauge labeled citation rate reads 12% of answers (illustrative example). Measure reality: AI engines, real questions, multiple runs, web search on. Outside-in proof: what gets cited, what competes, and who takes your spot. You can prove this: reproducible sweeps, transcripts, sample size and confidence. Bottom: score tells you what to fix, sweep tells you if it worked. Better structure earns the opportunity; better authority wins the citation. Engines a sweep asks: ${V11.join(', ')}, plus ${EXTRA.join(', ')} on Pro and Business. We use the same questions, the same way, every time, so you can track real movement over time. Gauge values are illustrative.`,
    caption: 'Illustrative example. The AEO Score shows what to fix on your own site; the Citation Sweep shows whether answer engines actually cite you. Gauge values are illustrative, not a real result.',
  });
}

// 21. three-gates (rebuild of the primer's three-gates hero, house palette)
{
  const W = 1472, H = 430, ly = 250;
  const gx = [250, 736, 1150];
  const door = (x: number, col: string, fill: string) => {
    const l = x - 110, r = x + 110, top = 60, bot = 400;
    return `<path d="M${l - 26} ${bot}H${l}V${top}H${r}V${bot}H${r + 26}" fill="none" stroke="${col}" stroke-width="12" stroke-linejoin="round"/>
      <path d="M${l + 14} ${top + 18}L${x + 40} ${top + 46}V${bot - 50}L${l + 14} ${bot - 12}z" fill="${fill}" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="${x + 22}" cy="${ly}" r="9" fill="${col}"/>`;
  };
  const grey = '#8C98AD';
  const svg = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:150px" aria-hidden="true">
    <circle cx="20" cy="${ly}" r="14" fill="${grey}"/>
    <path d="M20 ${ly}H${gx[2] - 170}" stroke="${grey}" stroke-width="6"/>
    <path d="M${gx[2] + 30} ${ly}H${W - 40}" stroke="${C.teal}" stroke-width="7"/>
    <path d="M${W - 52} ${ly - 24}L${W - 6} ${ly}L${W - 52} ${ly + 24}z" fill="${C.teal}"/>
    ${door(gx[0], grey, '#1C2538')}${door(gx[1], grey, '#1C2538')}${door(gx[2], C.teal, C.tealDeep)}</svg>`;
  const tool = (ic: string, x: number, y: number) => `<div style="position:absolute;left:${x}px;top:${y}px">${ICON(ic, C.teal, 64)}</div>`;
  const label = (n: number, x: number, t: string, on: boolean) => `<div style="position:absolute;left:${x - 220}px;width:440px;top:0;display:flex;flex-direction:column;align-items:center;gap:10px">
    <span style="width:64px;height:64px;border-radius:50%;border:4px solid ${on ? C.teal : grey};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:34px;color:${on ? C.teal : C.grey}">${n}</span>
    <p style="font-weight:700;font-size:48px;line-height:1.1;color:${on ? C.teal : C.grey}">${t}</p></div>`;
  const html = `<div style="position:relative;width:${W}px;height:${150 + H}px">
    ${label(1, gx[0], 'In the index?', false)}${label(2, gx[1], 'Retrieved?', false)}${label(3, gx[2], 'Cited?', true)}
    ${svg}
    ${tool(I.wrench, gx[2] - 250, 250)}${tool(I.gear, gx[2] - 250, 365)}${tool(I.toolbox, gx[2] - 250, 470)}
    ${tool(I.hammer, gx[2] + 160, 250)}${tool(I.screwdriver, gx[2] + 160, 470)}
  </div>
  <p style="font-weight:700;font-size:64px;line-height:1.15;color:${C.white};text-align:center;margin-top:36px">Most advice is aimed at gate three.</p>
  ${footer('Three gates, in order: in the index, retrieved, cited.')}`;
  figs.push({
    id: 'three-gates', html,
    alt: 'Three gates in a row along a path, drawn as doorways. Gate 1: "In the index?" Gate 2: "Retrieved?" Gate 3: "Cited?", highlighted in green and surrounded by tools (a wrench, a gear, a toolbox, a hammer and a screwdriver), with the path continuing through it as an arrow. Below: "Most advice is aimed at gate three."',
    caption: 'Three gates stand between a page and a citation: in the index, retrieved, cited. Most advice is aimed at gate three.',
  });
}

// ---------------------------------------------------------------- render + checks
const CONTRAST_CHECK = () => {
  const parse = (s: string) => { const m = s.match(/[\d.]+/g)!.map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = (c: { r: number; g: number; b: number }) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const bgOf = (el: Element | null): { r: number; g: number; b: number } => {
    const layers: { r: number; g: number; b: number; a: number }[] = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let out = { r: 10, g: 15, b: 28 };
    for (const l of layers.reverse()) out = { r: l.r * l.a + out.r * (1 - l.a), g: l.g * l.a + out.g * (1 - l.a), b: l.b * l.a + out.b * (1 - l.a) };
    return out;
  };
  const bad: string[] = [];
  let n = 0;
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('svg')) return;
    const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent!.trim()).map((c) => c.textContent!.trim()).join(' ');
    if (!own) return;
    n++;
    const fg = parse(getComputedStyle(el).color);
    const a = lum(fg), b = lum(bgOf(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 7) bad.push(`${ratio.toFixed(2)} "${own.slice(0, 40)}"`);
  });
  return { n, bad };
};

const OVERFLOW_CHECK = () => {
  const bad: string[] = [];
  document.querySelectorAll('body *').forEach((el) => {
    const h = el as HTMLElement;
    if (h.closest('svg')) return;
    if (h.scrollWidth > h.clientWidth + 1 && getComputedStyle(h).overflow !== 'hidden' && h.clientWidth > 0 && h.children.length === 0)
      bad.push(`${h.tagName} "${(h.textContent || '').slice(0, 30)}" ${h.scrollWidth}>${h.clientWidth}`);
    const r = h.getBoundingClientRect();
    if (r.right > 1600.5 || r.left < -0.5) bad.push(`${h.tagName} outside frame "${(h.textContent || '').slice(0, 30)}"`);
  });
  return bad;
};

(async () => {
  const only = process.argv.slice(2);
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  const page = await browser.newPage();
  const manifest: Record<string, unknown> = {};
  const manifestPath = 'docs/images/blog-figures-2026-11.json';
  try { Object.assign(manifest, JSON.parse(readFileSync(manifestPath, 'utf8'))); } catch { /* first run */ }
  for (const f of figs) {
    if (only.length && !only.includes(f.id)) continue;
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="fig" id="fig">${f.html}</div></body></html>`, { waitUntil: 'load' });
    await page.evaluate('globalThis.__name = (f) => f'); // tsx/esbuild keepNames helper used inside evaluated functions
    await page.evaluate(() => (document as any).fonts.ready);
    const h = Math.ceil(await page.$eval('#fig', (e) => e.getBoundingClientRect().height));
    await page.setViewport({ width: 1600, height: h, deviceScaleFactor: 1 });
    const cc = await page.evaluate(CONTRAST_CHECK);
    if (cc.bad.length) throw new Error(`${f.id}: contrast below 7:1 -> ${cc.bad.join('; ')}`);
    const ov = await page.evaluate(OVERFLOW_CHECK);
    if (ov.length) throw new Error(`${f.id}: overflow -> ${ov.join('; ')}`);
    const buf = await page.screenshot({ type: 'webp', quality: 85, clip: { x: 0, y: 0, width: 1600, height: h } });
    writeFileSync(`${OUT}/fig-${f.id}.webp`, buf);
    if (f.also) writeFileSync(f.also, buf);
    manifest[f.id] = {
      file: `/img/blog/2026-11/fig-${f.id}.webp`, ...(f.also ? { alsoAt: f.also.replace(/^public/, '') } : {}),
      w: 1600, h, alt: f.alt, caption: f.caption,
    };
    console.log(`${f.id}: 1600x${h}, ${cc.n} text elements >= 7:1, ${Math.round(buf.length / 1024)} KB`);
  }
  await browser.close();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest: ${manifestPath}`);
})().catch((e) => { console.error(e); process.exit(1); });
