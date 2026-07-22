/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { classifySiteType, type SiteType } from "../lib/brandType";
import { filterOfferCatalogString, type OfferFilterResult } from "../lib/offerCatalog";
import {
  extractPageText,
  sanitizeSchemaBlock,
  sanitizeRewrites,
  stripUngroundedNumbers,
  conditionalizeMetricInstruction,
} from "../lib/claimsSafety";
import {
  categoryFromAnswerQuality,
  filterCandidateQueries,
  recommendationFor,
  type GapCategory,
} from "../lib/queryGap";
import { evaluateCrawlerAccess, type CrawlerAccessResult } from "../lib/crawlerAccess";
import { detectPlatform } from "../lib/platformDetect";
import { evaluateIndexCoverage, type IndexCoverageResult } from "../lib/indexCoverage";

const apiKey = (import.meta.env.VITE_DEV_GEMINI_KEY as string) || (process.env.GEMINI_API_KEY as string) || "";
const ai = new GoogleGenAI({ apiKey });

export interface AnalysisResult {
  score: number;
  summary: string;
  criteria: {
    name: string;
    score: number;
    feedback: string;
  }[];
  recommendations: string[];
  citationProbability: number;
  schemaSnippet?: string;
  // Phase 2: Score Breakdown
  scoreBreakdown?: {
    entity: number;    // 0-100: Schema.org, OpenGraph, entity identity
    density: number;   // 0-100: Stats, percentages, citable facts
    clarity: number;   // 0-100: Direct answerability
    structure: number; // 0-100: Semantic HTML, headings
  };
  // Phase 3a: Citation Hook Density
  citationHookDensity?: {
    factualDensityScore: number;
    statsCount: number;
    percentagesCount: number;
    exampleHooks: string[];
  };
  // Phase 3a: E-E-A-T Author Audit
  eatAudit?: {
    authorFound: boolean;
    authorName: string | null;
    genericAuthorFlag: boolean;
    trustSignals: string[];
    warnings: string[];
    eatScore: number;
  };
  // Phase 3b: LLM Summarization Test
  llmSummarizationTest?: {
    metadataIntent: string;
    aiSummary: string;
    alignment: 'Aligned' | 'Vague' | 'Misaligned';
    explanation: string;
  };
  // Phase 3b: Zero-Click Predictor
  zeroClickPredictor?: {
    snippetOpportunities: { currentText: string; suggestedFormat: string; reason: string }[];
    featuredSnippetReadiness: number;
  };
  // Phase 3c: Query-to-Content Gap
  queryContentGap?: {
    generatedQuestions: {
      question: string;
      answered: boolean;
      answerQuality: string;
      // Change 4: distinguishes "content missing" from "present in prose but not
      // in FAQ schema". When present in prose, sourceQuote shows the exact text.
      gapCategory?: GapCategory;
      sourceQuote?: string;
    }[];
    gapScore: number;
    // Change 5: capabilities the site actually offers, used to scope queries.
    detectedCapabilities?: string[];
  };
  // Phase 3c: Semantic Chunking
  semanticChunking?: {
    longBlocks: { approximateWordCount: number; suggestedHeading: string; context: string }[];
    chunkingScore: number;
  };
  // Phase 4: Enhanced Actionable Reports
  comprehensiveSchema?: string;
  contentRewrites?: { current: string; proposed: string; page: string }[];
  metaDescriptionRewrite?: { current: string; suggested: string };
  implementationChecklist?: { category: string; action: string; priority: string }[];

  // Change 1: detected brand/register type. Gates voice recommendations.
  siteType?: SiteType;
  brandTypeSignals?: Record<string, number>;

  // Change 2: provenance-tagged schema. The "paste into <head>" block must only
  // contain detected values; inferred values go in the candidate block.
  verifiedSchema?: string;   // detected-only — safe to paste
  candidateSchema?: string;  // inferred fields — verify before pasting
  schemaProvenance?: {
    field: string;
    value: string;
    provenance: 'detected' | 'inferred' | 'user_required';
    sourceQuote?: string;  // exact page text supporting a detected value
    confidence: number;    // 0.0–1.0
  }[];

  // Change 3: offers stripped from the catalog (architecture terms / over cap).
  offerCatalogRemoved?: { name: string; reason: string }[];

  // Claims-safety: values the grounded-only backstop stripped because they were
  // not detected on the analyzed page (fabricated ratings/counts/claims). Shown
  // for transparency; the report never ships an ungrounded value.
  claimsSafetyRemoved?: { field: string; reason: string }[];

  // Change 6: for editorial/news sites, replaces voice rewrites with structured
  // data suggestions (the path to higher AEO for editorial brands).
  schemaDensityRecommendations?: { schemaType: string; reason: string; benefit: string }[];

  // Entity-graph / portfolio audit: AEO leverage is won at the entity level, not
  // the page level. Reciprocal sameAs, a single canonical founder Person reused
  // across a brand's properties, and consistent NAP let an LLM resolve the brand
  // to ONE authoritative knowledge-graph entity instead of a loose cluster.
  entityGraphAudit?: {
    sameAsFound: boolean;
    sameAsUrls: string[];        // profile URLs actually present on the page
    founderEntityFound: boolean;
    founderName: string | null;
    napConsistencyNote: string;
    recommendations: string[];   // portfolio-level entity-resolution actions
    score: number;               // 0-100 entity-graph strength
  };

  // Passage-level extractability: when an LLM lifts a standalone chunk, a
  // "We build…" sentence has no entity anchor. This flags pronoun-led passages
  // and proposes self-contained, entity-named answer sentences (re-expressing
  // only what's on the page) placed under question-shaped headings.
  passageExtractability?: {
    pronounHeavyPassages: { excerpt: string; issue: string; suggestedRewrite: string }[];
    selfContainedScore: number;  // 0-100
    guidance: string;
  };

  // Detected publishing stack (custom-coded vs a CMS). Drives whether the
  // Implementation Roadmap leads with code-repo guidance or CMS instructions.
  detectedPlatform?: {
    platform: 'wordpress' | 'shopify' | 'wix' | 'squarespace' | 'hubspot' | 'webflow' | 'custom' | 'unknown';
    isCustomCoded: boolean;
    signals: string[];
  };

  // Crawler access: deterministic robots.txt / llms.txt audit. When a
  // citation-critical AI bot is blocked, the headline score is CAPPED — a site
  // AI engines cannot read cannot be a "source of truth" no matter how good its
  // schema is. Computed from the site's robots.txt, not the LLM.
  crawlerAccess?: CrawlerAccessResult;
  // Set when the crawler-access gate capped the headline score; preserves the
  // model's original (uncapped) score for transparency.
  scoreBeforeCrawlerCap?: number;

  // Index-coverage & entity-disambiguation audit (WO-8): Bing Webmaster
  // verification signal, the non-JS server-render test (a client-rendered SPA
  // shell is invisible to answer engines), and sameAs/authority disambiguation.
  // Deterministic; complements crawlerAccess (allowed to crawl ≠ visible + found).
  indexCoverage?: IndexCoverageResult;
}

export interface CompetitiveResult {
  user: AnalysisResult;
  competitor: AnalysisResult;
  verdict: string;
  winner: 'user' | 'competitor' | 'tie';
}

// Flash models in priority order — best quality first, then stable fallbacks.
// Verified against https://ai.google.dev/gemini-api/docs/models (2026-07-22).
// 1. gemini-3.6-flash:       Latest (Jul 21 2026) — better quality + fewer output
//                            tokens than 3.5-flash, and cheaper ($1.50/$7.50 vs $1.50/$9.00).
// 2. gemini-3.5-flash:       Stable, most intelligent prior gen (fallback).
// 3. gemini-3.5-flash-lite:  Fastest/cheapest 3.5-class ($0.30/$2.50) (fallback).
// 4. gemini-2.5-flash:       Stable production fallback, always available.
const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
];

// Tolerant JSON parse for model output. Even with responseMimeType:json +
// responseSchema, the fallback flash models occasionally emit a trailing comma
// or wrap the object in prose/markdown fences, which crashes JSON.parse with
// "Expected double-quoted property name...". This salvages those common cases so
// a single malformed response doesn't fail the whole analysis.
export function safeJsonParse(raw: string | null | undefined): any {
  if (raw == null || String(raw).trim() === '') throw new Error('Empty AI response');
  let s = String(raw).trim();

  // Strip markdown code fences (```json ... ```).
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Fast path.
  try { return JSON.parse(s); } catch { /* fall through to salvage */ }

  // Extract the outermost JSON value (drop any leading/trailing prose).
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  let start = firstObj;
  if (firstArr !== -1 && (firstArr < firstObj || firstObj === -1)) start = firstArr;
  const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (start !== -1 && end > start) s = s.slice(start, end + 1);

  // Remove trailing commas before a closing } or ] (the common malformation).
  s = s.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(s);
}

async function generateWithFallback(prompt: string, schema: any): Promise<string> {
  let lastError: any;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          // Generous ceiling: the report payload (two JSON-LD blocks, provenance,
          // gap analysis, checklist) is large, AND Gemini 3.x Flash uses "medium"
          // thinking by default whose tokens also count against this budget. Too
          // low a cap truncates the JSON mid-string and breaks parsing. 3.5 Flash
          // supports up to 65k output tokens; 32k leaves ample headroom.
          maxOutputTokens: 32768
        }
      });
      if (response.text) return response.text;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.httpStatusCode;
      // Only fallback on capacity/rate errors — not on bad request or auth errors
      if (status === 503 || status === 429 || status === 'UNAVAILABLE' || err?.message?.includes('503') || err?.message?.includes('high demand')) {
        continue;
      }
      throw err; // Non-capacity error — don't retry with a different model
    }
  }
  throw lastError || new Error("All AI models are currently unavailable. Please try again in a few minutes.");
}

export interface CrawlerInputs {
  robotsTxt?: string | null;
  llmsTxtFound?: boolean;
  xRobotsTag?: string | null;
  contentSignal?: string | null;
  isCloudflare?: boolean;
}

/** Detect a page-level noindex directive in raw HTML (meta robots/googlebot). */
export function hasNoindexMeta(html: string): boolean {
  return /<meta[^>]+name=["'](?:robots|googlebot)["'][^>]*content=["'][^"']*\b(?:noindex|none)\b/i.test(String(html || ''));
}

export async function analyzeWebsite(url: string, html: string, crawler?: CrawlerInputs): Promise<AnalysisResult> {
  const truncatedHtml = html.substring(0, 15000);

  // Deterministic crawler-access audit from robots.txt / llms.txt / edge signals.
  // Computed regardless of the LLM; feeds the score cap in applyAccuracyGuards.
  const crawlerAccess = evaluateCrawlerAccess({
    robotsTxt: crawler?.robotsTxt,
    llmsTxtFound: crawler?.llmsTxtFound,
    xRobotsTag: crawler?.xRobotsTag,
    contentSignal: crawler?.contentSignal,
    isCloudflare: crawler?.isCloudflare,
    metaRobotsNoindex: hasNoindexMeta(html),
  });

  // --- Change 1: classify the brand/register type BEFORE generating any
  // recommendations. This gates whether voice rewrites are allowed. ---
  const brand = classifySiteType(html);
  const isEditorial = brand.type === 'editorial' || brand.type === 'news';

  // Shared guidance injected into both prompts so every recommendation respects
  // the detected register and the facts-vs-inferences discipline. This is
  // RECOMMENDATION/DIAGNOSTIC guidance — it must not bias the numeric score
  // (see scoringDiscipline below, which governs the score/scoreBreakdown call).
  const brandGuidance = `
    DETECTED SITE TYPE: ${brand.type}${isEditorial ? ' (EDITORIAL/NEWS — voice is a moat)' : ''}.

    CRITICAL RULES FOR THIS SITE TYPE (these guide RECOMMENDATIONS and DIAGNOSTICS, not the numeric score):
    ${isEditorial ? `- This is an EDITORIAL or NEWS brand. Its prose voice is its primary differentiation. DO NOT propose rewriting taglines, headlines, or hero copy into corporate/SaaS register. Frontier LLMs rank natural editorial prose HIGHER than adjective-to-metric translations for citation quality. The path to higher AEO here is STRUCTURED DATA enrichment (schema), NOT voice translation. Any recommendation that says "rewrite X to sound more data-driven" is WRONG for this site.`
      : `- This is a ${brand.type} site. Conversion-oriented headline/tagline improvements are appropriate where they add specificity.`}
    - FACTS vs INFERENCES: Never state a value (enum, regime label, price, status name) as fact unless that exact string literally appears in the page content. If you must guess, mark it clearly as inferred. Do NOT invent product status names, tiers, or feature names that are not on the page.
    - CAPABILITY SCOPING: Only discuss capabilities the site actually offers. Do NOT recommend creating content about features the site clearly does not have (e.g. a mobile app, international coverage) unless the question is universally useful (pricing, founder, contact, compliance).
  `;

  // Option C: keep scoring brand-aware ON PURPOSE, but with SCORING-specific
  // calibration rather than the recommendation preamble above. This isolates the
  // headline number from advice framing (so the score stays comparable over
  // time) while still fixing the one place brand register legitimately belongs
  // in scoring: not penalizing editorial prose for an absence of hard numerals.
  const scoringDiscipline = `
    SCORING DISCIPLINE (applies to "score" and "scoreBreakdown" ONLY):
    The site-type notes above guide recommendations and diagnostics; they must NOT inflate or deflate the numeric score. Score this site on objective AEO merits exactly as you would any site, with ONE deliberate calibration for the density sub-score:
    ${isEditorial
      ? '- This is an editorial/news brand. Judge "density" on citable factual SUBSTANCE — specific, quotable, calibrated claims — NOT on the raw count of statistics or percentages. Do NOT penalize density merely because the prose uses few numerals; well-calibrated editorial prose that an AI would readily quote should score well on density.'
      : '- Judge "density" on citable factual substance: statistics, specifications, named entities, dates, and concrete measurable claims.'}
  `;

  // --- Call 1: Core analysis + advanced diagnostics (proven v1.2 prompt) ---
  const corePrompt = `
    Analyze the following website content for "Answer Engine Optimization" (AEO).
    AEO is the practice of making a website the primary "Source of Truth" for AI agents (Gemini, GPT, etc.).

    Website URL: ${url}
    ${brandGuidance}

    HTML Content (truncated):
    ${truncatedHtml}

    Evaluate based on:
    1. Semantic HTML structure.
    2. Presence of structured data (Schema.org).
    3. Clear metadata (OpenGraph).
    4. Content clarity and factual density.
    5. Citation Likelihood: How likely is an AI to cite this page as a source?

    Return a JSON object with ALL of the following fields:

    CORE FIELDS:
    - score: Overall AEO score (0-100). MUST equal: entity*0.3 + density*0.3 + clarity*0.2 + structure*0.2 (rounded).
    - summary: Executive summary for a CMO.
    - criteria: Array of {name, score (0-10), feedback}.
    - recommendations: List of specific, actionable steps.
    - citationProbability: Percentage (0-100) of how likely this site is to be cited for its core topic.
    - schemaSnippet: A COMPLETE, ready-to-deploy JSON-LD block using ONLY values that literally appear on the page (no inferred names). Use @type Organization with name, url, and logo (use actual logo URL if found in the HTML, otherwise use a placeholder path). Include hasOfferCatalog with @type OfferCatalog listing ONLY user-facing services — things a customer can actually sign up for, buy, or use (a dedicated page, a CTA, or something the hero says you "get"). DO NOT list internal architecture as services (anything named "...Layer", "...Engine", "...Framework", "...Model", "...Pipeline", "...System" is internal, not a buyable service). List AT MOST 4 offers; if the page has more user-facing services, keep the 4 strongest. Each item MUST have a "name" using industry-standard terminology and a "description" with technical specifics drawn from the page (not marketing adjectives, not invented specs). Include areaServed. Output valid JSON only (no script tags).

    ${scoringDiscipline}

    SCORE BREAKDOWN (scoreBreakdown object):
    - entity (0-100): Schema.org presence, OpenGraph tags, entity identity clarity
    - density (0-100): Statistics, percentages, citable facts density
    - clarity (0-100): How directly and clearly the content answers questions
    - structure (0-100): Semantic HTML quality, heading hierarchy

    CITATION HOOK DENSITY (citationHookDensity object):
    - factualDensityScore (0-100): How rich the content is with citable facts
    - statsCount: Number of statistics found
    - percentagesCount: Number of percentages found
    - exampleHooks: Top 3 most citable sentences from the content

    E-E-A-T AUTHOR AUDIT (eatAudit object):
    - authorFound: Whether author attribution exists
    - authorName: The author name if found, null otherwise
    - genericAuthorFlag: True if author is generic ("Admin", "Staff", "Team")
    - trustSignals: Array of trust signals found (LinkedIn links, credentials, Schema.org/Person, etc.)
    - warnings: Array of E-E-A-T warnings
    - eatScore (0-100): Overall trust signal score

    LLM SUMMARIZATION TEST (llmSummarizationTest object):
    - metadataIntent: What the meta title/description says the page is about
    - aiSummary: What you (the AI) actually understand the page content to be about
    - alignment: "Aligned", "Vague", or "Misaligned"
    - explanation: Why the alignment is what it is

    ZERO-CLICK PREDICTOR (zeroClickPredictor object):
    - snippetOpportunities: Array of {currentText, suggestedFormat, reason} — text blocks that should be tables/lists for Featured Snippets
    - featuredSnippetReadiness (0-100): How ready the content is for featured snippets

    QUERY-TO-CONTENT GAP (queryContentGap object):
    - detectedCapabilities: Array of short strings naming the capabilities/services/features this site ACTUALLY offers (e.g. "daily email brief", "interactive diagnostic tool"). Derive these only from the page — do not invent.
    - generatedQuestions: Array of 8-10 objects {question, answered (bool), answerQuality, gapCategory, sourceQuote}. TWO-PASS GENERATION:
        Pass 1 — generate candidate questions a customer or AI agent would ask about THIS business.
        Pass 2 — keep ONLY questions that (a) reference a capability in detectedCapabilities, OR (b) are universally useful (pricing, "is it free", founder/who-is-behind, how to contact, update frequency, compliance/regulation, how to sign up/cancel, refunds, support). DROP questions about features the site clearly does NOT offer (e.g. "is there a mobile app?", "do you cover international markets?") — asking these only produces content-bloat recommendations. Better to return 8 relevant questions than 10 with irrelevant ones. NEVER invent a question about a non-existent feature just to reach a count.
      For each kept question set:
        - answerQuality: "Strong" (clearly answered with specifics, in prose AND structured/FAQ format), "Partial" (mentioned but vague/incomplete), "Missing" (not addressed anywhere on the page).
        - gapCategory: ONE OF "strong", "schema_only", "partial", "missing".
            * "schema_only" = the answer IS present in the page prose, but NOT wrapped in FAQPage/structured schema. This is the key distinction: do NOT mark something "missing" just because it lacks FAQ schema. Example: a page that says "Free. Forever. No paywall." answers a pricing question in prose → gapCategory "schema_only", NOT "missing".
            * "missing" = the answer is genuinely nowhere on the page.
            * "strong" = answered in both prose and structured format.
            * "partial" = incomplete.
        - sourceQuote: For "schema_only" and "strong", include the EXACT text from the page that answers the question (so the user can verify). Empty string for "missing".
    - gapScore (0-100): 100 = all questions answered strongly, 0 = none answered

    SEMANTIC CHUNKING (semanticChunking object):
    - longBlocks: Array of {approximateWordCount, suggestedHeading, context} — content blocks >150 words without proper headings
    - chunkingScore (0-100): 100 = perfectly chunked with clear headings, 0 = wall of text
  `;

  const coreSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      summary: { type: Type.STRING },
      criteria: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["name", "score", "feedback"]
        }
      },
      recommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      citationProbability: { type: Type.NUMBER },
      schemaSnippet: { type: Type.STRING },
      scoreBreakdown: {
        type: Type.OBJECT,
        properties: {
          entity: { type: Type.NUMBER },
          density: { type: Type.NUMBER },
          clarity: { type: Type.NUMBER },
          structure: { type: Type.NUMBER }
        },
        required: ["entity", "density", "clarity", "structure"]
      },
      citationHookDensity: {
        type: Type.OBJECT,
        properties: {
          factualDensityScore: { type: Type.NUMBER },
          statsCount: { type: Type.NUMBER },
          percentagesCount: { type: Type.NUMBER },
          exampleHooks: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["factualDensityScore", "statsCount", "percentagesCount", "exampleHooks"]
      },
      eatAudit: {
        type: Type.OBJECT,
        properties: {
          authorFound: { type: Type.BOOLEAN },
          authorName: { type: Type.STRING, nullable: true },
          genericAuthorFlag: { type: Type.BOOLEAN },
          trustSignals: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          eatScore: { type: Type.NUMBER }
        },
        required: ["authorFound", "genericAuthorFlag", "trustSignals", "warnings", "eatScore"]
      },
      llmSummarizationTest: {
        type: Type.OBJECT,
        properties: {
          metadataIntent: { type: Type.STRING },
          aiSummary: { type: Type.STRING },
          alignment: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["metadataIntent", "aiSummary", "alignment", "explanation"]
      },
      zeroClickPredictor: {
        type: Type.OBJECT,
        properties: {
          snippetOpportunities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                currentText: { type: Type.STRING },
                suggestedFormat: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["currentText", "suggestedFormat", "reason"]
            }
          },
          featuredSnippetReadiness: { type: Type.NUMBER }
        },
        required: ["snippetOpportunities", "featuredSnippetReadiness"]
      },
      queryContentGap: {
        type: Type.OBJECT,
        properties: {
          generatedQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answered: { type: Type.BOOLEAN },
                answerQuality: { type: Type.STRING },
                gapCategory: { type: Type.STRING },
                sourceQuote: { type: Type.STRING }
              },
              required: ["question", "answered", "answerQuality", "gapCategory"]
            }
          },
          detectedCapabilities: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          gapScore: { type: Type.NUMBER }
        },
        required: ["generatedQuestions", "gapScore"]
      },
      semanticChunking: {
        type: Type.OBJECT,
        properties: {
          longBlocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                approximateWordCount: { type: Type.NUMBER },
                suggestedHeading: { type: Type.STRING },
                context: { type: Type.STRING }
              },
              required: ["approximateWordCount", "suggestedHeading", "context"]
            }
          },
          chunkingScore: { type: Type.NUMBER }
        },
        required: ["longBlocks", "chunkingScore"]
      }
    },
    required: ["score", "summary", "criteria", "recommendations", "citationProbability", "schemaSnippet", "scoreBreakdown", "citationHookDensity", "eatAudit", "llmSummarizationTest", "zeroClickPredictor", "queryContentGap", "semanticChunking"]
  };

  // --- Call 2: Enhanced report fields (v1.3) — runs in parallel ---
  const enhancedPrompt = `
    Analyze the following website content and generate enhanced AEO (Answer Engine Optimization) report data.

    Website URL: ${url}
    ${brandGuidance}

    HTML Content (truncated):
    ${truncatedHtml}

    Return a JSON object with ALL of the following fields:

    PROVENANCE-TAGGED SCHEMA (Change 2 — the most important discipline here):
    You will produce TWO separate JSON-LD blocks. NEVER mix detected and inferred values in the same block.

    - verifiedSchema (string): A COMPLETE, paste-ready JSON-LD document that connects EVERY detected entity into ONE @graph (not disconnected blocks). Shape:
      {"@context":"https://schema.org","@graph":[ ...nodes... ]}
      GRAPH + @id DISCIPLINE:
        * Give each node a stable @id anchored to the site URL (e.g. "${url}#organization", "${url}#website", "${url}#founder", "${url}#product-1") and CROSS-REFERENCE nodes with {"@id":"..."} instead of duplicating objects. The WebSite's publisher is {"@id":".../#organization"}; each product's provider/publisher is {"@id":".../#organization"}; the Organization's founder is {"@id":".../#founder"}.
      @type DISCIPLINE (choose correctly — this is a common failure):
        * The company/brand entity → Organization (use a specific subtype like ProfessionalService only when clearly applicable).
        * A SaaS product, app, downloadable, or online tool → SoftwareApplication (include applicationCategory + operatingSystem when derivable from the page).
        * A human-delivered offering (assessment, consulting, done-for-you work) → Service.
        * The site itself → WebSite (name, url, publisher {@id organization}). Add "potentialAction" of @type SearchAction ONLY if the page actually exposes an on-site search box/endpoint.
        * The founder/author, when a real person's name appears on the page → Person (name; add "sameAs" ONLY for profile URLs that literally appear as links on the page).
      PRICES (do NOT use the weak "priceRange" string): when a real price literally appears on the page, express it as a structured Offer. Recurring: "offers":{"@type":"Offer","price":"49","priceCurrency":"USD","priceSpecification":{"@type":"UnitPriceSpecification","price":"49","priceCurrency":"USD","referenceQuantity":{"@type":"QuantitativeValue","value":1,"unitCode":"MON"}}}. One-time: a plain Offer with price + priceCurrency. If NO real price is on the page, OMIT offers entirely — never invent a price or a range.
      OFFER CATALOG: hasOfferCatalog lists ONLY user-facing services a customer can sign up for / buy / use. EXCLUDE internal architecture (names containing Layer/Engine/Framework/Model/Pipeline/System/Architecture/Algorithm/Module). List AT MOST 4 (keep the strongest).
      GROUNDING: every name/description/price/sameAs uses values drawn from the page. NEVER include aggregateRating, ratingValue, reviewCount, or review unless those exact numbers literally appear on the page. If you cannot verify a value, it does NOT belong here. Valid JSON only, no script tags, no markdown.

    - candidateSchema (string): A SEPARATE JSON-LD block (same {"@context":...,"@graph":[...]} shape, or "" if none) containing inferred STRUCTURE only — schema nodes the site SHOULD add but whose values need human confirmation. Good candidates: a WebSite SearchAction if search likely exists, a BreadcrumbList reflecting the site's real navigation, plausible additional service names/descriptions. Each inferred node should carry "_meta":{"provenance":"inferred","warning":"Inferred structure, not detected on the page. Verify before publishing."}. ABSOLUTE RULE: NEVER put a concrete fabricated NUMBER in this block — no ratingValue, reviewCount, ratingCount, aggregateRating, price, user/student/customer count, founding year, or any statistic not literally on the page. Do NOT emit "plausible"/"example" numbers (e.g. ratingValue "4.9", reviewCount "120") even though this block is labeled "verify before pasting" — a labeled fake is still pasted. If a field needs a value you cannot verify, use an explicit empty placeholder string like "<only if you have real, verifiable reviews>", never a number. If everything was detected, return "".

    - schemaProvenance (array): For each significant field you put in EITHER block, an object {field, value, provenance ("detected"|"inferred"|"user_required"), sourceQuote (exact page text supporting a detected value, else ""), confidence (0.0-1.0)}. This lets the user audit the schema.

    ENTITY-GRAPH / PORTFOLIO AUDIT (entityGraphAudit object):
    AEO leverage is won at the ENTITY level, not the page level. An LLM should resolve this brand to ONE authoritative knowledge-graph entity, not a loose cluster. Assess:
    - sameAsFound (bool): does the page link to the brand's own profiles (LinkedIn, X/Twitter, GitHub, YouTube, Crunchbase, etc.) OR include sameAs in existing schema?
    - sameAsUrls (string[]): the profile/social URLs that LITERALLY appear as links on the page (empty array if none — do NOT invent URLs).
    - founderEntityFound (bool): is a real, named founder/author (a Person) present on the page?
    - founderName (string|null): that person's name if present, else null.
    - napConsistencyNote (string): one line on whether the business name / contact / location (NAP) or a canonical identifier is presented consistently and unambiguously.
    - recommendations (string[]): 2-4 PORTFOLIO-level actions to strengthen entity resolution — e.g. reciprocal sameAs linking sibling properties back to a single hub entity, ONE canonical founder Person (same @id) reused across all properties, consistent NAP + @id cross-references. Ground strictly in what's on the page; never fabricate profile URLs, counts, or a portfolio the page doesn't imply.
    - score (0-100): entity-graph strength.

    PASSAGE-LEVEL EXTRACTABILITY (passageExtractability object):
    When an LLM lifts a standalone chunk to cite it, a pronoun-led sentence ("We build and operate…") has no entity anchor and is far less citable than "<BrandName> builds and operates…". Assess:
    - pronounHeavyPassages (array of {excerpt, issue, suggestedRewrite}): 2-4 passages from the ACTUAL page that lead with we/our/us/it and lack a self-contained entity anchor. excerpt = the exact page text (<=200 chars). issue = why it fails when extracted out of context. suggestedRewrite = the SAME sentence made self-contained by naming the entity/subject — re-express ONLY what is on the page; do NOT add any number, statistic, rating, or claim not already present. This is surgical entity-anchoring, NOT a voice change.
    - selfContainedScore (0-100): how well passages stand alone with entity anchors.
    - guidance (string): one line recommending self-contained, entity-named answer sentences placed under question-shaped (H2/H3) headings.

    META DESCRIPTION REWRITE (metaDescriptionRewrite object):
    - current: Extract the actual meta description from the page (or note if missing)
    - suggested: Rewrite it to replace marketing fluff with technical specifics, keeping under 160 characters

    ${isEditorial ? `SCHEMA-DENSITY RECOMMENDATIONS (schemaDensityRecommendations array) — REQUIRED for this editorial/news site:
    This site's voice is a moat. DO NOT propose prose rewrites. Instead, recommend 4-6 STRUCTURED DATA additions that raise AEO without touching the prose. Each item: {schemaType (e.g. "FAQPage", "NewsArticle", "Person", "ProfilePage", "BreadcrumbList"), reason (why it helps for this specific site), benefit (the concrete AEO outcome)}. Return contentRewrites as an EMPTY array — voice rewrites are forbidden for editorial brands.`
      : `CONTENT REWRITES (contentRewrites array):
    Identify 3-5 sentences or phrases from the ACTUAL analyzed content that use vague marketing language ("cutting-edge", "industry-leading", "best-in-class", "dynamic", "fast-growing", etc.). For each, provide:
    - current: The exact text from the page (Low Citation version)
    - proposed: A rewritten version that surfaces specifics ALREADY PRESENT on the page (real metrics, protocols, specs, named technologies) more citably (High Citation version)
    - page: The page section or context where this text appears
    GROUNDING RULE (critical): A rewrite may ONLY re-express facts, numbers, sources, or specifications that appear verbatim or near-verbatim in the source page. Do NOT introduce ANY new quantitative claim, statistic, percentage, pass rate, success rate, outcome, guarantee, rating, certification, or capability that is not already in the source content. Inventing "a pass rate matching the 70% industry average" or "average exam score indicators" when the page does not state them is FALSE ADVERTISING — never do it. If a vague phrase has no underlying detected fact to substitute, either leave it unchanged or recommend a STRUCTURAL change (heading, list, schema) instead — never fabricate a number. If you cannot find 3 phrases with a real underlying fact to surface, return fewer (or an empty array). Quality over quantity.
    Return schemaDensityRecommendations as an empty array.`}

    IMPLEMENTATION CHECKLIST (implementationChecklist array):
    Provide 5-8 specific, actionable items categorized as Technical, Authority, Structural, Editorial, or Coverage. Each item has:
    - category: One of "Technical", "Authority", "Structural", "Editorial", "Coverage"
    - action: The specific action to take (e.g., "Paste the VERIFIED JSON-LD into the site header")
    - priority: "High", "Medium", or "Low"
    NEVER instruct the site to ADD statistics, ratings, reviews, star counts, pass rates, or performance metrics it may not actually have. If surfacing metrics is relevant, phrase it conditionally — e.g. "If you have verifiable, substantiated metrics (real pass rates, real review counts), surface them in schema; otherwise do not add them." Do not advise publishing any number a site cannot prove.
  `;

  const enhancedSchema = {
    type: Type.OBJECT,
    properties: {
      verifiedSchema: { type: Type.STRING },
      candidateSchema: { type: Type.STRING },
      schemaProvenance: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            field: { type: Type.STRING },
            value: { type: Type.STRING },
            provenance: { type: Type.STRING },
            sourceQuote: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["field", "value", "provenance", "confidence"]
        }
      },
      contentRewrites: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.STRING },
            proposed: { type: Type.STRING },
            page: { type: Type.STRING }
          },
          required: ["current", "proposed", "page"]
        }
      },
      schemaDensityRecommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            schemaType: { type: Type.STRING },
            reason: { type: Type.STRING },
            benefit: { type: Type.STRING }
          },
          required: ["schemaType", "reason", "benefit"]
        }
      },
      entityGraphAudit: {
        type: Type.OBJECT,
        properties: {
          sameAsFound: { type: Type.BOOLEAN },
          sameAsUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
          founderEntityFound: { type: Type.BOOLEAN },
          founderName: { type: Type.STRING, nullable: true },
          napConsistencyNote: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          score: { type: Type.NUMBER }
        },
        required: ["sameAsFound", "founderEntityFound", "recommendations", "score"]
      },
      passageExtractability: {
        type: Type.OBJECT,
        properties: {
          pronounHeavyPassages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                excerpt: { type: Type.STRING },
                issue: { type: Type.STRING },
                suggestedRewrite: { type: Type.STRING }
              },
              required: ["excerpt", "issue", "suggestedRewrite"]
            }
          },
          selfContainedScore: { type: Type.NUMBER },
          guidance: { type: Type.STRING }
        },
        required: ["pronounHeavyPassages", "selfContainedScore", "guidance"]
      },
      metaDescriptionRewrite: {
        type: Type.OBJECT,
        properties: {
          current: { type: Type.STRING },
          suggested: { type: Type.STRING }
        },
        required: ["current", "suggested"]
      },
      implementationChecklist: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            action: { type: Type.STRING },
            priority: { type: Type.STRING }
          },
          required: ["category", "action", "priority"]
        }
      }
    },
    required: ["verifiedSchema", "metaDescriptionRewrite", "implementationChecklist"]
  };

  // Run both calls in parallel for no added latency
  const [coreText, enhancedText] = await Promise.all([
    generateWithFallback(corePrompt, coreSchema),
    generateWithFallback(enhancedPrompt, enhancedSchema).catch(() => null)
  ]);

  if (!coreText) throw new Error("AI failed to generate a response.");
  const coreResult: AnalysisResult = safeJsonParse(coreText);

  // Merge enhanced fields if available
  if (enhancedText) {
    try {
      const enhanced = safeJsonParse(enhancedText);
      Object.assign(coreResult, enhanced);
    } catch {
      // Enhanced fields are optional — core analysis still works
    }
  }

  coreResult.crawlerAccess = crawlerAccess;
  coreResult.detectedPlatform = detectPlatform(html);

  // Index-coverage audit (WO-8) is computed inside applyAccuracyGuards (after the
  // sameAs grounding step), using the FULL server HTML + the analyzed URL.
  return applyAccuracyGuards(coreResult, brand, html, url);
}

/**
 * Deterministic post-processing that enforces the Part-3 accuracy rules in code,
 * regardless of what the model returned. The prompts ask for the right behavior;
 * these guards guarantee it (the LLM is not trusted to be perfectly compliant).
 */
export function applyAccuracyGuards(
  result: AnalysisResult,
  brand: ReturnType<typeof classifySiteType>,
  // The analyzed page's raw HTML. When provided, the grounded-only claims-safety
  // backstop runs: no number/rating/claim survives unless it is on the page.
  // Optional so unit tests of the other guards can omit it.
  pageHtml?: string,
  // The analyzed URL — only used to phrase index-coverage disambiguation advice
  // (brand-name domain fallback). Optional; omitted by unit tests of other guards.
  pageUrl?: string
): AnalysisResult {
  const isEditorial = brand.type === 'editorial' || brand.type === 'news';

  // Change 1: record the detected brand type for the UI/report.
  result.siteType = brand.type;
  result.brandTypeSignals = brand.signals;

  // Crawler-access gate: if a citation-critical AI bot is blocked, CAP the
  // headline score. A page the answer engines cannot read cannot be their
  // "source of truth", regardless of how strong its schema/content is. We cap
  // only the headline `score` (scoreBreakdown stays diagnostic) and surface the
  // fix at the top of the recommendations so it's impossible to miss.
  const CRAWLER_BLOCK_SCORE_CAP = 40;
  if (result.crawlerAccess) {
    const ca = result.crawlerAccess;
    if (ca.criticalBlock && typeof result.score === 'number' && result.score > CRAWLER_BLOCK_SCORE_CAP) {
      result.scoreBeforeCrawlerCap = result.score;
      result.score = CRAWLER_BLOCK_SCORE_CAP;
      const capNote = `⚠️ AI crawlers are blocked: ${ca.summary} (Score capped at ${CRAWLER_BLOCK_SCORE_CAP} until crawler access is fixed.) `;
      result.summary = capNote + (result.summary || '');
    }
    // Surface crawler-access fixes at the top of the recommendation list.
    if (ca.recommendations.length > 0 && Array.isArray(result.recommendations)) {
      const existing = new Set(result.recommendations);
      const toAdd = ca.recommendations.filter((r) => !existing.has(r));
      result.recommendations = [...toAdd, ...result.recommendations];
    }
  }

  // Change 3: strip internal-architecture offers and cap the catalog at 4 on
  // EVERY generated JSON-LD block. Disclose what was removed.
  const removed: { name: string; reason: string }[] = [];
  const collectRemoved = (r: OfferFilterResult['removed']) =>
    r.forEach((x) =>
      removed.push({
        name: x.name,
        reason: x.reason === 'architecture' ? 'internal architecture, not a user-facing service' : 'over the 4-service cap',
      })
    );

  if (result.schemaSnippet) {
    const { schema, removed: r } = filterOfferCatalogString(result.schemaSnippet);
    result.schemaSnippet = schema;
    collectRemoved(r);
  }
  if (result.verifiedSchema) {
    const { schema, removed: r } = filterOfferCatalogString(result.verifiedSchema);
    result.verifiedSchema = schema;
    collectRemoved(r);
  }
  // Back-compat: existing UI/DOCX read comprehensiveSchema. Point it at the
  // verified (safe-to-paste) block so nothing downstream ships inferred values.
  if (result.verifiedSchema) {
    result.comprehensiveSchema = result.verifiedSchema;
  } else if (result.comprehensiveSchema) {
    const { schema, removed: r } = filterOfferCatalogString(result.comprehensiveSchema);
    result.comprehensiveSchema = schema;
    collectRemoved(r);
  }
  if (removed.length > 0) {
    // De-dupe by name.
    const seen = new Set<string>();
    result.offerCatalogRemoved = removed.filter((x) => {
      const k = x.name.toLowerCase();
      if (!x.name || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Change 6: voice rewrites are forbidden for editorial/news brands. Even if the
  // model returned them, drop them so a brand owner never sees a wrong rewrite.
  if (isEditorial && result.contentRewrites && result.contentRewrites.length > 0) {
    result.contentRewrites = [];
  }

  // Change 4 + 5: normalize the query gap.
  if (result.queryContentGap) {
    const qcg = result.queryContentGap;
    const capabilities = qcg.detectedCapabilities || [];

    // Change 5: drop questions about features the site doesn't offer (unless
    // universally useful). Belt-and-suspenders over the prompt's two-pass scoping.
    if (capabilities.length > 0 && Array.isArray(qcg.generatedQuestions)) {
      const questionStrings = qcg.generatedQuestions.map((q) => q.question);
      const keep = new Set(filterCandidateQueries(questionStrings, capabilities));
      const filtered = qcg.generatedQuestions.filter((q) => keep.has(q.question));
      // Never blank the section entirely if the filter is too aggressive.
      if (filtered.length >= 3) qcg.generatedQuestions = filtered;
    }

    // Change 4: ensure every question has a gapCategory (back-fill legacy/missing).
    for (const q of qcg.generatedQuestions || []) {
      if (!q.gapCategory) {
        q.gapCategory = categoryFromAnswerQuality(q.answerQuality, !!q.sourceQuote);
      }
      // If the model marked something "missing" but gave a source quote, it is
      // actually present in prose → schema_only, not content-missing.
      if (q.gapCategory === 'missing' && q.sourceQuote && q.sourceQuote.trim().length > 0) {
        q.gapCategory = 'schema_only';
      }
    }
  }

  // --- Grounded-only claims-safety backstop (runbook FIX 3) -----------------
  // Runs over the FULL assembled report. Nothing that the report emits as data
  // may contain a number, rating, or claim that is not on the analyzed page.
  // Gated on pageHtml so the other guards stay unit-testable in isolation.
  if (pageHtml) {
    const pageText = extractPageText(pageHtml);
    const removed: { field: string; reason: string }[] = [];

    // 1. Strip fabricated ratings/reviews and ungrounded numeric values from
    //    every generated JSON-LD block (including the "candidate" block — a
    //    labeled fake is still a fake people paste).
    for (const key of ['schemaSnippet', 'verifiedSchema', 'candidateSchema', 'comprehensiveSchema'] as const) {
      const block = result[key];
      if (typeof block === 'string' && block.trim()) {
        const { schema, stripped } = sanitizeSchemaBlock(block, pageText);
        result[key] = schema;
        stripped.forEach((s) => removed.push({ field: `${key}.${s.field}`, reason: s.reason }));
      }
    }
    // Keep the back-compat paste target pointed at the sanitized verified block.
    if (result.verifiedSchema && result.verifiedSchema.trim()) {
      result.comprehensiveSchema = result.verifiedSchema;
    }

    // 2. Drop rewrites that invent numbers / unverifiable claims not on the page.
    if (result.contentRewrites && result.contentRewrites.length > 0) {
      const { kept, dropped } = sanitizeRewrites(result.contentRewrites, pageText);
      result.contentRewrites = kept;
      dropped.forEach((d) =>
        removed.push({ field: `contentRewrite (${d.rewrite.page})`, reason: d.reason })
      );
    }

    // 3. Strip ungrounded numbers from the meta-description rewrite.
    if (result.metaDescriptionRewrite?.suggested) {
      const { text, removed: nums } = stripUngroundedNumbers(
        result.metaDescriptionRewrite.suggested,
        pageText,
        result.metaDescriptionRewrite.current
      );
      if (nums.length > 0) {
        result.metaDescriptionRewrite.suggested = text;
        removed.push({ field: 'metaDescriptionRewrite', reason: `ungrounded number(s) removed: ${nums.join(', ')}` });
      }
    }

    // 4. Reframe checklist + recommendation items that tell the site to ADD
    //    stats/ratings/reviews unconditionally (which invites fabrication).
    if (result.implementationChecklist) {
      for (const item of result.implementationChecklist) {
        const { text, changed } = conditionalizeMetricInstruction(item.action);
        if (changed) {
          item.action = text;
          removed.push({ field: 'implementationChecklist', reason: 'reframed "add metrics" advice as conditional on verifiable data' });
        }
      }
    }
    if (Array.isArray(result.recommendations)) {
      result.recommendations = result.recommendations.map((rec) => {
        const { text } = conditionalizeMetricInstruction(rec);
        return text;
      });
    }

    // 5. Passage rewrites re-express page prose — strip any number they invent.
    if (result.passageExtractability?.pronounHeavyPassages) {
      for (const p of result.passageExtractability.pronounHeavyPassages) {
        const { text, removed: nums } = stripUngroundedNumbers(p.suggestedRewrite, pageText, p.excerpt);
        if (nums.length > 0) {
          p.suggestedRewrite = text;
          removed.push({ field: 'passageExtractability', reason: `ungrounded number(s) removed: ${nums.join(', ')}` });
        }
      }
    }

    // 6. Entity-graph sameAs URLs must actually appear on the page (no invented
    //    profile links). Compare against the raw HTML (hrefs), not stripped text.
    if (result.entityGraphAudit?.sameAsUrls?.length) {
      const haystack = pageHtml.toLowerCase();
      const keep = result.entityGraphAudit.sameAsUrls.filter((u) => {
        const needle = String(u).toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        return needle.length > 3 && haystack.includes(needle);
      });
      if (keep.length !== result.entityGraphAudit.sameAsUrls.length) {
        removed.push({ field: 'entityGraphAudit.sameAsUrls', reason: 'profile URL(s) not found on the page were removed' });
      }
      result.entityGraphAudit.sameAsUrls = keep;
      if (keep.length === 0) result.entityGraphAudit.sameAsFound = false;
    }

    if (removed.length > 0) result.claimsSafetyRemoved = removed;

    // Index-coverage audit (WO-8): Bing verification signal + non-JS render test
    // + entity disambiguation. Runs here so the sameAs URLs it reads are already
    // grounded to the page (above). Uses the full server HTML — exactly what a
    // JS-less bot receives.
    result.indexCoverage = evaluateIndexCoverage({
      html: pageHtml,
      url: pageUrl || '',
      isCustomCoded: result.detectedPlatform?.isCustomCoded,
      sameAsUrls: result.entityGraphAudit?.sameAsUrls,
    });
    // Surface its recommendations in the main list (appended: the crawler-access
    // block, if any, stays first, and the dedicated card renders these up top).
    if (result.indexCoverage.recommendations.length > 0 && Array.isArray(result.recommendations)) {
      const existing = new Set(result.recommendations);
      const toAdd = result.indexCoverage.recommendations.filter((r) => !existing.has(r));
      result.recommendations = [...result.recommendations, ...toAdd];
    }
  }

  return result;
}

/** Exposed for the UI/DOCX so recommendation copy lives in one place. */
export { recommendationFor };

export async function performCompetitiveDuel(
  url1: string, html1: string, url2: string, html2: string,
  crawler1?: CrawlerInputs, crawler2?: CrawlerInputs
): Promise<CompetitiveResult> {
  const [res1, res2] = await Promise.all([
    analyzeWebsite(url1, html1, crawler1),
    analyzeWebsite(url2, html2, crawler2)
  ]);

  const duelPrompt = `
    Compare these two websites for Answer Engine Optimization (AEO).
    Site A: ${url1} (Score: ${res1.score})
    Site B: ${url2} (Score: ${res2.score})

    Which site is more likely to be cited by an AI agent as the primary source of truth?
    Provide a "Verdict" explaining why one is winning and what the other must do to catch up.

    Return JSON: { "verdict": "string", "winner": "user" | "competitor" | "tie" }
  `;

  const duelSchema = {
    type: Type.OBJECT,
    properties: {
      verdict: { type: Type.STRING },
      winner: { type: Type.STRING }
    },
    required: ["verdict", "winner"]
  };

  const duelText = await generateWithFallback(duelPrompt, duelSchema);
  const duelData = duelText ? safeJsonParse(duelText) : {};

  return {
    user: res1,
    competitor: res2,
    verdict: duelData.verdict,
    winner: duelData.winner
  };
}
