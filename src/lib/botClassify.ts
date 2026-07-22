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

// Bump on every registry edit (ADDENDUM-002 #2: registry is versioned data so
// token churn is trackable). Ideally served as remote data — see BOT_REGISTRY note.
export const REGISTRY_VERSION = '2026-07-22';

export type BotTier = 'live' | 'search' | 'training';
/** ADDENDUM-002 #2: tokens churn — carry lifecycle status so audits don't
 *  recommend legacy tokens or over-trust unstable ones. */
export type BotStatus = 'active' | 'legacy' | 'unstable';

export interface BotSignature {
  /** Case-insensitive substring to match in the User-Agent. */
  token: string;
  vendor: string;
  engine: string;
  tier: BotTier;
  status: BotStatus;
  /** Plain-language consequence of BLOCKING this bot (report voice — see #3). */
  consequence: string;
}

// Ordered most-specific first so "ChatGPT-User" wins over a bare match.
// NOTE (ADDENDUM-002 #2): this lives in code today, but is structured as pure
// data so it can be lifted to a remote/JSON feed and updated without a deploy.
export const BOT_REGISTRY: BotSignature[] = [
  // --- Live: human asked, engine fetched to answer ---
  { token: 'Claude-User', vendor: 'Anthropic', engine: 'Anthropic (Claude)', tier: 'live', status: 'active', consequence: 'Blocking it kills live retrieval when a Claude user asks about you right now.' },
  { token: 'ChatGPT-User', vendor: 'OpenAI', engine: 'OpenAI (ChatGPT)', tier: 'live', status: 'active', consequence: 'Blocking it kills live retrieval when a ChatGPT user asks about you right now.' },
  { token: 'Perplexity-User', vendor: 'Perplexity', engine: 'Perplexity', tier: 'live', status: 'active', consequence: 'Blocking it kills live retrieval when a Perplexity user asks about you right now.' },
  { token: 'DuckAssistBot', vendor: 'DuckDuckGo', engine: 'DuckDuckGo AI', tier: 'live', status: 'active', consequence: 'Blocking it drops you from DuckDuckGo AI assist answers.' },
  { token: 'MistralAI-User', vendor: 'Mistral', engine: 'Mistral (Le Chat)', tier: 'live', status: 'active', consequence: 'Blocking it drops you from Le Chat live answers.' },
  { token: 'Grok', vendor: 'xAI', engine: 'xAI (Grok)', tier: 'live', status: 'unstable', consequence: 'xAI/Grok token docs are unstable — classify permissively; hedge before recommending a block.' },

  // --- Search: answer-engine indexing ---
  { token: 'OAI-SearchBot', vendor: 'OpenAI', engine: 'OpenAI (ChatGPT Search)', tier: 'search', status: 'active', consequence: 'Blocking it removes you from ChatGPT Search’s index.' },
  { token: 'PerplexityBot', vendor: 'Perplexity', engine: 'Perplexity', tier: 'search', status: 'active', consequence: 'Blocking it removes you from Perplexity’s index (a zero here routes to Bing/PerplexityBot coverage, not panic).' },
  { token: 'Applebot-Extended', vendor: 'Apple', engine: 'Apple Intelligence', tier: 'training', status: 'active', consequence: 'This is the Apple AI-TRAINING opt-out token — distinct from Applebot. Blocking it opts you out of Apple Intelligence training only, NOT Siri/Spotlight search.' },
  { token: 'Applebot', vendor: 'Apple', engine: 'Apple (Siri/Spotlight)', tier: 'search', status: 'active', consequence: 'Blocking it removes you from Siri/Spotlight suggestions — distinct from Applebot-Extended.' },
  { token: 'Bingbot', vendor: 'Microsoft', engine: 'Microsoft Bing', tier: 'search', status: 'active', consequence: 'Blocking it removes you from Bing — which feeds BOTH ChatGPT Search and Perplexity.' },
  { token: 'YouBot', vendor: 'You.com', engine: 'You.com', tier: 'search', status: 'active', consequence: 'Blocking it removes you from You.com answers.' },
  { token: 'Claude-SearchBot', vendor: 'Anthropic', engine: 'Anthropic (Claude Search)', tier: 'search', status: 'active', consequence: 'Blocking it removes you from Claude’s search index.' },

  // --- Training: knowledge ingestion ---
  { token: 'ClaudeBot', vendor: 'Anthropic', engine: 'Anthropic (Claude)', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Claude model training (does not affect live/search retrieval).' },
  { token: 'anthropic-ai', vendor: 'Anthropic', engine: 'Anthropic (legacy)', tier: 'training', status: 'legacy', consequence: 'Legacy Anthropic token — recognize in logs; do not recommend in new robots.txt.' },
  { token: 'Claude-Web', vendor: 'Anthropic', engine: 'Anthropic (legacy)', tier: 'training', status: 'legacy', consequence: 'Legacy Anthropic token — recognize in logs; do not recommend in new robots.txt.' },
  { token: 'GPTBot', vendor: 'OpenAI', engine: 'OpenAI (ChatGPT)', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of OpenAI model training (does not affect ChatGPT live/search).' },
  { token: 'CCBot', vendor: 'Common Crawl', engine: 'Common Crawl', tier: 'training', status: 'active', consequence: 'Blocking it removes you from Common Crawl, which feeds many downstream models.' },
  { token: 'Google-Extended', vendor: 'Google', engine: 'Google (Gemini)', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Gemini training/grounding (does not affect Google Search).' },
  { token: 'Bytespider', vendor: 'ByteDance', engine: 'ByteDance (Doubao)', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of ByteDance/Doubao ingestion.' },
  { token: 'meta-externalagent', vendor: 'Meta', engine: 'Meta AI', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Meta AI ingestion.' },
  { token: 'Meta-ExternalAgent', vendor: 'Meta', engine: 'Meta AI', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Meta AI ingestion.' },
  { token: 'Amazonbot', vendor: 'Amazon', engine: 'Amazon (Alexa/Rufus)', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Amazon Alexa/Rufus ingestion.' },
  { token: 'cohere-ai', vendor: 'Cohere', engine: 'Cohere', tier: 'training', status: 'active', consequence: 'Blocking it opts you out of Cohere ingestion.' },
];

export interface BotClassification {
  isBot: true;
  token: string;
  vendor: string;
  engine: string;
  tier: BotTier;
  status: BotStatus;
  consequence: string;
}

/** Classify a raw User-Agent string. Returns null for non-AI-bot traffic
 *  (humans, generic crawlers we don't track). Deterministic. */
export function classifyUserAgent(ua: string | null | undefined): BotClassification | null {
  const s = String(ua || '');
  if (!s) return null;
  const lower = s.toLowerCase();
  for (const sig of BOT_REGISTRY) {
    if (lower.includes(sig.token.toLowerCase())) {
      return { isBot: true, token: sig.token, vendor: sig.vendor, engine: sig.engine, tier: sig.tier, status: sig.status, consequence: sig.consequence };
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
