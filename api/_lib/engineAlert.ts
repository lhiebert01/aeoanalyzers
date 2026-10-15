// Sweep-engine failure alert (founder decisions, 14 Oct 2026). When any answer from an engine
// fails in a sweep (dead or expired key, exhausted prepaid balance, rate limit, outage), log ONE
// loud, greppable "[SWEEP-ENGINE-FAIL]" line and email the founder through Resend, the same sender
// as api/contact.ts. One email, then that engine is silent for 24 hours; tracked per engine, so a
// second engine failing is never masked by the first. State lives in the running instance, so a
// cold start can send again sooner. The email is best-effort: a Resend failure never fails a sweep.
// Env: RESEND_API_KEY (required to mail), CONTACT_FROM (verified sender), ALERT_TO (optional).

export const ENGINE_FAIL_QUIET_MS = 24 * 60 * 60 * 1000;
const SEND_TIMEOUT_MS = 4000;
const lastAlert = new Map<string, number>();

/** Test hook: forget the quiet periods. */
export function resetEngineFailAlerts(): void { lastAlert.clear(); }

/** Returns true when an alert went out (log line written; email attempted if a key is set). */
export async function alertSweepEngineFail(engine: string, failed: number, total: number, sample: string, now = Date.now()): Promise<boolean> {
  const last = lastAlert.get(engine);
  if (last !== undefined && now - last < ENGINE_FAIL_QUIET_MS) return false;
  lastAlert.set(engine, now);
  const all = failed >= total;
  console.error(
    `[SWEEP-ENGINE-FAIL] engine=${engine} — ${failed} of ${total} answers failed` +
      `${all ? ' (reported as UNAVAILABLE, NOT a real 0%)' : ' (excluded from scores)'}. Sample: ${sample}`,
  );

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error('[SWEEP-ENGINE-FAIL] no RESEND_API_KEY — alert logged, not emailed'); return true; }
  const from = process.env.CONTACT_FROM || 'AEOAnalyzers <forms@aeoanalyzers.com>';
  const to = process.env.ALERT_TO || 'lindsay.hiebert@gmail.com';
  const text =
    `${failed} of ${total} ${engine} answers failed in a customer Citation Sweep.\n` +
    (all
      ? `Customers see "Service unavailable" for ${engine}; it is excluded from scores, not counted as 0%.\n\n`
      : `The failed answers are excluded from scores and badged; the rest of the sweep stands.\n\n`) +
    `Check the ${engine} account: API key, prepaid balance / auto top-up, monthly spending limit, rate limits.\n\n` +
    `Error sample:\n${sample}\n\n` +
    `No further ${engine} alerts for 24 hours.`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `[SWEEP-ENGINE-FAIL] ${engine}: ${failed} of ${total} answers failed`, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!r.ok) console.error('[SWEEP-ENGINE-FAIL] alert email failed', r.status, await r.text().catch(() => ''));
  } catch (err: any) {
    console.error('[SWEEP-ENGINE-FAIL] alert email error', err?.message || err);
  }
  return true;
}
