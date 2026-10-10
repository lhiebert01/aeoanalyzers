// WO-AEO-POSITION-AND-PANEL-006 Item B + C — which engines produced a number, and under what conditions.
//
// Panel v1.1 (four engines) is the series of record and never changes. Panel v1.2 adds Grok and starts
// its own series at its own day-0. A delta is only ever computed between sweeps on the SAME panel: the
// 8 September ruling — a changed panel makes any shift ambiguous between the engines and the day.
//
// Not covered by any panel, and not faked: Microsoft Copilot (no public API for its grounded answers),
// Google AI Overviews and AI Mode (SERP features, not endpoints; the Gemini API is a different product).

export type PanelVersion = 'v1.1' | 'v1.2';
export const PANELS: Record<PanelVersion, { engines: string[]; note: string }> = {
  'v1.1': { engines: ['openai', 'claude', 'perplexity', 'gemini'], note: 'the series of record since August 2026' },
  'v1.2': { engines: ['openai', 'claude', 'perplexity', 'gemini', 'grok'], note: 'v1.1 plus Grok, its own series from its own first date' },
};
export const DEFAULT_PANEL: PanelVersion = 'v1.1';
const LABEL: Record<string, string> = { openai: 'ChatGPT', claude: 'Claude', perplexity: 'Perplexity', gemini: 'Gemini', grok: 'Grok' };

/** The panel a stored sweep ran on. Rows written before the field existed are inferred from their engines. */
export function panelOf(summary: { panel?: { version?: string } | null; engines?: { engine: string }[] } | null | undefined): PanelVersion {
  const v = summary?.panel?.version;
  if (v === 'v1.1' || v === 'v1.2') return v;
  return (summary?.engines || []).some((e) => e.engine === 'grok') ? 'v1.2' : 'v1.1';
}

/** Measured, not assumed: the September 2026 run where a fourth engine was added to the SAME runs
 *  moved category recommendation by −14.0 points (run-to-run drift on the same three engines: −0.9). */
export const PANEL_EFFECT_POINTS = 14;

/** The disclosure line on every result and export. */
export function panelDisclosure(version: PanelVersion, enginesRun?: string[]): string {
  const engines = (enginesRun && enginesRun.length ? enginesRun : PANELS[version].engines).map((e) => LABEL[e] || e);
  const list = engines.length > 1 ? `${engines.slice(0, -1).join(', ')} and ${engines[engines.length - 1]}` : engines[0];
  const missing = version === 'v1.1' ? 'Grok, Microsoft Copilot and Google AI Overviews' : 'Microsoft Copilot and Google AI Overviews';
  return `Measured on ${list} (panel ${version}). Not covered: ${missing}. A different set of engines gives a different number — in our own September 2026 measurement, adding one engine to the same runs moved the category figure by ${PANEL_EFFECT_POINTS} points.`;
}

// ── Item C: test conditions ──
export interface TestConditions { location: string | null }
export const NO_PERSONALIZATION = 'Every question is asked through each engine’s API with web search on — no account, no chat history and no memory, so nothing a past conversation taught the engine can shape the answer.';
export function locationCondition(location: string | null): string {
  return location
    ? `Location: the country is named inside each buyer question (“${location}”), not left to account or device settings.`
    : 'Location: no country is named in the questions and no location is sent with the call, so each engine answers from its own default.';
}
export function testConditionsLines(c: TestConditions): string[] {
  return [NO_PERSONALIZATION, locationCondition(c.location)];
}

/** Name the country inside a buyer question, once. Branded questions are left alone. */
export function withLocation(question: string, location: string | null): string {
  if (!location) return question;
  if (new RegExp(`\\b${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(question)) return question;
  return `${question.replace(/[?.\s]+$/, '')} in ${location}`;
}
