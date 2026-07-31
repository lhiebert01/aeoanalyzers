// WO-QA-003 C2 — Attainability tiers for authority-gap recommendations.
//
// The dogfood told a solo-founder SaaS to "get listed on Wikipedia and Gartner" —
// unattainable advice that damages the report's credibility. Every recommended
// source is now tiered by how attainable it actually is:
//   • now          — self-serve: you can create a profile/listing today, for free.
//   • earned       — pitchable: the category blogs/listicle publishers engines cite;
//                    you reach them by outreach, guest content, or being reviewed.
//   • aspirational — editorial / high-bar (Wikipedia, Gartner, Forbes): shown so the
//                    picture is complete, but labeled so nobody wastes effort first.
//
// Versioned data file (like the crawler registry, ADDENDUM-002). Keyed by
// registrable domain; unknown domains default to `earned`.

export type AttainabilityTier = 'now' | 'earned' | 'aspirational';

export interface TierInfo {
  tier: AttainabilityTier;
  /** One short, consequences-not-directives clause. */
  rationale: string;
}

export const SOURCE_TIER_REGISTRY_VERSION = '2026-07-31';

export const TIER_LABEL: Record<AttainabilityTier, string> = {
  now: 'Do now (self-serve)',
  earned: 'Earn (pitchable)',
  aspirational: 'Aspirational (high bar)',
};

const REGISTRY: Record<string, TierInfo> = {
  // ── NOW: create your own profile/listing/presence today, free ──────────────
  'g2.com': { tier: 'now', rationale: 'Claim a free product listing in your category.' },
  'capterra.com': { tier: 'now', rationale: 'Free vendor listing.' },
  'getapp.com': { tier: 'now', rationale: 'Free vendor listing.' },
  'sourceforge.net': { tier: 'now', rationale: 'Free software listing.' },
  'linkedin.com': { tier: 'now', rationale: 'A company + founder profile you fully control.' },
  'youtube.com': { tier: 'now', rationale: 'Publish your own demos/explainers.' },
  'reddit.com': { tier: 'now', rationale: 'Participate authentically where the question is asked (no astroturfing).' },
  'quora.com': { tier: 'now', rationale: 'Answer real questions in your space under your name.' },
  'crunchbase.com': { tier: 'now', rationale: 'Create/claim your company profile.' },
  'producthunt.com': { tier: 'now', rationale: 'Launch/list your product.' },
  'trustpilot.com': { tier: 'now', rationale: 'Claim your profile; invite real customer reviews.' },
  'github.com': { tier: 'now', rationale: 'Public repos/org profile you control.' },
  'medium.com': { tier: 'now', rationale: 'Self-publish — but keep the canonical on your own domain (POSSE).' },
  'betalist.com': { tier: 'now', rationale: 'Self-submit an early-stage listing.' },
  'stackoverflow.com': { tier: 'now', rationale: 'Answer real technical questions under your name.' },

  // ── EARNED: pitch/outreach — the category blogs & listicle publishers ──────
  'hubspot.com': { tier: 'earned', rationale: 'Pitch inclusion in their category roundups/graders.' },
  'blog.hubspot.com': { tier: 'earned', rationale: 'Pitch inclusion in their category roundups.' },
  'techradar.com': { tier: 'earned', rationale: 'Editorial roundup — pitch a reviewer.' },
  'zapier.com': { tier: 'earned', rationale: 'Pitch inclusion in their "best tools" posts / build an integration.' },
  'airanklab.com': { tier: 'earned', rationale: 'Category listicle — pitch to be reviewed.' },
  'therankmasters.com': { tier: 'earned', rationale: 'Category listicle — pitch to be reviewed.' },
  'stackmatix.com': { tier: 'earned', rationale: 'Category listicle — pitch to be reviewed.' },
  'rankability.com': { tier: 'earned', rationale: 'Category blog — pitch to be included.' },
  'nicklafferty.com': { tier: 'earned', rationale: 'Independent reviewer blog — pitch to be tested.' },
  'semrush.com': { tier: 'earned', rationale: 'Pitch inclusion in their blog roundups.' },
  'g2crowd.com': { tier: 'earned', rationale: 'Reviews-driven — earn real reviews.' },

  // ── ASPIRATIONAL: editorial / analyst gatekeepers (labeled, not first) ─────
  'wikipedia.org': { tier: 'aspirational', rationale: 'Needs independent notability + third-party coverage first; do not self-create.' },
  'gartner.com': { tier: 'aspirational', rationale: 'Analyst-gated; realistic only at meaningful scale.' },
  'forrester.com': { tier: 'aspirational', rationale: 'Analyst-gated; realistic only at scale.' },
  'forbes.com': { tier: 'aspirational', rationale: 'Earned press — pitchable long-term, not a first move.' },
  'techcrunch.com': { tier: 'aspirational', rationale: 'Earned press — pitchable long-term, not a first move.' },
  'businessinsider.com': { tier: 'aspirational', rationale: 'Earned press — long-term.' },
  'g2.com/reports': { tier: 'aspirational', rationale: 'Grid placement is earned via review volume over time.' },
};

/** Collapse a host to its registrable-ish domain (last two labels). */
function registrable(host: string): string {
  const parts = String(host || '').toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
}

/** Tier for a source domain (accepts a bare host OR a full URL). Exact match first,
 *  then registrable domain, then the default: `earned` (an unknown cited source is
 *  most often a blog you can pitch). */
export function tierForDomain(domain: string): TierInfo {
  const d = String(domain || '').trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '').replace(/^www\./, '')
    .split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  if (REGISTRY[d]) return REGISTRY[d];
  const reg = registrable(d);
  if (REGISTRY[reg]) return REGISTRY[reg];
  return { tier: 'earned', rationale: 'Likely a category blog/publisher — reachable by outreach.' };
}
