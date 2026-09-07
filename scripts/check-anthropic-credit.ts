// One cheap probe: is the Anthropic key usable right now?
// Run this BEFORE any sweep that includes the Claude engine.
//   npx tsx scripts/check-anthropic-credit.ts
// Exit 0 = usable. Exit 1 = not usable, with the reason.
import { readFileSync } from 'node:fs';
for (const l of readFileSync('.env','utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.error('FAIL — ANTHROPIC_API_KEY is not set.'); process.exit(1); }
const model = process.env.SWEEP_CLAUDE_MODEL || 'claude-haiku-4-5';
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({ model, max_tokens: 4, messages: [{ role: 'user', content: 'hi' }] }),
});
if (res.ok) { console.log(`OK — Anthropic key usable, model ${model}. Safe to run the Claude engine.`); process.exit(0); }
const body = await res.text();
const msg = (body.match(/"message":"([^"]+)"/) || [,'(no message)'])[1];
console.error(`FAIL — HTTP ${res.status}: ${msg}`);
console.error(res.status === 400 && /credit balance/i.test(body)
  ? '\n  => Top up at console.anthropic.com > Settings > Billing. This is a balance issue, not a bad key.'
  : res.status === 401 ? '\n  => The key is rejected. Check or rotate it.' : '');
process.exit(1);
