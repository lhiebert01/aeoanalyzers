// Server-side LLM generation with provider fallback (Gemini → OpenAI → Anthropic).
//
// WHY THIS EXISTS: the analysis logic in src/services/geminiService.ts used to
// call the Gemini SDK DIRECTLY FROM THE BROWSER using a VITE_-inlined key. That
// shipped the key in the client bundle — the exact vector that got the sibling
// GCP project suspended (a harvested Gemini key). This route moves the only
// key-bearing call server-side (keys live in server-only env vars, never in the
// bundle) AND adds resilience: if Gemini is unconfigured/suspended/rate-limited,
// the request falls back to OpenAI, then Anthropic, so the app is never left
// "high and dry" by one provider going down.
//
// Contract: POST { prompt: string, schema: object } -> { text, provider, model }.
// `schema` is the Gemini-style responseSchema the client already builds; the
// Gemini path uses it verbatim, and the OpenAI/Anthropic paths rely on the
// prompt (which fully describes the JSON shape) + JSON-only output. The client's
// tolerant safeJsonParse() handles minor formatting differences between providers.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Gemini flash models in priority order (best quality first, stable fallbacks).
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
];
const OPENAI_MODEL = process.env.LLM_OPENAI_MODEL || 'gpt-4o';
const ANTHROPIC_MODEL = process.env.LLM_ANTHROPIC_MODEL || 'claude-sonnet-5';
const MAX_OUTPUT_TOKENS = 32768;

// A Gemini per-model failure is retryable (try the next model / next provider)
// on capacity/rate errors. But auth/quota/suspension errors ALSO must fall
// through to the next PROVIDER (that is the whole point of this route), so at the
// provider level we fall through on ANY Gemini failure, not just capacity ones.
async function tryGemini(prompt: string, schema: any): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  let lastErr: any;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });
      if (response.text) {
        console.log(`[llm-generate] served by Gemini ${model}`);
        return response.text;
      }
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.code || err?.httpStatusCode;
      // Capacity/rate → try the next Gemini model. Any other error (auth, quota,
      // suspended key, bad request) → stop trying Gemini and let the caller fall
      // through to the next provider.
      const capacity =
        status === 503 || status === 429 || status === 'UNAVAILABLE' ||
        /503|429|high demand|quota|exhausted|RESOURCE_EXHAUSTED/i.test(err?.message || '');
      if (capacity) continue;
      break;
    }
  }
  console.warn('[llm-generate] Gemini unavailable:', lastErr?.message || 'no output');
  return null;
}

async function tryOpenAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a JSON API. Respond with a single valid JSON object only — no markdown fences, no prose. Follow every field and rule described in the user message exactly.' },
        { role: 'user', content: prompt },
      ],
    });
    const text = resp.choices?.[0]?.message?.content;
    if (text) {
      console.log(`[llm-generate] served by OpenAI ${OPENAI_MODEL}`);
      return text;
    }
  } catch (err: any) {
    console.warn('[llm-generate] OpenAI fallback failed:', err?.message);
  }
  return null;
}

async function tryAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const resp: any = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16384,
      system: 'You are a JSON API. Respond with a single valid JSON object only — no markdown fences, no prose. Follow every field and rule described in the user message exactly.',
      // Assistant prefill "{" forces the response to open as a JSON object.
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' },
      ],
    });
    const body = (resp.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    if (body) {
      console.log(`[llm-generate] served by Anthropic ${ANTHROPIC_MODEL}`);
      return '{' + body; // re-attach the prefilled opening brace
    }
  } catch (err: any) {
    console.warn('[llm-generate] Anthropic fallback failed:', err?.message);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const prompt: string = body.prompt;
  const schema: any = body.schema;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    // Provider order: Gemini (cheapest, resumes automatically when GCP is
    // restored) → OpenAI → Anthropic. Each returns null when its key is missing
    // or it fails, so the chain degrades cleanly to whatever is configured.
    let text = await tryGemini(prompt, schema);
    let provider = 'gemini';
    if (!text) { text = await tryOpenAI(prompt); provider = 'openai'; }
    if (!text) { text = await tryAnthropic(prompt); provider = 'anthropic'; }

    if (!text) {
      return res.status(503).json({
        error: 'No LLM provider is available. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
      });
    }
    return res.status(200).json({ text, provider });
  } catch (err: any) {
    console.error('[llm-generate] fatal:', err?.message);
    return res.status(500).json({ error: 'LLM generation failed', detail: err?.message });
  }
}
