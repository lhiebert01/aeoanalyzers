/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { classifySiteType, type SiteType } from "../lib/brandType";
import { filterOfferCatalogString, type OfferFilterResult } from "../lib/offerCatalog";
import {
  categoryFromAnswerQuality,
  filterCandidateQueries,
  recommendationFor,
  type GapCategory,
} from "../lib/queryGap";

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

  // Change 6: for editorial/news sites, replaces voice rewrites with structured
  // data suggestions (the path to higher AEO for editorial brands).
  schemaDensityRecommendations?: { schemaType: string; reason: string; benefit: string }[];
}

export interface CompetitiveResult {
  user: AnalysisResult;
  competitor: AnalysisResult;
  verdict: string;
  winner: 'user' | 'competitor' | 'tie';
}

// Flash models in priority order — best quality first, then stable fallbacks
// 1. gemini-3-flash-preview:      Latest preview, frontier-class intelligence, fastest (Preview)
// 2. gemini-3.1-flash-lite-preview: Ultra-fast preview workhorse (Preview)
// 3. gemini-2.5-flash:            Current stable production release (Stable)
// 4. gemini-2.5-flash-lite:       Stable lightweight, always available (Stable)
const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

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
          maxOutputTokens: 8192
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

export async function analyzeWebsite(url: string, html: string): Promise<AnalysisResult> {
  const truncatedHtml = html.substring(0, 15000);

  // --- Change 1: classify the brand/register type BEFORE generating any
  // recommendations. This gates whether voice rewrites are allowed. ---
  const brand = classifySiteType(html);
  const isEditorial = brand.type === 'editorial' || brand.type === 'news';

  // Shared guidance injected into both prompts so every recommendation respects
  // the detected register and the facts-vs-inferences discipline.
  const brandGuidance = `
    DETECTED SITE TYPE: ${brand.type}${isEditorial ? ' (EDITORIAL/NEWS — voice is a moat)' : ''}.

    CRITICAL RULES FOR THIS SITE TYPE:
    ${isEditorial ? `- This is an EDITORIAL or NEWS brand. Its prose voice is its primary differentiation. DO NOT propose rewriting taglines, headlines, or hero copy into corporate/SaaS register. Frontier LLMs rank natural editorial prose HIGHER than adjective-to-metric translations for citation quality. The path to higher AEO here is STRUCTURED DATA enrichment (schema), NOT voice translation. Any recommendation that says "rewrite X to sound more data-driven" is WRONG for this site.`
      : `- This is a ${brand.type} site. Conversion-oriented headline/tagline improvements are appropriate where they add specificity.`}
    - FACTS vs INFERENCES: Never state a value (enum, regime label, price, status name) as fact unless that exact string literally appears in the page content. If you must guess, mark it clearly as inferred. Do NOT invent product status names, tiers, or feature names that are not on the page.
    - CAPABILITY SCOPING: Only discuss capabilities the site actually offers. Do NOT recommend creating content about features the site clearly does not have (e.g. a mobile app, international coverage) unless the question is universally useful (pricing, founder, contact, compliance).
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

    - verifiedSchema (string): A COMPLETE, paste-ready JSON-LD block containing ONLY values that literally appear in the page content. Use @type Organization with the actual business name, url, and logo (actual logo URL if present, else a placeholder path). Include hasOfferCatalog listing ONLY user-facing services a customer can actually sign up for / buy / use. EXCLUDE internal architecture (names containing Layer/Engine/Framework/Model/Pipeline/System/Architecture/Algorithm/Module are internal modules, NOT buyable services). List AT MOST 4 offers (keep the strongest if more). Every "name" and "description" must use terminology and specifics drawn from the page — NO invented status names, enums, tiers, prices, or specs. If you cannot verify a value on the page, it does NOT belong in this block. Valid JSON only, no script tags, no markdown.

    - candidateSchema (string): A SEPARATE JSON-LD block (or "" if none) containing fields you believe are plausible but could NOT verify on the page — inferred service names, inferred descriptions, inferred enums. Each inferred itemOffered should carry a "_meta": {"provenance":"inferred","warning":"Inferred, not detected on the page. Verify before publishing."}. This block is explicitly labeled "verify before pasting" in the report. If everything was detected, return "".

    - schemaProvenance (array): For each significant field you put in EITHER block, an object {field, value, provenance ("detected"|"inferred"|"user_required"), sourceQuote (exact page text supporting a detected value, else ""), confidence (0.0-1.0)}. This lets the user audit the schema.

    META DESCRIPTION REWRITE (metaDescriptionRewrite object):
    - current: Extract the actual meta description from the page (or note if missing)
    - suggested: Rewrite it to replace marketing fluff with technical specifics, keeping under 160 characters

    ${isEditorial ? `SCHEMA-DENSITY RECOMMENDATIONS (schemaDensityRecommendations array) — REQUIRED for this editorial/news site:
    This site's voice is a moat. DO NOT propose prose rewrites. Instead, recommend 4-6 STRUCTURED DATA additions that raise AEO without touching the prose. Each item: {schemaType (e.g. "FAQPage", "NewsArticle", "Person", "ProfilePage", "BreadcrumbList"), reason (why it helps for this specific site), benefit (the concrete AEO outcome)}. Return contentRewrites as an EMPTY array — voice rewrites are forbidden for editorial brands.`
      : `CONTENT REWRITES (contentRewrites array):
    Identify 3-5 sentences or phrases from the ACTUAL analyzed content that use vague marketing language ("cutting-edge", "industry-leading", "best-in-class", "dynamic", "fast-growing", etc.). For each, provide:
    - current: The exact text from the page (Low Citation version)
    - proposed: A rewritten version replacing adjectives with specific metrics, protocols, specs, or measurable claims (High Citation version)
    - page: The page section or context where this text appears
    Return schemaDensityRecommendations as an empty array.`}

    IMPLEMENTATION CHECKLIST (implementationChecklist array):
    Provide 5-8 specific, actionable items categorized as Technical, Authority, Structural, Editorial, or Coverage. Each item has:
    - category: One of "Technical", "Authority", "Structural", "Editorial", "Coverage"
    - action: The specific action to take (e.g., "Paste the VERIFIED JSON-LD into the site header")
    - priority: "High", "Medium", or "Low"
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
  const coreResult: AnalysisResult = JSON.parse(coreText);

  // Merge enhanced fields if available
  if (enhancedText) {
    try {
      const enhanced = JSON.parse(enhancedText);
      Object.assign(coreResult, enhanced);
    } catch {
      // Enhanced fields are optional — core analysis still works
    }
  }

  return applyAccuracyGuards(coreResult, brand);
}

/**
 * Deterministic post-processing that enforces the Part-3 accuracy rules in code,
 * regardless of what the model returned. The prompts ask for the right behavior;
 * these guards guarantee it (the LLM is not trusted to be perfectly compliant).
 */
export function applyAccuracyGuards(
  result: AnalysisResult,
  brand: ReturnType<typeof classifySiteType>
): AnalysisResult {
  const isEditorial = brand.type === 'editorial' || brand.type === 'news';

  // Change 1: record the detected brand type for the UI/report.
  result.siteType = brand.type;
  result.brandTypeSignals = brand.signals;

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

  return result;
}

/** Exposed for the UI/DOCX so recommendation copy lives in one place. */
export { recommendationFor };

export async function performCompetitiveDuel(url1: string, html1: string, url2: string, html2: string): Promise<CompetitiveResult> {
  const [res1, res2] = await Promise.all([
    analyzeWebsite(url1, html1),
    analyzeWebsite(url2, html2)
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
  const duelData = JSON.parse(duelText || "{}");

  return {
    user: res1,
    competitor: res2,
    verdict: duelData.verdict,
    winner: duelData.winner
  };
}
