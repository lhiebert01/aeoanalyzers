// Contact form → founder's inbox, via Resend (same pattern as the sibling apps).
// Env: RESEND_API_KEY (required), CONTACT_FROM (verified branded sender), CONTACT_TO.
// Submissions are not stored — they are delivered to the inbox and nothing else.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const company = String(body.company || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body.company_website || '').trim(); // bots fill this; humans never see it

  if (honeypot) return res.status(200).json({ ok: true }); // silently drop bots
  if (!name || !email || !message) return res.status(400).json({ error: 'Please add your name, email, and a message.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (message.length > 5000) return res.status(400).json({ error: 'That message is a little long — please trim it under 5000 characters.' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Contact is temporarily unavailable — please email lindsay.hiebert@gmail.com directly.' });
  }
  const from = process.env.CONTACT_FROM || 'AEOAnalyzers <forms@aeoanalyzers.com>';
  const to = process.env.CONTACT_TO || 'lindsay.hiebert@gmail.com';

  const text = `New AEOAnalyzers contact\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\n${message}`;
  const html = `<h2 style="margin:0 0 12px">New AEOAnalyzers contact</h2>
<p style="margin:0 0 12px"><strong>Name:</strong> ${esc(name)}<br>
<strong>Email:</strong> ${esc(email)}<br>
<strong>Company:</strong> ${esc(company) || '—'}</p>
<p style="white-space:pre-wrap;margin:0">${esc(message)}</p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `AEOAnalyzers contact — ${name}${company ? ' · ' + company : ''}`,
        text,
        html,
      }),
    });
    if (!r.ok) {
      console.error('[contact] resend failed', r.status, await r.text().catch(() => ''));
      return res.status(502).json({ error: 'Could not send right now — please email lindsay.hiebert@gmail.com directly.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[contact] error', err?.message);
    return res.status(500).json({ error: 'Could not send right now — please try again shortly.' });
  }
}
