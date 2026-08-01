// WO-1 answer-engine adapters (server-side only — API keys never reach the browser).
//
// Each adapter asks ONE answer engine a query WITH web search / browsing enabled,
// matching real-user conditions, and returns a normalized { transcript, sources,
// costUsd }. The citation/competitor scoring is done downstream by
// src/lib/citationSweep.ts (grounded, LLM-free) — these adapters only fetch the
// raw answer + its source URLs + a cost estimate.
//
// Keys (server env only, NO VITE_ prefix): ANTHROPIC_API_KEY, OPENAI_API_KEY,
// PERPLEXITY_API_KEY, GEMINI_API_KEY. A missing key throws MissingKeyError so the
// route can report exactly which engine is not yet configured instead of failing
// the whole sweep. Costs are ESTIMATES from token usage + a flat web-search fee.

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export type Engine = 'claude' | 'openai' | 'perplexity' | 'gemini';

export interface EngineAnswer {
  transcript: string;
  sources: string[];
  costUsd: number;
  model: string;
  /** True when the engine hit its output-token cap (finish_reason=length /
   *  stop_reason=max_tokens / MAX_TOKENS): the answer is CUT OFF, so it must be
   *  excluded from scored metrics downstream (WO-AEO-SWEEP-QA-003 A1). */
  truncated?: boolean;
  /** True when the engine ACTUALLY ran a web search for this answer (a search tool
   *  was invoked / grounding sources came back). False means a model-prior answer
   *  from weights alone — measures something different from a grounded citation, so
   *  it's kept out of the citation-win denominator downstream (WO-QA-003 A2). */
  searchInvoked?: boolean;
}

export class MissingKeyError extends Error {
  constructor(public envVar: string) {
    super(`${envVar} is not set`);
    this.name = 'MissingKeyError';
  }
}

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

// The sweep only measures WHO gets named/cited (scoring is grounded & LLM-free
// downstream) — it does NOT need a research essay. Instruct every engine to be
// brief and just name the tools/sites it would cite, and cap output tokens. This
// cuts output-token spend several-fold and shortens each call (helps the timeout),
// while keeping exactly the signal the sweep scores on.
const CONCISE_SYS =
  'You are a concise research assistant with web access. Answer in at most 3 short ' +
  'sentences. Name the specific products, tools, companies, or websites you would ' +
  'recommend or cite for this question, including their domains when you know them. ' +
  'Do not write an essay, background, disclaimers, or caveats — just the direct answer.';
// Per-engine output caps. The old single 400-token cap truncated grounded answers
// (esp. Gemini) mid-sentence — corrupting citation scoring on every column, not
// just Gemini's (WO-AEO-SWEEP-QA-003 A1). Each engine now gets a cap tuned to its
// grounded-answer verbosity, and each adapter reports whether the API actually hit
// that cap so truncated runs are excluded from scored metrics downstream. Override
// per engine with SWEEP_MAX_OUTPUT_TOKENS_<ENGINE>, or all with the legacy
// SWEEP_MAX_OUTPUT_TOKENS. Cost impact is a few tenths of a cent per sweep.
const cap = (engine: string, dflt: number) =>
  Number(process.env[`SWEEP_MAX_OUTPUT_TOKENS_${engine}`] || process.env.SWEEP_MAX_OUTPUT_TOKENS || dflt);
const MAX_OUT = {
  claude: cap('CLAUDE', 600),
  openai: cap('OPENAI', 600),
  perplexity: cap('PERPLEXITY', 700),
  // Gemini 3.x flash spends part of its output budget on internal reasoning before
  // the grounded answer, so 900 still truncated ~2 grounded answers/run (POLISH-002
  // B6). Raised to 2048 for comfortable headroom — Gemini is the cheapest engine
  // (~$0.001–0.002/run), so the extra tokens are negligible. The A1 truncation
  // exclusion/badging stays as the safety net regardless of this cap.
  gemini: cap('GEMINI', 2048),
};

// --- Anthropic / Claude (authoritative web_search_20260209 shape) ----------
async function askClaude(query: string): Promise<EngineAnswer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new MissingKeyError('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey: key });
  // Default to Haiku: the sweep only needs an engine that searches the web and
  // answers — it does NOT need Opus-tier reasoning. Opus made Claude cost ~20×
  // the other engines (Opus $5/$25 per MTok + web-search results billed back as
  // input tokens). Haiku is the COGS the sweep was actually priced against
  // (see run-sweep.ts COGS note). Override with SWEEP_CLAUDE_MODEL.
  const model = process.env.SWEEP_CLAUDE_MODEL || 'claude-haiku-4-5';
  // Model-aware web-search tool: the _20260209 dynamic-filtering variant is
  // Opus/Sonnet-tier only (400s on Haiku); the basic _20250305 works everywhere.
  // Pick per model so any SWEEP_CLAUDE_MODEL value works.
  const advancedSearch = /opus-4-8|opus-4-7|opus-4-6|sonnet-5|sonnet-4-6/.test(model);
  const searchType = advancedSearch ? 'web_search_20260209' : 'web_search_20250305';
  // Cap web-search uses to bound per-call cost (Claude is the cost driver; each
  // search injects large input token volume as billed input tokens). Branded
  // queries ("who is X" / "what is X") only need ONE lookup, so cap them at 1;
  // category queries get 2. Override the whole thing with SWEEP_MAX_SEARCHES.
  const isBranded = /^\s*(who|what)\s+is\s/i.test(query);
  const maxUses = Number(process.env.SWEEP_MAX_SEARCHES || (isBranded ? 1 : 2));
  const tools = [{ type: searchType, name: 'web_search' as const, max_uses: maxUses }];

  let messages: any[] = [{ role: 'user', content: query }];
  let resp: any = await client.messages.create({ model, max_tokens: MAX_OUT.claude, system: CONCISE_SYS, tools: tools as any, messages });
  let guard = 0;
  // Server-tool loops can pause; re-send to resume (skill: handling pause_turn).
  while (resp.stop_reason === 'pause_turn' && guard++ < 4) {
    messages = [{ role: 'user', content: query }, { role: 'assistant', content: resp.content }];
    resp = await client.messages.create({ model, max_tokens: MAX_OUT.claude, system: CONCISE_SYS, tools: tools as any, messages });
  }
  const truncated = resp.stop_reason === 'max_tokens';

  const transcript = (resp.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  const sources: string[] = [];
  for (const block of resp.content || []) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) if (r?.url) sources.push(r.url);
    }
  }

  const u = resp.usage || {};
  // Model-aware $/MTok (input, output) so the displayed cost matches the model
  // actually used — otherwise a Haiku run shows Opus prices (or vice-versa).
  const [priceIn, priceOut] = /opus/.test(model) ? [5, 25]
    : /sonnet/.test(model) ? [3, 15]
    : [1, 5]; // haiku 4.5
  const searchReqs = u.server_tool_use?.web_search_requests || 0;
  const searchInvoked = searchReqs > 0 || sources.length > 0;
  const costUsd =
    (u.input_tokens || 0) / 1e6 * priceIn +
    (u.output_tokens || 0) / 1e6 * priceOut +
    searchReqs * 0.01; // web search ~$10 / 1000 requests

  return { transcript, sources: uniq(sources), costUsd, model, truncated, searchInvoked };
}

// --- OpenAI (Responses API + web search). Verify shapes during QA. ----------
async function askOpenAI(query: string): Promise<EngineAnswer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new MissingKeyError('OPENAI_API_KEY');
  const client = new OpenAI({ apiKey: key });
  const model = process.env.SWEEP_OPENAI_MODEL || 'gpt-4o';
  const resp: any = await client.responses.create({
    model,
    tools: [{ type: 'web_search_preview' }] as any,
    instructions: CONCISE_SYS,
    max_output_tokens: MAX_OUT.openai,
    input: query,
  });

  // Responses API marks a cap-truncated answer status='incomplete' with
  // incomplete_details.reason='max_output_tokens'.
  const truncated = resp.status === 'incomplete' && resp.incomplete_details?.reason === 'max_output_tokens';
  const transcript = (resp.output_text || '').trim();
  const sources: string[] = [];
  for (const item of resp.output || []) {
    for (const c of item.content || []) {
      for (const a of c.annotations || []) if (a?.url) sources.push(a.url);
    }
  }
  // The web_search tool leaves a 'web_search_call' item when it fires; a purely
  // model-prior answer has neither that nor any source annotations.
  const searchInvoked = sources.length > 0 || (resp.output || []).some((i: any) => i?.type === 'web_search_call');
  const u = resp.usage || {};
  const costUsd =
    (u.input_tokens || 0) / 1e6 * 2.5 +
    (u.output_tokens || 0) / 1e6 * 10 +
    0.01; // web search fee (approx)

  return { transcript, sources: uniq(sources), costUsd, model, truncated, searchInvoked };
}

// --- Perplexity (stable OpenAI-compatible REST; returns citations) ---------
async function askPerplexity(query: string): Promise<EngineAnswer> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new MissingKeyError('PERPLEXITY_API_KEY');
  const model = process.env.SWEEP_PERPLEXITY_MODEL || 'sonar';
  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUT.perplexity,
      messages: [{ role: 'system', content: CONCISE_SYS }, { role: 'user', content: query }],
    }),
  });
  if (!r.ok) throw new Error(`Perplexity ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  const truncated = j.choices?.[0]?.finish_reason === 'length';
  const transcript = (j.choices?.[0]?.message?.content || '').trim();
  const sources: string[] = j.citations || (j.search_results || []).map((s: any) => s.url) || [];
  // Sonar is a search model; treat a returned citation/search-result list as proof
  // it searched. (If it ever answers with none, that's a model-prior answer.)
  const searchInvoked = sources.length > 0;
  const u = j.usage || {};
  const costUsd =
    (u.prompt_tokens || 0) / 1e6 * 1 +
    (u.completion_tokens || 0) / 1e6 * 1 +
    0.005; // sonar request fee (approx)

  return { transcript, sources: uniq(sources), costUsd, model, truncated, searchInvoked };
}

// --- Gemini (google search grounding; already a project dependency) --------
async function askGemini(query: string): Promise<EngineAnswer> {
  const key = process.env.GEMINI_API_KEY || (process.env.VITE_DEV_GEMINI_KEY as string);
  if (!key) throw new MissingKeyError('GEMINI_API_KEY');
  const ai = new GoogleGenAI({ apiKey: key });
  // Resilient chain: prefer the newest, fall back on a per-model quota (429) or
  // availability error — Gemini is the priority + free-quick-check engine, so it
  // must not die on a single model's quota.
  const primary = process.env.SWEEP_GEMINI_MODEL || 'gemini-3.6-flash';
  const models = [...new Set([primary, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])];
  let lastErr: any;
  for (const model of models) {
    try {
      const resp: any = await ai.models.generateContent({
        model,
        contents: query,
        config: { tools: [{ googleSearch: {} }], systemInstruction: CONCISE_SYS, maxOutputTokens: MAX_OUT.gemini } as any,
      });
      const truncated = resp.candidates?.[0]?.finishReason === 'MAX_TOKENS';
      const transcript = (resp.text || '').trim();
      const grounding = resp.candidates?.[0]?.groundingMetadata;
      const chunks = grounding?.groundingChunks || [];
      const sources: string[] = chunks.map((c: any) => c.web?.uri).filter(Boolean);
      // groundingMetadata is present only when Google Search grounding actually ran.
      const searchInvoked = !!grounding || sources.length > 0;
      const um = resp.usageMetadata || {};
      const costUsd = ((um.promptTokenCount || 0) + (um.candidatesTokenCount || 0)) / 1e6 * 0.3; // flash approx
      return { transcript, sources: uniq(sources), costUsd, model, truncated, searchInvoked };
    } catch (e: any) {
      lastErr = e; // 429 quota / model-not-available → try the next model
    }
  }
  throw lastErr || new Error('Gemini request failed');
}

export const ENGINE_ADAPTERS: Record<Engine, (q: string) => Promise<EngineAnswer>> = {
  claude: askClaude,
  openai: askOpenAI,
  perplexity: askPerplexity,
  gemini: askGemini,
};

/** Which engines have their API key configured in this environment. */
export function configuredEngines(): Engine[] {
  const has = (v: string) => !!process.env[v];
  const out: Engine[] = [];
  if (has('ANTHROPIC_API_KEY')) out.push('claude');
  if (has('OPENAI_API_KEY')) out.push('openai');
  if (has('PERPLEXITY_API_KEY')) out.push('perplexity');
  if (has('GEMINI_API_KEY') || has('VITE_DEV_GEMINI_KEY')) out.push('gemini');
  return out;
}
