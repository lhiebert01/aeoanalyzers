// WO-QA-003 E2 — Fact-density / information-gain page auditor.
//
// The Princeton GEO study (arXiv:2311.09735, SIGKDD 2024) measured which on-page
// content changes move answer-engine citation visibility. Their proven levers:
//   • Statistics Addition  — verifiable numbers/percentages/dates  (~+41%)
//   • Quotation Addition   — named-expert quotations               (~+28–40%)
//   • Cite Sources         — inline authoritative citations        (~+115% for lower-ranked pages)
//   • Keyword Stuffing     — repeating target terms                (~−10%, it HURTS)
// This auditor scores a page on those four levers so the Fixes report can flag gaps
// with published evidence instead of opinion.
//
// FRAMING RULE (Lane E): every consequence line is a STUDY ASSOCIATION, never a
// promise ("in the Princeton GEO study, … was associated with …", not "you will…").
//
// Deterministic + self-contained (no intra-lib imports).

export interface FactDensityFlag {
  key: 'statistics' | 'quotations' | 'inline-citations' | 'keyword-stuffing';
  consequence: string; // consequences-not-directives, cites the study
}

export interface FactDensityAudit {
  words: number;
  statCount: number;
  statDensityPer100: number;      // verifiable data points per 100 words
  quotationCount: number;
  inlineCitationCount: number;
  keywordStuffing: boolean;
  flags: FactDensityFlag[];
}

const STUDY = 'the Princeton GEO study (arXiv:2311.09735)';

/** Strip HTML to visible text (drops script/style/tags). Pass plain text through. */
function toText(input: string): string {
  return String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['the', 'and', 'for', 'you', 'your', 'with', 'that', 'this', 'are', 'our', 'from', 'has', 'have', 'was', 'were', 'can', 'will', 'not', 'but', 'all', 'any', 'how', 'what', 'who', 'why', 'when', 'where', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'it', 'as', 'at', 'by', 'or', 'be', 'we', 'us']);

/** Count verifiable data points: percentages, currency, dates/years, and multi-digit
 *  numbers — the "statistics" the study rewards. */
function countStats(text: string): number {
  let n = 0;
  n += (text.match(/\b\d+(?:\.\d+)?\s?%/g) || []).length;         // percentages
  n += (text.match(/[$€£]\s?\d[\d,]*/g) || []).length;            // currency
  n += (text.match(/\b(?:19|20)\d{2}\b/g) || []).length;          // years
  n += (text.match(/\b\d[\d,]*(?:\.\d+)?\s?(?:x|×|k|m|bn|million|billion|hours?|minutes?|seconds?|days?|users?|customers?)\b/gi) || []).length; // quantified units
  return n;
}

/** Named-expert quotations: a substantial quoted span OR an attribution phrase. */
function countQuotations(text: string): number {
  const quoted = text.match(/["“][^"”]{20,}["”]/g) || [];
  const attributed = text.match(/\baccording to\b|\b(?:said|says|reports|noted|explains|writes)\b/gi) || [];
  return quoted.length + attributed.length;
}

/** Inline authoritative citations: outbound links in HTML, or bare URLs in text. */
function countInlineCitations(html: string): number {
  const links = html.match(/<a\b[^>]*href=["']https?:\/\/[^"']+["']/gi) || [];
  if (links.length) return links.length;
  return (String(html || '').match(/https?:\/\/[^\s"'<>]+/g) || []).length;
}

/** Keyword-stuffing signal: a single non-stopword token dominating the copy. */
function detectKeywordStuffing(text: string): boolean {
  const tokens = (text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).filter((w) => !STOPWORDS.has(w));
  if (tokens.length < 40) return false;
  const freq: Record<string, number> = {};
  let max = 0;
  for (const w of tokens) { freq[w] = (freq[w] || 0) + 1; max = Math.max(max, freq[w]); }
  return max / tokens.length > 0.06 && max >= 12; // one term > 6% of content words
}

export function auditFactDensity(input: string): FactDensityAudit {
  const html = String(input || '');
  const text = toText(html);
  const words = (text.match(/\S+/g) || []).length;
  const statCount = countStats(text);
  const statDensityPer100 = words ? +(statCount / words * 100).toFixed(2) : 0;
  const quotationCount = countQuotations(text);
  const inlineCitationCount = countInlineCitations(html);
  const keywordStuffing = detectKeywordStuffing(text);

  const flags: FactDensityFlag[] = [];
  if (statDensityPer100 < 1) {
    flags.push({ key: 'statistics', consequence: `This page carries few verifiable statistics (${statCount} in ${words} words). In ${STUDY}, adding statistics was associated with a ~41% citation-visibility lift.` });
  }
  if (quotationCount === 0) {
    flags.push({ key: 'quotations', consequence: `No named-expert quotations were found. In ${STUDY}, adding quotations was associated with a ~28–40% lift.` });
  }
  if (inlineCitationCount < 2) {
    flags.push({ key: 'inline-citations', consequence: `Few inline authoritative citations (${inlineCitationCount}). In ${STUDY}, adding source citations was associated with up to a ~115% lift for lower-ranked pages.` });
  }
  if (keywordStuffing) {
    flags.push({ key: 'keyword-stuffing', consequence: `One term dominates the copy (a keyword-stuffing signal). In ${STUDY}, keyword stuffing was associated with a ~10% DECREASE in visibility.` });
  }

  return { words, statCount, statDensityPer100, quotationCount, inlineCitationCount, keywordStuffing, flags };
}

/** Name the fact-density gap between the client's page and a competitor's page the
 *  engines cite instead — the study-backed "why they win the answer" line. Null when
 *  the client is not clearly behind. */
export function compareFactDensity(
  client: FactDensityAudit,
  competitor: FactDensityAudit,
  competitorLabel: string
): string | null {
  const gaps: string[] = [];
  if (competitor.statDensityPer100 > client.statDensityPer100 + 0.5) gaps.push(`${competitorLabel} carries denser verifiable statistics (${competitor.statDensityPer100} vs ${client.statDensityPer100} per 100 words)`);
  if (competitor.quotationCount > client.quotationCount) gaps.push(`more named-expert quotations (${competitor.quotationCount} vs ${client.quotationCount})`);
  if (competitor.inlineCitationCount > client.inlineCitationCount) gaps.push(`more inline citations (${competitor.inlineCitationCount} vs ${client.inlineCitationCount})`);
  if (!gaps.length) return null;
  return `${competitorLabel} out-cites you on the levers ${STUDY} rewards: ${gaps.join('; ')}.`;
}
