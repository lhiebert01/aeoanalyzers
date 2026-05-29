// Brand-type classifier (Change 1 from AEOANALYZERS_IMPROVEMENT_BRIEF.md)
//
// Classifies a site as editorial / news / saas / ecommerce / service_business
// from its HTML. The detected type GATES which recommendation modules run —
// most importantly, whether the "Adjective-to-Metric" voice rewriter is allowed.
//
// Root cause this fixes: the tool previously applied one set of voice rules to
// every site, treating editorial brands like 2020-era B2B SaaS landing pages
// and damaging their primary moat (voice). See Failure 1 in the brief.
//
// Pure, deterministic, dependency-free so it is cheap to run client-side before
// the Gemini call and trivially unit-testable.

export type SiteType =
  | 'editorial'
  | 'news'
  | 'saas'
  | 'ecommerce'
  | 'service_business';

export interface VoiceRules {
  /** Treat the existing prose as a moat — do not propose rewrites. */
  preserveVoice: boolean;
  /** Suppress the "Adjective-to-Metric" corporate-jargon rewriter. */
  skipAdjectiveToMetric: boolean;
  /** Whether headline rewrites are appropriate for this register. */
  headlineRecommendationsAllowed: boolean;
  /** Always true — structured-data enrichment is universally safe. */
  schemaFocus: boolean;
  /** Whether tagline rewrites are appropriate for this register. */
  taglineRecommendationsAllowed: boolean;
}

export interface BrandTypeResult {
  type: SiteType;
  signals: Record<SiteType, number>;
  /** Margin between the winning type and the runner-up. Low = ambiguous. */
  confidence: number;
  voiceRules: VoiceRules;
}

const lower = (s: string) => s.toLowerCase();
const has = (re: RegExp, html: string) => re.test(html);
const count = (re: RegExp, html: string) => (html.match(re) || []).length;

// --- Editorial / news markers ---------------------------------------------

function hasByline(html: string): boolean {
  return (
    /\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(html) ||
    /rel=["']author["']/i.test(html) ||
    /\bbyline\b/i.test(html) ||
    /"@type"\s*:\s*"Person"/i.test(html)
  );
}

function hasFirstPersonVoice(html: string, text: string): boolean {
  // Editorial/founder-voice prose leans on first person far more than landing pages.
  return count(/\b(we|our|i|my)\b/gi, text) >= 5;
}

function hasDatedArticles(html: string): boolean {
  return (
    /<time[\s>]/i.test(html) ||
    /datetime\s*=/i.test(html) ||
    /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.test(html) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}/i.test(html)
  );
}

function hasSubscriptionFormWithoutPricing(html: string): boolean {
  const hasEmailCapture =
    /type=["']email["']/i.test(html) ||
    /\b(subscribe|newsletter|daily brief|sign up for|join \d|get the)\b/i.test(html);
  return hasEmailCapture && !hasPricing(html);
}

// --- SaaS markers -----------------------------------------------------------

function hasPricing(html: string): boolean {
  return /\$\s?\d+\s*(\/|per)\s*(mo|month|yr|year|user|seat)/i.test(html);
}

function hasPricingTable(html: string): boolean {
  return hasPricing(html) || /\bpricing\b/i.test(html);
}

function hasSignupButton(html: string): boolean {
  return /\b(sign ?up|get started|start (your )?free|free trial|book a demo|request a demo)\b/i.test(html);
}

function hasLoginSeparateFromSubscribe(html: string): boolean {
  const hasLogin = /\b(log ?in|sign ?in)\b/i.test(html);
  const hasSubscribe = /\b(sign ?up|subscribe|get started|free trial)\b/i.test(html);
  return hasLogin && hasSubscribe;
}

function hasFeaturesGrid(html: string): boolean {
  return /\bfeatures?\b/i.test(html) && /class=["'][^"']*(grid|features?|card)/i.test(html);
}

// --- Ecommerce markers ------------------------------------------------------

function hasCart(html: string): boolean {
  return /\b(add to cart|shopping (cart|bag)|checkout|your cart)\b/i.test(html);
}

function hasPriceWithBuyButton(html: string): boolean {
  return /\$\s?\d+/.test(html) && /\b(buy now|add to cart|add to bag|checkout)\b/i.test(html);
}

function schemaContains(html: string, type: string): boolean {
  return new RegExp(`"@type"\\s*:\\s*"${type}"`, 'i').test(html);
}

/**
 * Classify a site from its raw HTML. `text` (visible text only) can be passed
 * to sharpen first-person detection; if omitted, the HTML is used directly.
 */
export function classifySiteType(html: string, text?: string): BrandTypeResult {
  const h = html || '';
  const body = lower(text ?? h.replace(/<[^>]+>/g, ' '));

  const signals: Record<SiteType, number> = {
    editorial: 0,
    news: 0,
    saas: 0,
    ecommerce: 0,
    service_business: 0,
  };

  // Editorial
  if (hasByline(h)) signals.editorial += 2;
  if (hasFirstPersonVoice(h, body)) signals.editorial += 1;
  if (hasDatedArticles(h)) signals.editorial += 2;
  if (schemaContains(h, 'Article')) signals.editorial += 2;
  if (schemaContains(h, 'ProfilePage')) signals.editorial += 1;
  if (hasSubscriptionFormWithoutPricing(h)) signals.editorial += 1;

  // News (a stronger form of editorial)
  if (schemaContains(h, 'NewsArticle')) {
    signals.news += 3;
    signals.editorial += 1;
  }
  if (has(/\b(breaking|newsroom|press release|reporter|correspondent)\b/i, h)) signals.news += 1;

  // SaaS
  if (hasPricingTable(h)) signals.saas += 2;
  if (hasSignupButton(h)) signals.saas += 1;
  if (hasLoginSeparateFromSubscribe(h)) signals.saas += 2;
  if (hasFeaturesGrid(h)) signals.saas += 1;
  if (schemaContains(h, 'SoftwareApplication')) signals.saas += 2;

  // Ecommerce
  if (schemaContains(h, 'Product')) signals.ecommerce += 3;
  if (hasCart(h)) signals.ecommerce += 2;
  if (hasPriceWithBuyButton(h)) signals.ecommerce += 2;

  // Service business (consultancies, agencies, local services)
  if (has(/\b(our services|what we do|book a (call|consultation)|get a quote|contact us for)\b/i, h)) {
    signals.service_business += 2;
  }
  if (schemaContains(h, 'LocalBusiness') || schemaContains(h, 'ProfessionalService')) {
    signals.service_business += 3;
  }

  // Pick the winner. Ties resolve toward the more conservative (voice-preserving)
  // type, because a false "saas" classification damages brands while a false
  // "editorial" classification only withholds rewrites.
  const ordered = (Object.keys(signals) as SiteType[]).sort((a, b) => {
    if (signals[b] !== signals[a]) return signals[b] - signals[a];
    return CONSERVATISM[b] - CONSERVATISM[a];
  });
  const type = ordered[0];
  const confidence = signals[ordered[0]] - signals[ordered[1]];

  return { type, signals, confidence, voiceRules: voiceRulesFor(type) };
}

// Higher = more voice-preserving; used only as a tie-breaker.
const CONSERVATISM: Record<SiteType, number> = {
  editorial: 5,
  news: 4,
  service_business: 3,
  ecommerce: 2,
  saas: 1,
};

export function voiceRulesFor(siteType: SiteType): VoiceRules {
  if (siteType === 'editorial' || siteType === 'news') {
    return {
      preserveVoice: true,
      skipAdjectiveToMetric: true,
      headlineRecommendationsAllowed: false,
      schemaFocus: true,
      taglineRecommendationsAllowed: false,
    };
  }
  if (siteType === 'ecommerce') {
    return {
      preserveVoice: false,
      skipAdjectiveToMetric: false,
      headlineRecommendationsAllowed: true,
      schemaFocus: true,
      taglineRecommendationsAllowed: true,
    };
  }
  // saas + service_business
  return {
    preserveVoice: false,
    skipAdjectiveToMetric: false,
    headlineRecommendationsAllowed: true,
    schemaFocus: true,
    taglineRecommendationsAllowed: true,
  };
}

export function isVoicePreserving(siteType: SiteType): boolean {
  return voiceRulesFor(siteType).skipAdjectiveToMetric;
}
