// WO-5 — Deployment Drift / Integrity Monitor.
//   POST { domain, html, llmsTxt?, userId?, saveApproved? }
// Builds the CURRENT truth record from the live page, compares it to the APPROVED
// baseline stored in truth_records, and returns the drift report. First call for a
// domain (or saveApproved:true) stores the baseline and reports in-sync.
//
// Cron-friendly: a weekly job can fetch each client's page and POST here. (Wire a
// vercel cron to a small iterator over truth_records if you want it hands-off.)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractTruthRecord } from '../src/lib/truthRecord.js';
import { diffTruthRecords } from '../src/lib/driftDiff.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain: string = (body.domain || '').replace(/^www\./, '').toLowerCase();
    let html: string = body.html || '';
    const llmsTxt: string | null = body.llmsTxt || null;
    if (!domain) return res.status(400).json({ error: 'domain is required' });

    // Fetch the live page if the caller didn't supply HTML.
    if (!html) {
      try {
        const r = await fetch(`https://${domain}/`, { headers: { 'User-Agent': 'AEOAnalyzers-DriftMonitor/1.0' }, redirect: 'follow' });
        html = await r.text();
      } catch { /* leave html empty → truth record will be sparse */ }
    }

    const current = extractTruthRecord(html, llmsTxt);

    const supaUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !serviceKey) {
      return res.status(200).json({ configured: false, current });
    }
    const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

    const existingRes = await fetch(
      `${supaUrl}/rest/v1/truth_records?domain=eq.${encodeURIComponent(domain)}&limit=1`,
      { headers: H }
    );
    const [existing] = existingRes.ok ? await existingRes.json() : [null];

    // No baseline yet, or explicit re-baseline → store current as approved.
    if (!existing || body.saveApproved) {
      const method = existing ? 'PATCH' : 'POST';
      const target = existing
        ? `${supaUrl}/rest/v1/truth_records?domain=eq.${encodeURIComponent(domain)}`
        : `${supaUrl}/rest/v1/truth_records`;
      await fetch(target, {
        method,
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ domain, user_id: body.userId || null, approved: current, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      });
      return res.status(200).json({ baselineSet: true, inSync: true, drifts: [], summary: '✓ Approved truth-record baseline saved.', current });
    }

    const report = diffTruthRecords(existing.approved, current);
    return res.status(200).json({ ...report, current, approved: existing.approved });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'drift-check failed' });
  }
}
