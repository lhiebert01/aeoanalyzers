// Sweep-engine-down alert (founder decision, 14 Oct 2026). When every run of one engine in a
// sweep errors (dead or expired key, exhausted prepaid balance, provider outage), log ONE loud,
// greppable "[SWEEP-ENGINE-FAIL]" line and email the founder through Resend, the same sender as
// api/contact.ts. One message on first failure (founder decision): an engine that is already down
// does not mail again until a sweep sees it answer, which re-arms it. Tracked per engine, so a
// second engine failing is never masked by the first. State lives in the running instance, so a
// cold start re-arms it. The email is best-effort: a Resend failure never fails the sweep.
// Env: RESEND_API_KEY (required to mail), CONTACT_FROM (verified sender), ALERT_TO (optional).

const SEND_TIMEOUT_MS = 4000;
const down = new Set<string>();

/** Test hook: forget which engines are down. */
export function resetEngineFailAlerts(): void { down.clear(); }

/** A sweep saw this engine answer: the next failure is a new outage and alerts again. */
export function markEngineHealthy(engine: string): void { down.delete(engine); }

/** Returns true when an alert went out (log line written; email attempted if a key is set). */
export async function alertSweepEngineFail(engine: string, total: number, sample: string): Promise<boolean> {
  if (down.has(engine)) return false;
  down.add(engine);
  const line =
    `[SWEEP-ENGINE-FAIL] engine=${engine} — ALL ${total} runs errored (reported as UNAVAILABLE, NOT a real 0%). ` +
    `Likely a bad/expired key, an exhausted prepaid balance, or config. Sample: ${sample}`;
  console.error(line);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error('[SWEEP-ENGINE-FAIL] no RESEND_API_KEY — alert logged, not emailed'); return true; }
  const from = process.env.CONTACT_FROM || 'AEOAnalyzers <forms@aeoanalyzers.com>';
  const to = process.env.ALERT_TO || 'lindsay.hiebert@gmail.com';
  const text =
    `Every ${engine} answer in a customer Citation Sweep just errored (${total} of ${total}).\n` +
    `Customers see "Service unavailable" for ${engine}; it is excluded from scores, not counted as 0%.\n\n` +
    `Check the ${engine} account: API key, prepaid balance / auto top-up, monthly spending limit.\n\n` +
    `Error sample:\n${sample}\n\n` +
    `This is the only message for this outage. You will hear again only if ${engine} recovers and then fails again.`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `[SWEEP-ENGINE-FAIL] ${engine} is down in Citation Sweeps`, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!r.ok) console.error('[SWEEP-ENGINE-FAIL] alert email failed', r.status, await r.text().catch(() => ''));
  } catch (err: any) {
    console.error('[SWEEP-ENGINE-FAIL] alert email error', err?.message || err);
  }
  return true;
}
