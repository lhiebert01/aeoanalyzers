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
}

export class MissingKeyError extends Error {
  constructor(public envVar: string) {
    super(`${envVar} is not set`);
    this.name = 'MissingKeyError';
  }
}

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

// --- Anthropic / Claude (authoritative web_search_20260209 shape) ----------
async function askClaude(query: string): Promise<EngineAnswer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new MissingKeyError('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey: key });
  const model = process.env.SWEEP_CLAUDE_MODEL || 'claude-opus-4-8';
  // Basic web-search variant: works on ALL Claude models (Haiku→Opus). The
  // _20260209 dynamic-filtering variant is Opus/Sonnet-tier ONLY and 400s on
  // Haiku — so use basic here since SWEEP_CLAUDE_MODEL may be a cheap tier.
  const tools = [{ type: 'web_search_20250305' as const, name: 'web_search' as const }];

  let messages: any[] = [{ role: 'user', content: query }];
  let resp: any = await client.messages.create({ model, max_tokens: 2048, tools: tools as any, messages });
  let guard = 0;
  // Server-tool loops can pause; re-send to resume (skill: handling pause_turn).
  while (resp.stop_reason === 'pause_turn' && guard++ < 4) {
    messages = [{ role: 'user', content: query }, { role: 'assistant', content: resp.content }];
    resp = await client.messages.create({ model, max_tokens: 2048, tools: tools as any, messages });
  }

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
  const priceIn = 5, priceOut = 25; // Opus 4.8 $/MTok
  const searchReqs = u.server_tool_use?.web_search_requests || 0;
  const costUsd =
    (u.input_tokens || 0) / 1e6 * priceIn +
    (u.output_tokens || 0) / 1e6 * priceOut +
    searchReqs * 0.01; // web search ~$10 / 1000 requests

  return { transcript, sources: uniq(sources), costUsd, model };
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
    input: query,
  });

  const transcript = (resp.output_text || '').trim();
  const sources: string[] = [];
  for (const item of resp.output || []) {
    for (const c of item.content || []) {
      for (const a of c.annotations || []) if (a?.url) sources.push(a.url);
    }
  }
  const u = resp.usage || {};
  const costUsd =
    (u.input_tokens || 0) / 1e6 * 2.5 +
    (u.output_tokens || 0) / 1e6 * 10 +
    0.01; // web search fee (approx)

  return { transcript, sources: uniq(sources), costUsd, model };
}

// --- Perplexity (stable OpenAI-compatible REST; returns citations) ---------
async function askPerplexity(query: string): Promise<EngineAnswer> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new MissingKeyError('PERPLEXITY_API_KEY');
  const model = process.env.SWEEP_PERPLEXITY_MODEL || 'sonar';
  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: query }] }),
  });
  if (!r.ok) throw new Error(`Perplexity ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  const transcript = (j.choices?.[0]?.message?.content || '').trim();
  const sources: string[] = j.citations || (j.search_results || []).map((s: any) => s.url) || [];
  const u = j.usage || {};
  const costUsd =
    (u.prompt_tokens || 0) / 1e6 * 1 +
    (u.completion_tokens || 0) / 1e6 * 1 +
    0.005; // sonar request fee (approx)

  return { transcript, sources: uniq(sources), costUsd, model };
}

// --- Gemini (google search grounding; already a project dependency) --------
async function askGemini(query: string): Promise<EngineAnswer> {
  const key = process.env.GEMINI_API_KEY || (process.env.VITE_DEV_GEMINI_KEY as string);
  if (!key) throw new MissingKeyError('GEMINI_API_KEY');
  const ai = new GoogleGenAI({ apiKey: key });
  const model = process.env.SWEEP_GEMINI_MODEL || 'gemini-2.5-flash';
  const resp: any = await ai.models.generateContent({
    model,
    contents: query,
    config: { tools: [{ googleSearch: {} }] } as any,
  });
  const transcript = (resp.text || '').trim();
  const chunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: string[] = chunks.map((c: any) => c.web?.uri).filter(Boolean);
  const um = resp.usageMetadata || {};
  const costUsd = ((um.promptTokenCount || 0) + (um.candidatesTokenCount || 0)) / 1e6 * 0.3; // flash approx

  return { transcript, sources: uniq(sources), costUsd, model };
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
