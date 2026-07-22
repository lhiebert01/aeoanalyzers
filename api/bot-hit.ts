// WO-3 — AI crawler telemetry ingest endpoint.
//
// Accepts a hit from any source that can see the raw User-Agent server-side:
//   (a) our Vercel middleware (portfolio dogfood),
//   (b) a WordPress plugin POSTing here (covers most SMB clients),
//   (c) a Cloudflare log shipper.
//
// Classifies the UA into a Live/Search/Training tier and stores it. Non-AI-bot
// traffic (humans, generic crawlers) is ignored (204) — this table is only AI
// answer-engine crawlers, so it stays small and meaningful.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { classifyUserAgent } from '../src/lib/botClassify';

function hostFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(u || '').replace(/^www\./, '').toLowerCase();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS so a WordPress plugin / edge worker on another origin can post.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const userAgent: string = body.userAgent || body.ua || (req.headers['user-agent'] as string) || '';
    const url: string = body.url || '';
    const host: string = (body.host || hostFromUrl(url) || '').toLowerCase();
    const path: string = body.path || (() => { try { return new URL(url).pathname; } catch { return '/'; } })();
    const source: string = body.source || 'middleware';

    const cls = classifyUserAgent(userAgent);
    if (!cls) return res.status(204).end(); // not an AI bot — ignore
    if (!host) return res.status(400).json({ error: 'host or url required' });

    const supaUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !serviceKey) {
      // Classification still works; just report it wasn't stored.
      return res.status(200).json({ classified: cls, stored: false });
    }

    const r = await fetch(`${supaUrl}/rest/v1/bot_hits`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        host,
        path: (path || '/').slice(0, 512),
        engine: cls.engine,
        tier: cls.tier,
        bot_token: cls.token,
        user_agent: userAgent.slice(0, 512),
        source,
      }),
    });

    return res.status(200).json({ classified: cls, stored: r.ok });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'ingest failed' });
  }
}
