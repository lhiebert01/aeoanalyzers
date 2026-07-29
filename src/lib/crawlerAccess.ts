// Crawler-access audit — the foundational AEO gate.
//
// An AEO report is meaningless if the AI engines it optimizes for cannot read
// the page. A site can have flawless schema and still be invisible to Gemini,
// ChatGPT, Claude, and Perplexity because its robots.txt disallows their bots.
// No site should score 90 while blocking the exact crawlers it wants to be
// cited by — so this module parses robots.txt for the major AI/answer-engine
// user-agents and reports (and, upstream, CAPS the score for) a critical block.
//
// This is 100% deterministic: given the robots.txt text and whether /llms.txt
// exists, it returns the same audit every time. The LLM is not involved.

// The AI/answer-engine crawlers an AEO site actually cares about. `critical`
// marks the engines whose citation surface the product optimizes for — if any
// of these is blocked from the site root, the whole report is compromised.
export interface AiBot {
  name: string;   // exact robots.txt user-agent token (case-insensitive match)
  engine: string; // human-facing engine/company grouping
  critical: boolean;
}

export const AI_BOTS: AiBot[] = [
  // OpenAI / ChatGPT
  { name: 'GPTBot', engine: 'OpenAI (ChatGPT)', critical: true },
  { name: 'OAI-SearchBot', engine: 'OpenAI (ChatGPT Search)', critical: true },
  { name: 'ChatGPT-User', engine: 'OpenAI (ChatGPT browsing)', critical: true },
  // Anthropic / Claude
  { name: 'ClaudeBot', engine: 'Anthropic (Claude)', critical: true },
  { name: 'Claude-User', engine: 'Anthropic (Claude browsing)', critical: true },
  { name: 'Claude-SearchBot', engine: 'Anthropic (Claude Search)', critical: true },
  { name: 'anthropic-ai', engine: 'Anthropic (legacy)', critical: false },
  // Google Gemini grounding
  { name: 'Google-Extended', engine: 'Google (Gemini)', critical: true },
  // Perplexity
  { name: 'PerplexityBot', engine: 'Perplexity', critical: true },
  { name: 'Perplexity-User', engine: 'Perplexity (browsing)', critical: true },
  // Apple Intelligence
  { name: 'Applebot-Extended', engine: 'Apple Intelligence', critical: false },
  // Common Crawl — feeds many downstream models
  { name: 'CCBot', engine: 'Common Crawl', critical: false },
  // Other notable answer/AI engines
  { name: 'Amazonbot', engine: 'Amazon (Alexa/Rufus)', critical: false },
  { name: 'Bytespider', engine: 'ByteDance (Doubao)', critical: false },
  { name: 'Meta-ExternalAgent', engine: 'Meta AI', critical: false },
  { name: 'cohere-ai', engine: 'Cohere', critical: false },
  { name: 'DuckAssistBot', engine: 'DuckDuckGo AI', critical: false },
  { name: 'YouBot', engine: 'You.com', critical: false },
  { name: 'MistralAI-User', engine: 'Mistral (Le Chat)', critical: false },
];

interface RobotsRule {
  type: 'allow' | 'disallow';
  path: string;
}

/**
 * Parse robots.txt into a map of lowercased user-agent → ordered rules.
 * Consecutive `User-agent` lines share the rule block that follows them
 * (standard robots.txt grouping).
 */
export function parseRobots(robotsTxt: string): {
  groups: Map<string, RobotsRule[]>;
  sitemaps: string[];
} {
  const groups = new Map<string, RobotsRule[]>();
  const sitemaps: string[] = [];
  let currentAgents: string[] = [];
  let sawRuleForGroup = false;

  for (const rawLine of String(robotsTxt || '').split(/\r?\n/)) {
    // Strip comments and trim.
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      // A user-agent after a rule block starts a fresh group.
      if (sawRuleForGroup) {
        currentAgents = [];
        sawRuleForGroup = false;
      }
      const agent = value.toLowerCase();
      currentAgents.push(agent);
      if (!groups.has(agent)) groups.set(agent, []);
    } else if (field === 'disallow' || field === 'allow') {
      sawRuleForGroup = true;
      const rule: RobotsRule = { type: field, path: value };
      for (const agent of currentAgents) {
        const arr = groups.get(agent);
        if (arr) arr.push(rule);
      }
    } else if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    }
  }

  return { groups, sitemaps };
}

/**
 * Evaluate whether a set of rules blocks a given path. Uses the longest-match
 * rule; on an equal-length tie, Allow wins (the widely-implemented Google rule).
 * An empty `Disallow:` value means "allow everything" and never blocks.
 */
function pathBlocked(rules: RobotsRule[], testPath: string): boolean {
  let best: { len: number; type: 'allow' | 'disallow' } | null = null;
  for (const rule of rules) {
    // Empty disallow = allow-all; skip (never blocks).
    if (rule.type === 'disallow' && rule.path === '') continue;
    // A rule matches when its path is a prefix of the test path.
    // Wildcard `*` in the path is treated leniently: `/*` behaves like `/`.
    const normalized = rule.path.replace(/\*+$/, '') || '/';
    if (testPath.startsWith(normalized)) {
      const len = normalized.length;
      if (!best || len > best.len || (len === best.len && rule.type === 'allow')) {
        best = { len, type: rule.type };
      }
    }
  }
  return best?.type === 'disallow';
}

/** Pick the rule group that applies to a user-agent (exact token, else `*`). */
function rulesForAgent(
  groups: Map<string, RobotsRule[]>,
  agent: string
): RobotsRule[] | undefined {
  const exact = groups.get(agent.toLowerCase());
  if (exact) return exact;
  return groups.get('*');
}

export interface CrawlerAccessResult {
  robotsFound: boolean;
  llmsTxtFound: boolean;
  sitemapReferenced: boolean;
  /** `User-agent: *  Disallow: /` — blocks every crawler from the site root. */
  catchAllBlocksRoot: boolean;
  /** AI bots explicitly or implicitly blocked from the site root. */
  blockedBots: { name: string; engine: string; critical: boolean }[];
  /** Names of critical AI bots that can reach the site root. */
  allowedCriticalBots: string[];
  /** `noindex` via X-Robots-Tag header or <meta robots> — removed from search. */
  noindexDetected: boolean;
  /** A Cloudflare (or similar edge) AI-block overriding the repo's robots.txt. */
  edgeBlockSuspected: boolean;
  /** True when a citation-critical engine (or the catch-all) blocks the root. */
  criticalBlock: boolean;
  /** 0–100 crawler-access sub-score, for the report card. */
  score: number;
  summary: string;
  recommendations: string[];
}

// The exact owner-dashboard steps for the Cloudflare managed-robots.txt AI
// block — it CANNOT be fixed in the repo, so we hand the customer the clicks.
const CLOUDFLARE_FIX =
  'This looks like a Cloudflare edge block (a managed robots.txt / AI-bot rule that overrides your own file). It cannot be fixed in your code. In the Cloudflare dashboard → your domain → Security → Settings → "Manage AI bot access": set Block AI bots to "Do not block", turn off the Search/Agent/Training AI-bot policies, and set "Manage your robots.txt" to Disable so your own file serves. Also remove any "Block AI Scrapers" WAF rule.';

/**
 * Produce the crawler-access audit from a site's robots.txt and whether it
 * publishes an /llms.txt. `robotsTxt` is null/undefined when the file could not
 * be fetched or does not exist — which, for crawlers, means "no restrictions"
 * (default-allow), a GOOD state.
 */
export function evaluateCrawlerAccess(input: {
  robotsTxt?: string | null;
  llmsTxtFound?: boolean;
  /** The page's X-Robots-Tag response header, if any. */
  xRobotsTag?: string | null;
  /** True if a <meta name="robots"|"googlebot" content="…noindex…"> is on the page. */
  metaRobotsNoindex?: boolean;
  /** The page's Content-Signal response header, if any (e.g. "ai-train=no"). */
  contentSignal?: string | null;
  /** True if the site is served through Cloudflare (server header / cf-ray). */
  isCloudflare?: boolean;
}): CrawlerAccessResult {
  const robotsTxt = input.robotsTxt;
  const robotsFound = typeof robotsTxt === 'string' && robotsTxt.trim().length > 0;
  const llmsTxtFound = !!input.llmsTxtFound;

  const { groups, sitemaps } = robotsFound ? parseRobots(robotsTxt as string) : { groups: new Map(), sitemaps: [] as string[] };

  // --- Edge-level / indexing blocks (invisible to a robots.txt read alone) ---
  const noindexRx = /\b(noindex|none)\b/i;
  const noindexDetected =
    noindexRx.test(String(input.xRobotsTag || '')) || !!input.metaRobotsNoindex;

  // Content-Signal opt-out (Cloudflare's default AI-training signal), in either
  // the response header or the robots.txt body.
  const aiTrainOptOut =
    /ai-train\s*=\s*no/i.test(String(input.contentSignal || '')) ||
    /content-signal[^\n]*ai-train\s*=\s*no/i.test(String(robotsTxt || ''));

  // A Cloudflare *managed* robots.txt (comment markers) or the opt-out signal,
  // combined with Cloudflare in front, indicates a dashboard-level AI block.
  const cfManagedRobots = robotsFound && /cloudflare|managed by cloudflare|content-signal/i.test(robotsTxt as string);

  // Catch-all blocking the root is the nuclear case: it disallows every bot,
  // including all AI engines, unless a more specific group re-allows them.
  const starRules = groups.get('*');
  const catchAllBlocksRoot = !!starRules && pathBlocked(starRules, '/');

  const blockedBots: CrawlerAccessResult['blockedBots'] = [];
  const allowedCriticalBots: string[] = [];

  for (const bot of AI_BOTS) {
    const rules = rulesForAgent(groups, bot.name);
    // No robots.txt or no applicable group → default allow.
    const blocked = rules ? pathBlocked(rules, '/') : false;
    if (blocked) {
      blockedBots.push({ name: bot.name, engine: bot.engine, critical: bot.critical });
    } else if (bot.critical) {
      allowedCriticalBots.push(bot.name);
    }
  }

  const robotsCriticalBlock = catchAllBlocksRoot || blockedBots.some((b) => b.critical);
  const edgeBlockSuspected = cfManagedRobots || (!!input.isCloudflare && robotsCriticalBlock);
  // noindex removes the page from search/index entirely — as fatal as a crawl block.
  const criticalBlock = robotsCriticalBlock || noindexDetected;

  // --- Score + narrative ---------------------------------------------------
  let score = 100;
  const recommendations: string[] = [];
  const summaryParts: string[] = [];

  if (noindexDetected) {
    score = Math.min(score, 5);
    recommendations.push(
      'CRITICAL: this page is marked `noindex` (via an X-Robots-Tag header or a <meta name="robots"> tag). It is being actively removed from search and AI indexes. Remove the noindex directive — nothing else in this report can help while it is present.'
    );
    summaryParts.push('This page is marked noindex and is being removed from search/AI indexes entirely.');
  }

  if (robotsCriticalBlock) {
    const blockedCriticalNames = blockedBots.filter((b) => b.critical).map((b) => b.name);
    score = Math.min(score, catchAllBlocksRoot ? 5 : Math.max(10, 35 - blockedCriticalNames.length * 5));
    if (catchAllBlocksRoot) {
      recommendations.push(
        'CRITICAL: robots.txt blocks all crawlers from your site root (`User-agent: *` / `Disallow: /`). Every AI answer engine is locked out. Change `Disallow: /` to `Allow: /` (or scope the disallow to private paths) before anything else in this report matters.'
      );
      summaryParts.push('Your robots.txt blocks ALL crawlers from the site root — AI answer engines cannot read this page at all.');
    } else {
      recommendations.push(
        `CRITICAL: robots.txt disallows citation-critical AI crawlers (${blockedCriticalNames.join(', ')}). These engines cannot read your page, so your schema and content are invisible to them. Remove the Disallow rules for these user-agents.`
      );
      summaryParts.push(`Your robots.txt blocks citation-critical AI crawlers (${blockedCriticalNames.join(', ')}).`);
    }
  } else if (blockedBots.length > 0) {
    score = Math.min(score, 82);
    recommendations.push(
      `Some AI crawlers are blocked in robots.txt (${blockedBots.map((b) => b.name).join(', ')}). The major citation engines can still read you, but consider allowing these too for broader AI visibility.`
    );
    summaryParts.push(`The major AI answer engines can read your site; a few secondary crawlers (${blockedBots.map((b) => b.name).join(', ')}) are blocked.`);
  } else if (!criticalBlock) {
    summaryParts.push(
      robotsFound
        ? 'AI answer engines (ChatGPT, Claude, Gemini, Perplexity, and others) are all allowed to crawl your site root.'
        : 'No robots.txt restrictions detected — AI answer engines can crawl your site by default.'
    );
  }

  // The edge block is the highest-leverage detect: it CANNOT be fixed in the repo.
  if (edgeBlockSuspected) {
    recommendations.unshift(CLOUDFLARE_FIX);
    summaryParts.push('The block appears to originate at the Cloudflare edge, which overrides your own robots.txt.');
  } else if (aiTrainOptOut) {
    recommendations.push(
      'A `Content-Signal: ai-train=no` was detected (often a Cloudflare default). This tells AI engines not to train on your content. If you want to be cited, review this in your CDN/edge settings.'
    );
  }

  if (!llmsTxtFound) {
    // Low-priority, supplemental. Google Search has confirmed it does NOT use
    // llms.txt, and no major answer engine has committed to consuming it — so a
    // missing file is a minor, optional gap, not a material AEO failure. Keep only
    // a small nudge (not the old -10) so it can't out-weight indexing, structured
    // data, or independent authority, which are what actually move citations.
    score = Math.max(0, score - 2);
    recommendations.push(
      'Optional (low priority): add an /llms.txt file — a concise, LLM-friendly index of your key pages and facts. Note that Google Search does not use llms.txt and no major answer engine currently commits to consuming it, so treat this as a cheap experiment, not a priority. Indexing, structured data, and independent citations matter far more.'
    );
    summaryParts.push('No /llms.txt was found (optional — low priority).');
  }

  if (!robotsFound) {
    recommendations.push(
      'No robots.txt was found. Crawlers default to full access (good), but publish a robots.txt that explicitly `Allow`s the AI user-agents and links your sitemap, so access is intentional rather than accidental.'
    );
  }

  return {
    robotsFound,
    llmsTxtFound,
    sitemapReferenced: sitemaps.length > 0,
    catchAllBlocksRoot,
    blockedBots,
    allowedCriticalBots,
    noindexDetected,
    edgeBlockSuspected,
    criticalBlock,
    score,
    summary: summaryParts.join(' '),
    recommendations,
  };
}
