/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";

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
    generatedQuestions: { question: string; answered: boolean; answerQuality: string }[];
    gapScore: number;
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
}

export interface CompetitiveResult {
  user: AnalysisResult;
  competitor: AnalysisResult;
  verdict: string;
  winner: 'user' | 'competitor' | 'tie';
}

export async function analyzeWebsite(url: string, html: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  const truncatedHtml = html.substring(0, 15000);

  // --- Call 1: Core analysis + advanced diagnostics (proven v1.2 prompt) ---
  const corePrompt = `
    Analyze the following website content for "Answer Engine Optimization" (AEO).
    AEO is the practice of making a website the primary "Source of Truth" for AI agents (Gemini, GPT, etc.).

    Website URL: ${url}

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
    - schemaSnippet: A JSON-LD snippet that would fix the most critical missing structured data.

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
    - generatedQuestions: Array of {question, answered (bool), answerQuality ("Strong"/"Partial"/"Missing")} — top 10 niche questions users would ask, and whether the content answers them
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
                answerQuality: { type: Type.STRING }
              },
              required: ["question", "answered", "answerQuality"]
            }
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
    required: ["score", "summary", "criteria", "recommendations", "citationProbability"]
  };

  // --- Call 2: Enhanced report fields (v1.3) — runs in parallel ---
  const enhancedPrompt = `
    Analyze the following website content and generate enhanced AEO (Answer Engine Optimization) report data.

    Website URL: ${url}

    HTML Content (truncated):
    ${truncatedHtml}

    Return a JSON object with ALL of the following fields:

    COMPREHENSIVE SCHEMA (comprehensiveSchema string):
    Generate a COMPLETE, ready-to-deploy JSON-LD block with @type Organization containing name, url, and a logo placeholder. Include hasOfferCatalog with @type OfferCatalog listing EVERY product, service, and capability detected on the page as individual Offer items. Each offer must have a name using industry-standard terminology (not marketing adjectives) and a description with technical specifics. The output must be a valid JSON-LD string (without script tags — just the JSON object).

    CONTENT REWRITES (contentRewrites array):
    Identify 3-5 sentences or phrases from the ACTUAL analyzed content that use vague marketing language ("cutting-edge", "industry-leading", "best-in-class", "dynamic", "fast-growing", etc.). For each, provide:
    - current: The exact text from the page (Low Citation version)
    - proposed: A rewritten version replacing adjectives with specific metrics, protocols, specs, or measurable claims (High Citation version)
    - page: The page section or context where this text appears

    META DESCRIPTION REWRITE (metaDescriptionRewrite object):
    - current: Extract the actual meta description from the page (or note if missing)
    - suggested: Rewrite it to replace marketing fluff with technical specifics, keeping under 160 characters

    IMPLEMENTATION CHECKLIST (implementationChecklist array):
    Provide 5-8 specific, actionable items categorized as Technical, Authority, Structural, Editorial, or Coverage. Each item has:
    - category: One of "Technical", "Authority", "Structural", "Editorial", "Coverage"
    - action: The specific action to take (e.g., "Paste the comprehensive JSON-LD into the site header")
    - priority: "High", "Medium", or "Low"
  `;

  const enhancedSchema = {
    type: Type.OBJECT,
    properties: {
      comprehensiveSchema: { type: Type.STRING },
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
    required: ["comprehensiveSchema", "contentRewrites", "metaDescriptionRewrite", "implementationChecklist"]
  };

  // Run both calls in parallel for no added latency
  const [coreResponse, enhancedResponse] = await Promise.all([
    ai.models.generateContent({
      model,
      contents: corePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: coreSchema
      }
    }),
    ai.models.generateContent({
      model,
      contents: enhancedPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: enhancedSchema
      }
    }).catch(() => null) // Don't fail the whole analysis if enhanced call fails
  ]);

  const coreText = coreResponse.text;
  if (!coreText) throw new Error("AI failed to generate a response.");
  const coreResult = JSON.parse(coreText);

  // Merge enhanced fields if available
  if (enhancedResponse?.text) {
    try {
      const enhanced = JSON.parse(enhancedResponse.text);
      Object.assign(coreResult, enhanced);
    } catch {
      // Enhanced fields are optional — core analysis still works
    }
  }

  return coreResult;
}

export async function performCompetitiveDuel(url1: string, html1: string, url2: string, html2: string): Promise<CompetitiveResult> {
  const [res1, res2] = await Promise.all([
    analyzeWebsite(url1, html1),
    analyzeWebsite(url2, html2)
  ]);

  const model = "gemini-3-flash-preview";
  const duelPrompt = `
    Compare these two websites for Answer Engine Optimization (AEO).
    Site A: ${url1} (Score: ${res1.score})
    Site B: ${url2} (Score: ${res2.score})
    
    Which site is more likely to be cited by an AI agent as the primary source of truth? 
    Provide a "Verdict" explaining why one is winning and what the other must do to catch up.
    
    Return JSON: { "verdict": "string", "winner": "user" | "competitor" | "tie" }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: duelPrompt,
    config: { responseMimeType: "application/json" }
  });

  const duelData = JSON.parse(response.text || "{}");

  return {
    user: res1,
    competitor: res2,
    verdict: duelData.verdict,
    winner: duelData.winner
  };
}
