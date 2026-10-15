// Sweep-engine-down alert: counts the emails actually sent, not that the code ran.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertSweepEngineFail, resetEngineFailAlerts, ENGINE_FAIL_QUIET_MS } from '../../api/_lib/engineAlert';

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
  it('one failed answer is enough to email the founder', async () => {
    expect(await alertSweepEngineFail('grok', 1, 12, '[error: 403 credits exhausted]', T0)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe('https://api.resend.com/emails');
    expect(sent[0].body.to).toBe('lindsay.hiebert@gmail.com');
    expect(sent[0].body.subject).toBe('[SWEEP-ENGINE-FAIL] grok: 1 of 12 answers failed');
    expect(sent[0].body.text).toContain('credits exhausted');
  });

  it('then that engine is silent for 24 hours, and emails again at the boundary', async () => {
    await alertSweepEngineFail('grok', 1, 12, 's', T0);
    expect(await alertSweepEngineFail('grok', 12, 12, 's', T0 + ENGINE_FAIL_QUIET_MS - 1)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(await alertSweepEngineFail('grok', 3, 12, 's', T0 + ENGINE_FAIL_QUIET_MS)).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it('a second engine failing is not masked by the first', async () => {
    await alertSweepEngineFail('grok', 1, 12, 's', T0);
    await alertSweepEngineFail('perplexity', 2, 12, 's', T0 + 1000);
    expect(sent.map((m) => m.body.subject)).toEqual([
      expect.stringContaining('grok'), expect.stringContaining('perplexity'),
    ]);
  });

  it('says "Service unavailable" only when every answer failed', async () => {
    await alertSweepEngineFail('grok', 12, 12, 's', T0);
    await alertSweepEngineFail('claude', 1, 12, 's', T0);
    expect(sent[0].body.text).toContain('Service unavailable');
    expect(sent[1].body.text).not.toContain('Service unavailable');
  });

  it('honours ALERT_TO', async () => {
    vi.stubEnv('ALERT_TO', 'ops@example.com');
    await alertSweepEngineFail('claude', 1, 3, 's', T0);
    expect(sent[0].body.to).toBe('ops@example.com');
  });

  it('without a Resend key it logs and sends nothing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await alertSweepEngineFail('grok', 1, 12, 's', T0)).toBe(true);
    expect(sent).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[SWEEP-ENGINE-FAIL] engine=grok'));
  });

  it('a Resend failure never throws into the sweep', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(alertSweepEngineFail('grok', 1, 12, 's', T0)).resolves.toBe(true);
  });
});
