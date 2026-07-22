// WO-2 — Answer-Fidelity scoring endpoint.
// POST { html, llmsTxt?, transcripts: [{ engine, text }] }
// Builds the client's truth record from their own HTML/llms.txt, then scores each
// engine's answer against it and returns the consolidated "facts AI gets wrong
// about you" list with the correction source for each.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractTruthRecord } from '../src/lib/truthRecord';
import { scoreFidelity } from '../src/lib/fidelity';
import { classifyFalseFact } from '../src/lib/factClassification';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const html: string = body.html || '';
    const llmsTxt: string | null = body.llmsTxt || null;
    const transcripts: { engine: string; text: string; sources?: string[] }[] = body.transcripts || [];

    if (!html) return res.status(400).json({ error: 'html is required to build the truth record' });

    const truthRecord = extractTruthRecord(html, llmsTxt);

    const results = transcripts.map((t) => {
      const fidelity = scoreFidelity(t.text || '', truthRecord);
      // Classify each false fact by WHY it's wrong → the fix path.
      const classifiedIssues = fidelity.issues.map((issue) =>
        issue.type === 'hallucinated_founder'
          ? { ...issue, classification: classifyFalseFact({ wrong: issue.wrong, sources: t.sources || [] }) }
          : issue
      );
      return { engine: t.engine, fidelity: { ...fidelity, issues: classifiedIssues } };
    });

    // Consolidate the "facts AI gets wrong" list across engines.
    const wrongMap = new Map<string, { wrong?: string; correct?: string[]; detail: string; source: string; severity: string; engines: string[] }>();
    for (const r of results) {
      for (const issue of r.fidelity.issues) {
        const key = `${issue.type}|${issue.wrong || ''}`;
        const existing = wrongMap.get(key);
        if (existing) existing.engines.push(r.engine);
        else wrongMap.set(key, { wrong: issue.wrong, correct: issue.correct, detail: issue.detail, source: issue.source, severity: issue.severity, engines: [r.engine] });
      }
    }

    const avgFidelity = results.length
      ? Math.round(results.reduce((s, r) => s + r.fidelity.fidelityPct, 0) / results.length)
      : null;

    return res.status(200).json({
      truthRecord,
      results,
      avgFidelity,
      factsAIGetsWrong: [...wrongMap.values()].sort((a, b) => (a.severity === 'high' ? -1 : 1)),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'fidelity scoring failed' });
  }
}
