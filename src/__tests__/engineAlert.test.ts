// Sweep-engine-down alert: counts the emails actually sent, not that the code ran.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertSweepEngineFail, resetEngineFailAlerts, ENGINE_FAIL_ALERT_MS } from '../../api/_lib/engineAlert';

const T0 = 1_800_000_000_000;
let sent: any[];

beforeEach(() => {
  resetEngineFailAlerts();
  sent = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); }));
  vi.stubEnv('RESEND_API_KEY', 're_test');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('alertSweepEngineFail', () => {
  it('emails the founder once when an engine is down', async () => {
    expect(await alertSweepEngineFail('grok', 15, '[error: 403 credits exhausted]', T0)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe('https://api.resend.com/emails');
    expect(sent[0].body.to).toBe('lindsay.hiebert@gmail.com');
    expect(sent[0].body.subject).toContain('[SWEEP-ENGINE-FAIL] grok');
    expect(sent[0].body.text).toContain('credits exhausted');
  });

  it('throttles the same engine inside the window and re-alerts at the boundary', async () => {
    await alertSweepEngineFail('grok', 15, 's', T0);
    expect(await alertSweepEngineFail('grok', 15, 's', T0 + ENGINE_FAIL_ALERT_MS - 1)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(await alertSweepEngineFail('grok', 15, 's', T0 + ENGINE_FAIL_ALERT_MS)).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it('a second engine failing is not masked by the first', async () => {
    await alertSweepEngineFail('grok', 15, 's', T0);
    await alertSweepEngineFail('perplexity', 15, 's', T0 + 1000);
    expect(sent.map((m) => m.body.subject)).toEqual([
      expect.stringContaining('grok'), expect.stringContaining('perplexity'),
    ]);
  });

  it('honours ALERT_TO', async () => {
    vi.stubEnv('ALERT_TO', 'ops@example.com');
    await alertSweepEngineFail('claude', 3, 's', T0);
    expect(sent[0].body.to).toBe('ops@example.com');
  });

  it('without a Resend key it logs and sends nothing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await alertSweepEngineFail('grok', 15, 's', T0)).toBe(true);
    expect(sent).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[SWEEP-ENGINE-FAIL] engine=grok'));
  });

  it('a Resend failure never throws into the sweep', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(alertSweepEngineFail('grok', 15, 's', T0)).resolves.toBe(true);
  });
});
