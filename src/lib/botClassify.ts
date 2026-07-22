// WO-3 — AI crawler telemetry: user-agent classification registry.
//
// AI bots do NOT execute JavaScript, so client-side analytics never see them —
// this classifier runs SERVER-SIDE (Vercel middleware / ingest API) over the raw
// User-Agent and maps each known AI/answer-engine crawler to one of three tiers:
//
//   live     — a human just asked; the engine fetched the page to answer NOW
//              (Claude-User, ChatGPT-User, Perplexity-User)
//   search   — answer-engine indexing (Bingbot, OAI-SearchBot, Applebot, PerplexityBot)
//   training — knowledge ingestion (ClaudeBot, GPTBot, CCBot, Bytespider, …)
//
// The tier changes the meaning of a hit AND the fix path (a zero on `search` for
// Perplexity routes to Bing/PerplexityBot coverage, not generic panic), so the
// tier — not just "an AI bot came" — is the useful signal. Versioned so the
// registry can be updated as engines ship new agents.

export const REGISTRY_VERSION = '2026-07-22';

export type BotTier = 'live' | 'search' | 'training';

export interface BotSignature {
  /** Case-insensitive substring to match in the User-Agent. */
  token: string;
  engine: string;
  tier: BotTier;
}

// Ordered most-specific first so "ChatGPT-User" wins over a bare "GPT" match.
export const BOT_REGISTRY: BotSignature[] = [
  // --- Live: human asked, engine fetched to answer ---
  { token: 'Claude-User', engine: 'Anthropic (Claude)', tier: 'live' },
  { token: 'ChatGPT-User', engine: 'OpenAI (ChatGPT)', tier: 'live' },
  { token: 'Perplexity-User', engine: 'Perplexity', tier: 'live' },
  { token: 'DuckAssistBot', engine: 'DuckDuckGo AI', tier: 'live' },
  { token: 'MistralAI-User', engine: 'Mistral (Le Chat)', tier: 'live' },

  // --- Search: answer-engine indexing ---
  { token: 'OAI-SearchBot', engine: 'OpenAI (ChatGPT Search)', tier: 'search' },
  { token: 'PerplexityBot', engine: 'Perplexity', tier: 'search' },
  { token: 'Applebot-Extended', engine: 'Apple Intelligence', tier: 'training' }, // extended = training opt-in
  { token: 'Applebot', engine: 'Apple (Siri/Spotlight)', tier: 'search' },
  { token: 'Bingbot', engine: 'Microsoft Bing', tier: 'search' },
  { token: 'YouBot', engine: 'You.com', tier: 'search' },
  { token: 'Claude-SearchBot', engine: 'Anthropic (Claude Search)', tier: 'search' },

  // --- Training: knowledge ingestion ---
  { token: 'ClaudeBot', engine: 'Anthropic (Claude)', tier: 'training' },
  { token: 'anthropic-ai', engine: 'Anthropic (legacy)', tier: 'training' },
  { token: 'GPTBot', engine: 'OpenAI (ChatGPT)', tier: 'training' },
  { token: 'CCBot', engine: 'Common Crawl', tier: 'training' },
  { token: 'Google-Extended', engine: 'Google (Gemini)', tier: 'training' },
  { token: 'Bytespider', engine: 'ByteDance (Doubao)', tier: 'training' },
  { token: 'meta-externalagent', engine: 'Meta AI', tier: 'training' },
  { token: 'Meta-ExternalAgent', engine: 'Meta AI', tier: 'training' },
  { token: 'Amazonbot', engine: 'Amazon (Alexa/Rufus)', tier: 'training' },
  { token: 'cohere-ai', engine: 'Cohere', tier: 'training' },
];

export interface BotClassification {
  isBot: true;
  token: string;
  engine: string;
  tier: BotTier;
}

/** Classify a raw User-Agent string. Returns null for non-AI-bot traffic
 *  (humans, generic crawlers we don't track). Deterministic. */
export function classifyUserAgent(ua: string | null | undefined): BotClassification | null {
  const s = String(ua || '');
  if (!s) return null;
  const lower = s.toLowerCase();
  for (const sig of BOT_REGISTRY) {
    if (lower.includes(sig.token.toLowerCase())) {
      return { isBot: true, token: sig.token, engine: sig.engine, tier: sig.tier };
    }
  }
  return null;
}

/** Plain-language tier definitions for the dashboard (WO-3 acceptance). */
export const TIER_DEFINITIONS: Record<BotTier, string> = {
  live: 'A person just asked an AI a question and the engine fetched this page to answer them right now. The highest-value signal — real-time demand.',
  search: 'An answer engine is indexing this page for its search layer (Bing feeds ChatGPT & Perplexity). Coverage here determines whether you can be cited at all.',
  training: 'A crawler ingesting content for model training/knowledge. Broad reach, but a training hit is not an endorsement and does not mean you will be cited.',
};
