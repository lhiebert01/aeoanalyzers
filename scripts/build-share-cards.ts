/**
 * Image polish pass (Nov 2026): every share card, blog tile and post hero is built here, in code.
 *
 * House style, from the reference cards ("Being recognized is not being recommended", "Read the
 * transcript", "A new engine starts a new series"): near-black #050807 with a faint grid, one green
 * accent #4ADE80, white headline type, grey #9CA3AF secondary, red-orange #F87171 only for a zero or a
 * miss; Figtree (SIL OFL, scripts/fonts) headlines; letter-spaced capital labels; a green rule over a
 * footer with AEO ANALYZERS on the left and AEOANALYZERS.COM on the right. No navy, teal or purple.
 *
 * Each card carries one idea: a headline set in code plus one simple diagram of that idea. No model
 * art, no placeholder bars, no fake text. Every number comes from scripts/blog-data.ts (asserted
 * against docs/baselines). Every text element is checked for 7:1 contrast against its rendered
 * background and for overflow; any failure throws.
 *
 * One HTML per card renders twice: the share card and blog tile (1200x630 JPEG) and the post hero
 * (1600x840 WebP, the same design at 4/3 scale).
 *
 * Run: npx tsx scripts/build-share-cards.ts [slug ...]
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MONTHS, SC, V11, V12, EXTRA, QUOTE, quoteHits, claudeBy, SHORT, isFound, assertEq, ENGINE_LABEL } from './blog-data';

// The 13 October 2026 panel test (series-of-record engines), for the three in-post images of
// /blog/the-measurement-layer that replace the model-drawn ones.
const OCT13 = JSON.parse(readFileSync('docs/baselines/aeoanalyzers-panel-v1.2-day0-2026-10-13.json', 'utf8'));
const OCT_ENG = ['openai', 'claude', 'perplexity', 'gemini'];
const octRuns = (t: string) => OCT13.runs.filter((r: { engine: string; queryType: string }) => OCT_ENG.includes(r.engine) && r.queryType === t);
const OCT = { found: octRuns('branded').filter(isFound).length, foundN: octRuns('branded').length, rec: octRuns('category').filter((r: { domainCited?: boolean }) => r.domainCited).length, recN: octRuns('category').length,
  searched: OCT_ENG.map((e) => { const c = octRuns('category').filter((r: { engine: string }) => r.engine === e); return { name: ENGINE_LABEL[e], s: c.filter((r: { searchInvoked?: boolean }) => r.searchInvoked === true).length, m: c.filter((r: { searchInvoked?: boolean }) => r.searchInvoked === false).length, n: c.length }; }) };
assertEq('13 Oct found by name / recommended', [OCT.found, OCT.foundN, OCT.rec, OCT.recN], [30, 40, 0, 200]);

export const VER = '2026-11c';
const OUT = 'public/img/blog/2026-11';
const ART_PATH = 'docs/images/blog-art-2026-11.json';
const PLAN = JSON.parse(readFileSync('docs/images/blog-pages-2026-11.json', 'utf8'));

const C = { bg: '#050807', panel: '#070C0A', line: '#3A4440', green: '#4ADE80', greenDeep: '#0A2213', white: '#FFFFFF', grey: '#9CA3AF', red: '#F87171', stroke: '#6B7280' };
const font = readFileSync('scripts/fonts/Figtree-VF.ttf').toString('base64');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
@font-face{font-family:Fig;font-weight:300 900;src:url(data:font/ttf;base64,${font}) format('truetype')}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:${C.bg}}
body{font-family:Fig,sans-serif;color:${C.white}}
.card{position:relative;width:1200px;height:630px;padding:46px 56px 0;background-color:${C.bg};
  background-image:linear-gradient(#0E1512 1px,transparent 1px),linear-gradient(90deg,#0E1512 1px,transparent 1px);background-size:48px 48px;background-position:-1px -1px}
.kick{font-weight:700;font-size:16px;letter-spacing:.3em;color:${C.white};text-transform:uppercase}
.kick i{font-style:normal;color:${C.grey};padding:0 .5em}
.h{font-weight:900;font-size:62px;line-height:1.04;letter-spacing:-.025em;margin-top:16px;color:${C.white}}
.h .g{color:${C.green}}
.d{position:absolute;left:56px;right:56px;top:258px;height:262px;display:flex;align-items:center;justify-content:center}
.foot{position:absolute;left:0;right:0;bottom:0;height:78px;border-top:3px solid ${C.green};display:flex;align-items:center;justify-content:space-between;padding:0 56px;
  font-weight:700;font-size:15px;letter-spacing:.3em;color:${C.white};background:${C.bg}}
.lab{font-weight:700;font-size:15px;letter-spacing:.22em;text-transform:uppercase;color:${C.white}}
.sub{font-weight:600;font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:${C.grey}}
.box{border:2px solid ${C.line};border-radius:14px;background:${C.panel}}
.on{border-color:${C.green}}
.miss{border-color:${C.red}}
.row{display:flex;align-items:center;gap:14px}
.big{font-weight:900;letter-spacing:-.03em;line-height:1}
.split .h{width:600px}
.split .d{left:auto;right:56px;top:46px;bottom:96px;height:auto;width:500px}
`;

// ---------------------------------------------------------------- diagram vocabulary
const ARROW = (c = C.green) => `<svg width="38" height="22" viewBox="0 0 38 22" style="flex:none" aria-hidden="true"><path d="M2 11h30M24 3l8 8-8 8" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK = (c = C.green, s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="flex:none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CROSS = (s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="flex:none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="${C.red}" stroke-width="2"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="${C.red}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const QMARK = (s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="flex:none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="${C.white}" stroke-width="2"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.1" fill="${C.white}"/></svg>`;

type Step = { t: string; s?: string; st?: 'on' | 'miss' | 'q' | 'ok' };
const mark = (st?: Step['st']) => st === 'ok' || st === 'on' ? CHECK() : st === 'miss' ? CROSS() : st === 'q' ? QMARK() : '';
/** Boxes left to right with arrows. */
const flow = (steps: Step[], h = 150) => `<div class="row" style="width:100%;gap:12px">${steps.map((x, i) =>
  `${i ? ARROW(C.stroke) : ''}<div class="box ${x.st === 'on' || x.st === 'ok' ? 'on' : x.st === 'miss' ? 'miss' : ''}" style="flex:1;height:${h}px;padding:20px 18px;display:flex;flex-direction:column;justify-content:space-between">
    <div class="lab" style="font-size:${x.t.length > 16 ? 15 : 17}px;letter-spacing:.18em;line-height:1.35">${esc(x.t)}</div>
    <div class="row" style="justify-content:space-between;align-items:flex-end;gap:8px">${x.s ? `<div class="sub" style="font-size:14px;letter-spacing:.12em;line-height:1.35">${esc(x.s)}</div>` : '<span></span>'}${mark(x.st)}</div></div>`).join('')}</div>`;
/** Two stat panels, like the reference card. */
const stats = (a: { lab: string; val: string; sub: string; zero?: boolean }[]) => `<div class="row" style="width:100%;gap:24px">${a.map((x) =>
  `<div class="box ${x.zero ? 'miss' : 'on'}" style="flex:1;height:250px;padding:26px 28px;display:flex;flex-direction:column;justify-content:space-between">
    <div class="lab">${esc(x.lab)}</div>
    <div class="big" style="font-size:96px;color:${x.zero ? C.red : C.green}">${esc(x.val)}</div>
    <div class="sub">${esc(x.sub)}</div></div>`).join('')}</div>`;
/** Engine boxes in rows (the series diagram). */
const engineRows = (rows: { lab: string; names: string[]; hi?: string[] }[]) => `<div style="width:100%;display:flex;flex-direction:column;gap:18px">${rows.map((r) =>
  `<div class="row" style="gap:12px"><div class="sub" style="width:200px;flex:none;line-height:1.5;color:${C.grey}">${esc(r.lab)}</div><div style="width:3px;align-self:stretch;background:${C.green}"></div>
   ${r.names.map((n) => `<div class="box ${r.hi?.includes(n) ? 'on' : ''}" style="width:150px;height:92px;display:flex;align-items:center;justify-content:center"><span class="lab" style="font-size:14px;letter-spacing:.16em">${esc(n)}</span></div>`).join('')}</div>`).join('')}</div>`;
/** Chips in a wrap. */
const chips = (names: string[], hi: number[] = []) => `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;width:100%">${names.map((n, i) =>
  `<div class="box ${hi.includes(i) ? 'on' : ''}" style="padding:22px 26px;display:flex;align-items:center;gap:14px"><span class="big" style="font-size:24px;color:${C.green}">${i + 1}</span><span class="lab" style="font-size:15px">${esc(n)}</span></div>`).join('')}</div>`;
/** Monthly found-by-name bars plus the recommended zeros. */
const ledger = (compact = false) => {
  const H = compact ? 150 : 170;
  return `<div style="width:100%;display:flex;gap:22px;align-items:flex-end">
  <div style="width:${compact ? 150 : 210}px;flex:none;align-self:stretch;display:flex;flex-direction:column;justify-content:space-between;padding-bottom:4px">
    <div><div class="lab" style="color:${C.green}">Found by name</div><div class="sub" style="margin-top:6px;font-size:13px">N=40 each${MONTHS.some((m) => m.restated) ? ' · *restated' : ''}</div></div>
    <div><div class="lab" style="color:${C.red}">Recommended</div><div class="sub" style="margin-top:6px;font-size:13px">category answers</div></div></div>
  ${MONTHS.map((m) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px">
    <div class="big" style="font-size:30px">${m.pct}%</div>
    <div style="width:70%;height:${Math.round((H * m.pct) / 100)}px;background:${C.green};border-radius:6px 6px 0 0"></div>
    <div class="lab" style="font-size:14px">${m.m.toUpperCase()}${m.restated ? '*' : ''}</div>
    <div class="big" style="font-size:24px;color:${C.red}">${m.cat} of ${m.catN}</div></div>`).join('')}</div>`;
};
/** A centre box linked to satellites. */
const hub = (center: string, sats: string[], note: string) => `<div style="width:100%;display:flex;align-items:center;gap:0">
  <div class="box on" style="width:300px;flex:none;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px"><div class="lab" style="color:${C.green}">${esc(center)}</div><div class="sub" style="font-size:13px">${esc(note)}</div></div>
  <svg width="120" height="230" viewBox="0 0 120 230" style="flex:none" aria-hidden="true">${sats.map((_, i) => { const y = 25 + (i * 180) / Math.max(1, sats.length - 1); return `<path d="M0 115C60 115 60 ${y} 120 ${y}" fill="none" stroke="${C.green}" stroke-width="2.5"/>`; }).join('')}</svg>
  <div style="flex:1;display:flex;flex-direction:column;gap:${sats.length > 3 ? 10 : 16}px">${sats.map((s) => `<div class="box row" style="height:${sats.length > 3 ? 44 : 58}px;padding:0 20px;justify-content:space-between"><span class="lab" style="font-size:14px">${esc(s)}</span>${CHECK(C.green, 22)}</div>`).join('')}</div></div>`;
/** Two panels: what the answer says versus what the site says. */
const versus = (a: { lab: string; q: string; note: string; bad?: boolean }, b: { lab: string; q: string; note: string }) => `<div class="row" style="width:100%;gap:20px;align-items:stretch">
  ${[a, b].map((x, i) => `<div class="box ${i === 0 && a.bad ? 'miss' : 'on'}" style="flex:1;height:240px;padding:24px 26px;display:flex;flex-direction:column;justify-content:space-between">
    <div class="row" style="justify-content:space-between"><span class="lab">${esc(x.lab)}</span>${i === 0 && a.bad ? CROSS() : CHECK()}</div>
    <div style="font-weight:800;font-size:${x.q.length > 50 ? 25 : 32}px;line-height:1.2;color:${C.white}">“${esc(x.q)}”</div>
    <div class="sub" style="font-size:13px">${esc(x.note)}</div></div>`).join('')}</div>`;
/** A labelled checklist. */
const list = (items: string[], cols = 1) => `<div style="width:100%;display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px 20px">${items.map((t) =>
  `<div class="box row" style="height:56px;padding:0 20px;gap:14px">${CHECK(C.green, 24)}<span class="lab" style="font-size:14px;letter-spacing:.14em">${esc(t)}</span></div>`).join('')}</div>`;
/** One dot versus a grid of dots. */
const oneVsMany = () => {
  const dots = Array.from({ length: 12 * 5 }, () => `<span style="width:16px;height:16px;border-radius:50%;background:${C.green};display:inline-block"></span>`).join('');
  return `<div class="row" style="width:100%;gap:28px;align-items:stretch">
  <div class="box" style="width:300px;flex:none;height:240px;padding:24px;display:flex;flex-direction:column;justify-content:space-between"><div class="lab">One question</div>
    <div style="display:flex;justify-content:center"><span style="width:16px;height:16px;border-radius:50%;background:${C.white};display:inline-block"></span></div><div class="sub" style="font-size:13px">One answer, one time</div></div>
  <div class="box on" style="flex:1;height:240px;padding:24px;display:flex;flex-direction:column;justify-content:space-between"><div class="lab" style="color:${C.green}">A measurement</div>
    <div style="display:grid;grid-template-columns:repeat(12,16px);gap:12px 22px;justify-content:center">${dots}</div><div class="sub" style="font-size:13px">Many questions · every engine · several runs</div></div></div>`;
};
/** Question box over an answer list. */
const answer = (q: string, rows: { t: string; st?: Step['st'] }[]) => `<div style="width:100%;display:flex;flex-direction:column;gap:14px">
  <div class="box row" style="height:64px;padding:0 22px;gap:16px"><span class="sub">Buyer asks</span><span style="font-weight:700;font-size:22px">${esc(q)}</span></div>
  <div class="row" style="gap:14px">${rows.map((r) => `<div class="box ${r.st === 'miss' ? 'miss' : r.st === 'q' ? '' : ''}" style="flex:1;height:120px;padding:18px 20px;display:flex;flex-direction:column;justify-content:space-between${r.st === 'q' ? `;border-style:dashed;border-color:${C.white}` : ''}">
    <span class="lab" style="font-size:14px">${esc(r.t)}</span><div style="display:flex;justify-content:flex-end">${mark(r.st)}</div></div>`).join('')}</div></div>`;
const loop = (steps: string[]) => `<div style="width:100%;position:relative;height:240px">
  <div class="row" style="gap:12px;height:150px">${steps.map((t, i) => `${i ? ARROW() : ''}<div class="box on" style="flex:1;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px"><span class="big" style="font-size:40px;color:${C.green}">${i + 1}</span><span class="lab">${esc(t)}</span></div>`).join('')}</div>
  <svg width="1088" height="90" viewBox="0 0 1088 90" style="position:absolute;left:0;top:150px" aria-hidden="true"><path d="M940 4V50H148V12" fill="none" stroke="${C.green}" stroke-width="3"/><path d="M138 22l10-14 10 14" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <div class="sub" style="position:absolute;left:0;right:0;top:212px;text-align:center">Every month, the same questions, the same way</div></div>`;

// ---------------------------------------------------------------- the cards
type Card = { key: string; kicker: string; h1: string; h2?: string; layout?: 'stack' | 'split'; d: string; alt: string; out?: string };
const KICK: Record<string, string> = { 'Start here': 'Start here', 'How to': 'How to', 'The Honest-Zero ledger': 'The Honest Zero', 'Buyer series': 'Buyer series', 'Behind the scenes': 'Behind the scenes' };
const sec = (path: string) => KICK[PLAN.pages.find((p: { path: string }) => p.path === path)?.section] || 'Field notes';
const nov = MONTHS[MONTHS.length - 1];
const ledgerAlt = `A bar chart of our own monthly measurement: found by name ${MONTHS.map((m) => `${m.pct}% in ${m.long}`).join(', ')} (N=40 each, August restated), and recommended in ${nov.cat} of ${nov.catN} category answers every month.`;
if (quoteHits !== claudeBy.length) throw new Error('said-vs-site quote count changed');

const CARDS: Card[] = [
  { key: '/aeo-buyers-guide', kicker: sec('/aeo-buyers-guide'), h1: 'Three short reads', h2: 'before you buy.',
    d: flow([{ t: 'What it should do', s: 'Read 1', st: 'on' }, { t: 'What to require', s: 'Read 2' }, { t: 'How to compare', s: 'Read 3' }]),
    alt: 'Three boxes in order: what an AEO tool should do, what to require, how to compare the market.' },
  { key: '/what-should-an-aeo-tool-do', kicker: sec('/what-should-an-aeo-tool-do'), h1: 'A mention is not a citation.', h2: 'A citation is not a recommendation.',
    d: flow([{ t: 'Mentioned', s: 'Your name appears' }, { t: 'Cited', s: 'Your page is a source' }, { t: 'Recommended', s: 'You are the answer', st: 'on' }]),
    alt: 'Three boxes in a row: mentioned, cited, recommended, with recommended highlighted.' },
  { key: '/blog/why-ai-doesnt-mention-you', kicker: sec('/blog/why-ai-doesnt-mention-you'), h1: 'Three gates, in order.', h2: 'Check the first one first.',
    d: flow([{ t: 'In the index', s: 'Gate 1 · check first', st: 'on' }, { t: 'Retrieved', s: 'Gate 2' }, { t: 'Cited', s: 'Gate 3' }]),
    alt: 'Three gates in order, in the index, retrieved and cited, with the first highlighted as the one to check first.' },
  { key: '/monitor-brand-in-chatgpt-and-claude', kicker: sec('/monitor-brand-in-chatgpt-and-claude'), h1: 'Ask the buyer’s question.', h2: 'Store every answer.',
    d: flow([{ t: 'Buyer question', s: 'Web search on' }, { t: 'ChatGPT · Claude', s: 'Several runs each' }, { t: 'Score it', s: 'By name · recommended' }, { t: 'Stored answer', s: 'Every month', st: 'on' }]),
    alt: 'Four boxes in order: the buyer question with web search on, ChatGPT and Claude asked several times each, scored for found by name and recommended, and the stored answer.' },
  { key: '/track-brand-mentions-across-ai-answer-engines', kicker: sec('/track-brand-mentions-across-ai-answer-engines'), h1: 'Count found by name', h2: 'and recommended, separately.',
    d: stats([{ lab: 'Found by name', val: `${nov.pct}%`, sub: `${nov.long} 2026 · N=${nov.n}` }, { lab: 'Recommended', val: `${nov.cat} of ${nov.catN}`, sub: `Category answers · ${nov.long} 2026`, zero: nov.cat === 0 }]),
    alt: `Two panels from our own ${nov.long} 2026 measurement: found by name ${nov.pct}% (N=${nov.n}); recommended in ${nov.cat} of ${nov.catN} category answers.` },
  { key: '/score-pages-for-answer-engine-readiness', kicker: sec('/score-pages-for-answer-engine-readiness'), h1: 'Can an engine reach it,', h2: 'read it and attribute it?',
    d: flow([{ t: 'Reach', s: 'Crawler access · index', st: 'ok' }, { t: 'Read', s: 'Answerable content', st: 'ok' }, { t: 'Attribute', s: 'Structured data', st: 'ok' }]),
    alt: 'Three checks in order: reach (crawler access and index), read (answerable content), attribute (structured data).' },
  { key: '/diagnose-dropped-out-of-perplexity-citations', kicker: sec('/diagnose-dropped-out-of-perplexity-citations'), h1: 'Dropped out of the citations?', h2: 'Check access first.',
    d: flow([{ t: 'Crawler access', s: 'Step 1', st: 'on' }, { t: 'Ask again', s: 'Step 2 · several runs' }, { t: 'Compare sources', s: 'Step 3' }, { t: 'Check what it says', s: 'Step 4' }]),
    alt: 'Four steps in order: crawler access, ask the same questions again with several runs, compare the sources cited now, check what the engine says about you.' },
  { key: '/ai-answers-get-facts-wrong-about-my-brand', kicker: sec('/ai-answers-get-facts-wrong-about-my-brand'), h1: 'Check the answer', h2: 'against your own site.',
    d: versus({ lab: 'Claude said', q: `An ${QUOTE}`, note: `Claude · ${quoteHits} of ${claudeBy.length} by-name answers · Nov 2026`, bad: true }, { lab: 'Our site says', q: SHORT, note: 'Our published description' }),
    alt: `Two panels from our own measurement: Claude’s answer, “an ${QUOTE}” in ${quoteHits} of ${claudeBy.length} by-name answers in November 2026, marked as a miss, beside our site’s own description, “${SHORT.replace(/\.$/, '')}”.` },
  { key: '/competitive-prompt-benchmarking', kicker: sec('/competitive-prompt-benchmarking'), h1: 'Who gets named', h2: 'instead of you?',
    d: flow([{ t: 'Buyer prompts', s: 'Your category' }, { t: 'Every engine', s: 'Several runs' }, { t: 'Named instead', s: 'Who · how often' }, { t: 'From which sources', s: 'Cited pages', st: 'on' }]),
    alt: 'Four boxes in order: buyer prompts, every engine with several runs, who is named instead and how often, and the sources behind it.' },
  { key: '/guides/directory-listings', kicker: sec('/guides/directory-listings'), h1: 'One description,', h2: 'word for word, everywhere.',
    d: hub('One description', ['Directory listing', 'Review site profile', 'Business profile'], 'Pasted, not rewritten'),
    alt: 'One description box linked to a directory listing, a review site profile and a business profile, each with a check mark.' },
  { key: '/guides/wikidata', kicker: sec('/guides/wikidata'), h1: 'One entity.', h2: 'Every statement sourced.',
    d: hub('Wikidata item', ['Your website', 'Official name', 'Founded date', 'Each with a source'], 'Search first, then create'),
    alt: 'A Wikidata item box linked to your website, your official name and your founded date, each with a source.' },
  { key: '/evidence', kicker: sec('/evidence'), h1: 'Our own numbers,', h2: 'every month, whatever they say.', d: ledger(),
    alt: ledgerAlt },
  { key: '/blog/found-not-recommended', kicker: sec('/blog/found-not-recommended'), h1: 'Found by name.', h2: 'Not recommended.',
    d: stats([{ lab: 'Found by name', val: `${nov.pct}%`, sub: `${nov.long} 2026 · N=${nov.n}` }, { lab: 'Recommended', val: `${nov.cat} of ${nov.catN}`, sub: 'Category answers · every month', zero: nov.cat === 0 }]),
    alt: `Two panels from our own measurement: found by name ${nov.pct}% in ${nov.long} 2026 (N=${nov.n}); recommended in ${nov.cat} of ${nov.catN} category answers, every month.` },
  { key: '/blog/i-scored-zero', kicker: sec('/blog/i-scored-zero'), h1: 'I ran my own tool', h2: 'on my own site. Zero.', d: ledger(),
    alt: ledgerAlt },
  { key: '/blog/reading-isnt-citing', kicker: sec('/blog/reading-isnt-citing'), h1: 'Being read', h2: 'is not being cited.',
    d: flow([{ t: 'Crawler fetched the page', s: 'Read', st: 'ok' }, { t: 'Answer cited the page', s: 'Cited', st: 'miss' }], 170),
    alt: 'Two boxes: the crawler fetched the page, marked done; the answer cited the page, marked as a miss.' },
  { key: '/blog/the-fifth-engine', kicker: sec('/blog/the-fifth-engine'), h1: 'A new engine', h2: 'starts a new series.',
    d: engineRows([{ lab: 'Series of record', names: V11 }, { lab: 'New series', names: V12, hi: EXTRA }]),
    alt: `Two rows of engines: the series of record (${V11.join(', ')}) and the new series, which adds ${EXTRA.join(', ')} (${V12.join(', ')}), with ${EXTRA.join(', ')} highlighted.` },
  { key: '/blog/the-measurement-layer', kicker: sec('/blog/the-measurement-layer'), h1: 'Three layers,', h2: 'each with its own fix.',
    d: flow([{ t: 'Retrievability', s: 'Can it find you' }, { t: 'Fidelity', s: 'Does it say it right' }, { t: 'Citation win', s: 'Does it pick you', st: 'on' }]),
    alt: 'Three layers in a row: retrievability, fidelity, citation win.' },
  { key: '/blog/one-question-is-not-a-measurement', kicker: sec('/blog/one-question-is-not-a-measurement'), h1: 'One question', h2: 'is not a measurement.', d: oneVsMany(),
    alt: 'One question shown as a single dot, next to a measurement shown as a grid of dots: many questions, every engine, several runs.' },
  { key: '/aeo-buyers-standard', kicker: sec('/aeo-buyers-standard'), h1: 'Seven requirements.', h2: 'Ask every vendor, us included.',
    d: chips(['Observe', 'Diagnose', 'Remediate', 'Verify', 'Receipts', 'Scale', 'Economics']),
    alt: 'Seven numbered requirements: observe, diagnose, remediate, verify, receipts, scale, economics.' },
  { key: '/best-aeo-tools', kicker: sec('/best-aeo-tools'), h1: 'Judge every AEO tool', h2: 'on the same seven tests.',
    d: chips(['Observe', 'Diagnose', 'Remediate', 'Verify', 'Receipts', 'Scale', 'Economics']),
    alt: 'Seven numbered tests for comparing AEO tools: observe, diagnose, remediate, verify, receipts, scale, economics.' },
  { key: '/blog/how-it-works', kicker: sec('/blog/how-it-works'), h1: 'Ask the engines.', h2: 'Keep every transcript.',
    d: flow([{ t: 'Your site', s: 'Read first' }, { t: 'Your questions', s: 'Three kinds' }, { t: 'The engines', s: 'Several runs' }, { t: 'Three layers', s: 'Scored' }, { t: 'Transcripts', s: 'Kept', st: 'on' }], 140),
    alt: 'The pipeline in five boxes: your site, your questions, the engines asked several times, three layers scored, transcripts kept.' },
  { key: '/blog/what-you-actually-get', kicker: sec('/blog/what-you-actually-get'), h1: 'Every sweep ends', h2: 'in your next steps.',
    d: list(['Paste-in schema', 'Fidelity corrections', 'Off-site plan from real citations', 'Questions to win', 'Proof on the next sweep', 'Every answer stored'], 2),
    alt: 'A checklist: paste-in schema, fidelity corrections, an off-site plan from real citations, questions to win, proof on the next sweep, every answer stored.' },
  { key: '/blog/are-you-the-answer-ai-gives', kicker: sec('/blog/are-you-the-answer-ai-gives'), h1: 'One answer:', h2: 'you or a competitor.',
    d: answer('Which is the best in my category?', [{ t: 'A competitor' }, { t: 'Another competitor' }, { t: 'You?', st: 'q' }]),
    alt: 'A buyer asks which is the best in their category, and the answer lists a competitor, another competitor and a dashed box asking whether it is you.' },
  { key: '/get-recommended', kicker: sec('/get-recommended'), h1: 'Measure. Act.', h2: 'Record.', d: loop(['Measure', 'Act', 'Record']),
    alt: 'A loop of three steps: measure, act, record, then back to measure every month with the same questions.' },
  { key: '/blog/how-to', kicker: sec('/blog/how-to'), h1: 'How-to guides', h2: 'for answer engine visibility.',
    d: list(['Monitor your brand', 'Track mentions', 'Score page readiness', 'Diagnose a drop', 'Directory listings', 'Wikidata entry'], 2),
    alt: 'A checklist of guides: monitor your brand, track mentions, score page readiness, diagnose a drop, directory listings, Wikidata entry.' },
  // In-post images of /blog/the-measurement-layer (were model-drawn with placeholder bars).
  { key: 'embed', out: '/images/blog/hero-the-measurement-layer', kicker: 'Buyer series', h1: 'The engines are already describing you.', h2: 'Read the transcript.',
    d: `<div style="width:100%;display:flex;flex-direction:column;gap:12px">
      <div class="row" style="gap:12px">${OCT.searched.map((e) => `<div class="box ${e.m ? '' : 'on'}" style="flex:1;height:150px;padding:18px 20px;display:flex;flex-direction:column;justify-content:space-between">
        <span class="lab">${esc(e.name)}</span>
        <div><div class="row" style="justify-content:space-between"><span class="sub">Searched</span><span class="big" style="font-size:28px;color:${C.green}">${e.s}</span></div>
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="sub">From memory</span><span class="big" style="font-size:28px">${e.m}</span></div></div></div>`).join('')}</div>
      <div class="sub" style="text-align:center">Category answers per engine · 13 October 2026 · every transcript stored</div></div>`,
    alt: `Category answers per engine on 13 October 2026, searched versus answered from memory: ${OCT.searched.map((e) => `${e.name} ${e.s} searched, ${e.m} from memory (of ${e.n})`).join('; ')}. Every transcript stored.` },
  { key: 'embed', out: '/images/blog/embed-recognized-not-recommended', kicker: 'Buyer series', h1: 'Being recognized is not', h2: 'being recommended.',
    d: stats([{ lab: 'Found by name', val: `${Math.round((100 * OCT.found) / OCT.foundN)}%`, sub: `${OCT.found} of ${OCT.foundN} answers · 13 Oct 2026` }, { lab: 'Recommended', val: `${OCT.rec} of ${OCT.recN}`, sub: 'Category answers · 13 Oct 2026', zero: OCT.rec === 0 }]),
    alt: `Asked by name: found in ${OCT.found} of ${OCT.foundN} answers (${Math.round((100 * OCT.found) / OCT.foundN)}%). Asked by category: recommended in ${OCT.rec} of ${OCT.recN} answers. 13 October 2026.` },
  { key: 'embed', out: '/images/blog/embed-measurement-architecture', kicker: 'Measurement', h1: 'One score is not a measurement.', h2: 'The evidence tells you what to fix.',
    d: `<div class="row" style="width:100%;gap:12px;align-items:center">${[['1 · Inputs', ['Buyer questions', 'Engine panel', 'Repeated runs']], ['2 · Evidence', ['Transcripts', 'Searched or memory', 'Cited sources', 'Sample and drift']], ['3 · Diagnosis', ['Missing mentions', 'Source gaps', 'Priority actions']]].map(([t, items], i) =>
      `${i ? ARROW() : ''}<div class="box ${i === 2 ? 'on' : ''}" style="flex:1;height:220px;padding:20px 22px;display:flex;flex-direction:column;justify-content:center;gap:12px"><span class="lab" style="color:${C.green}">${t}</span>${(items as string[]).map((x) => `<div class="row" style="gap:10px">${CHECK(C.green, 20)}<span class="lab" style="font-size:14px;letter-spacing:.14em">${esc(x)}</span></div>`).join('')}</div>`).join('')}</div>`,
    alt: 'Inputs (buyer questions, engine panel, repeated runs) produce evidence (transcripts, searched or from memory, cited sources, sample and drift), which produces the diagnosis (missing mentions, source gaps, priority actions).' },
  // Shared cards (no post hero).
  { key: 'home', kicker: 'The Honest Zero', h1: 'Found by name', h2: 'is not recommended.',
    d: flow([{ t: 'Asked by name', s: 'Do they find you?', st: 'ok' }, { t: 'Asked by category', s: 'Do they recommend you?', st: 'q' }], 170),
    alt: 'Two boxes: asked by name, do the engines find you; asked by category, do they recommend you.' },
  { key: 'blog', kicker: 'Field notes', h1: 'Our own numbers,', h2: 'published whatever they say.', d: ledger(),
    alt: ledgerAlt },
];

/** The diagram description must be one sentence (quoted text and decimals ignored). */
const oneSentence = (t: string) => (t.replace(/“[^”]*”/g, 'Q').replace(/\d\.\d/g, '0').match(/[.!?](\s|$)/g) || []).length === 1;
for (const c of CARDS) if (!c.out && !oneSentence(c.alt)) throw new Error(`${c.key}: the diagram description must be one sentence: ${c.alt}`);
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

const html = (c: Card) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="card ${c.layout || 'stack'}" id="card">
  <div class="kick">AEO Analyzers<i>·</i>${esc(c.kicker)}</div>
  <div class="h" id="h">${esc(c.h1)}${c.h2 ? `<br><span class="g">${esc(c.h2)}</span>` : ''}</div>
  <div class="d">${c.d}</div>
  <div class="foot"><span>AEO ANALYZERS</span><span>AEOANALYZERS.COM</span></div>
</div></body></html>`;

/** Shrink the headline until it is two lines at most and clears the diagram. */
const fit = (p: import('puppeteer-core').Page) => p.evaluate(() => { const h = document.getElementById('h')!; let s = 62; while ((h.getBoundingClientRect().height > s * 1.04 * 2 + 4 || h.getBoundingClientRect().bottom > 250) && s > 40) { s -= 2; h.style.fontSize = s + 'px'; } });

const CHECKS = () => {
  const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
  const bgOf = (el: Element | null): number[] => { while (el) { const b = parse(getComputedStyle(el).backgroundColor); if (b.length >= 3 && (b[3] ?? 1) > 0) return b; el = el.parentElement; } return [5, 8, 7]; };
  const bad: string[] = []; let n = 0;
  document.querySelectorAll('#card *').forEach((el) => {
    if (el.closest('svg')) return;
    const own = [...el.childNodes].filter((x) => x.nodeType === 3 && x.textContent!.trim()).map((x) => x.textContent!.trim()).join(' ');
    if (!own) return; n++;
    const a = lum(parse(getComputedStyle(el).color)), b = lum(bgOf(el));
    const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (r < 7) bad.push(`${r.toFixed(2)} "${own.slice(0, 30)}"`);
    const h = el as HTMLElement; const rect = h.getBoundingClientRect();
    if (h.scrollWidth > h.clientWidth + 1 && h.children.length === 0 && h.clientWidth > 0) bad.push(`overflow "${own.slice(0, 30)}"`);
    if (rect.right > 1200.5 || rect.bottom > 630.5) bad.push(`outside "${own.slice(0, 30)}"`);
  });
  const hb = document.getElementById('h')!.getBoundingClientRect(); const db = (document.querySelector('.d') as HTMLElement).getBoundingClientRect();
  const kids = [...document.querySelectorAll('.d > *')].map((e) => e.getBoundingClientRect());
  if ((document.querySelector('.card') as HTMLElement).classList.contains('stack') && hb.bottom > db.top - 8) bad.push(`headline runs into the diagram (${Math.round(hb.bottom)} > ${Math.round(db.top - 8)})`);
  for (const k of kids) if (k.bottom > 630 - 78 - 6 || k.top < db.top - 1) bad.push('diagram outside its area');
  return { n, bad };
};

(async () => {
  const only = process.argv.slice(2);
  const art = JSON.parse(readFileSync(ART_PATH, 'utf8'));
  const b = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  const p = await b.newPage();
  for (const c of CARDS) {
    if (c.out) {
      const name = c.out.split('/').pop()!;
      if (only.length && !only.includes(name)) continue;
      await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 4 / 3 });
      await p.setContent(html(c), { waitUntil: 'load' });
      await p.evaluate('globalThis.__name = (f) => f');
      await p.evaluate(() => (document as any).fonts.ready);
      await fit(p);
      const chk = await p.evaluate(CHECKS);
      if (chk.bad.length) throw new Error(`${name}: ${chk.bad.join('; ')}`);
      const file = `${c.out}-${VER}.webp`;
      writeFileSync(`public${file}`, await p.screenshot({ type: 'webp', quality: 88 }));
      art._embeds = { ...(art._embeds || {}), [name]: { file, w: 1600, h: 840, alt: `${c.h1} ${c.h2} ${c.alt}` } };
      console.log(`${name}: ${file} (${chk.n} text elements >= 7:1)`);
      continue;
    }
    const slug = c.key === 'home' ? 'home' : c.key === 'blog' ? 'blog' : art[c.key]?.slug;
    if (!slug) throw new Error(`no art entry for ${c.key}`);
    if (only.length && !only.includes(slug)) continue;
    await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await p.setContent(html(c), { waitUntil: 'load' });
    await p.evaluate('globalThis.__name = (f) => f'); // esbuild keepNames helper inside evaluated functions
    await p.evaluate(() => (document as any).fonts.ready);
    // Fit the headline: shrink until it is two lines at most and clears the diagram.
    await fit(p);
    const chk = await p.evaluate(CHECKS);
    if (chk.bad.length) throw new Error(`${slug}: ${chk.bad.join('; ')}`);
    const og = c.key === 'home' ? `/og-home-${VER}.jpg` : `/img/blog/2026-11/og-${slug}-${VER}.jpg`;
    const ogBuf = Buffer.from(await p.screenshot({ type: 'jpeg', quality: 90 }));
    writeFileSync(`public${og}`, ogBuf);
    const alt = `${c.h1}${c.h2 ? ` ${c.h2}` : ''} ${c.alt}`;
    if (c.key === 'home' || c.key === 'blog') { console.log(`${slug}: ${og} (${chk.n} text elements >= 7:1)`); art[`_${c.key}`] = { og, ogW: 1200, ogH: 630, ogAlt: `AEO Analyzers: ${alt}` }; continue; }
    await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 4 / 3 });
    await p.setContent(html(c), { waitUntil: 'load' });
    await p.evaluate('globalThis.__name = (f) => f'); // esbuild keepNames helper inside evaluated functions
    await p.evaluate(() => (document as any).fonts.ready);
    await fit(p);
    const hero = `/img/blog/2026-11/${slug}-hero-${VER}.webp`;
    const heroBuf = Buffer.from(await p.screenshot({ type: 'webp', quality: 88 }));
    writeFileSync(`public${hero}`, heroBuf);
    // One card, two renders: the post's first image and its og:image. The fingerprints let a test
    // prove both files came from this same card source (src/__tests__/shareCardHero.test.ts).
    const headline = `${c.h1}${c.h2 ? ` ${c.h2}` : ''}`;
    Object.assign(art[c.key], { hero, heroW: 1600, heroH: 840, heroAlt: alt, og, ogW: 1200, ogH: 630, ogAlt: `AEO Analyzers: ${alt}`,
      card: { source: 'scripts/build-share-cards.ts', key: c.key, headline, srcSha: sha(html(c)), ogSha: sha(ogBuf), heroSha: sha(heroBuf) } });
    console.log(`${slug}: ${og} + hero (${chk.n} text elements >= 7:1)`);
  }
  await b.close();
  writeFileSync(ART_PATH, JSON.stringify(art, null, 1) + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
