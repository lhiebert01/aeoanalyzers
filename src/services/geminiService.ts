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
}

export interface CompetitiveResult {
  user: AnalysisResult;
  competitor: AnalysisResult;
  verdict: string;
  winner: 'user' | 'competitor' | 'tie';
}

export async function analyzeWebsite(url: string, html: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following website content for "Answer Engine Optimization" (AEO). 
    AEO is the practice of making a website the primary "Source of Truth" for AI agents (Gemini, GPT, etc.).
    
    Website URL: ${url}
    
    HTML Content (truncated):
    ${html.substring(0, 15000)}
    
    Evaluate based on:
    1. Semantic HTML structure.
    2. Presence of structured data (Schema.org).
    3. Clear metadata (OpenGraph).
    4. Content clarity and factual density.
    5. Citation Likelihood: How likely is an AI to cite this page as a source?
    
    Return a JSON object with:
    - score: Overall AEO score (0-100).
    - summary: Executive summary for a CMO.
    - criteria: Array of {name, score (0-10), feedback}.
    - recommendations: List of specific, actionable steps.
    - citationProbability: Percentage (0-100) of how likely this site is to be cited for its core topic.
    - schemaSnippet: A JSON-LD snippet that would fix the most critical missing structured data.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
          schemaSnippet: { type: Type.STRING }
        },
        required: ["score", "summary", "criteria", "recommendations", "citationProbability"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI failed to generate a response.");
  return JSON.parse(text);
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
