// WO-AEO-POSITION-AND-PANEL-006 Item E — Google Search Console, read-only, one route.
//   POST /api/gsc?action=status   → { enabled, configured, connected }
//   POST /api/gsc?action=start    → { url }   (the client navigates to Google's consent screen)
//   GET  /api/gsc?action=callback → Google redirects here; stores the refresh token; back to /sweeps
//   POST /api/gsc?action=sites    → the user's verified properties
//   POST /api/gsc?action=queries  → query rows for a property and range, paginated (25,000 a page)
//   POST /api/gsc?action=revoke   → revokes at Google and deletes the stored token
// DARK until both (a) GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI + GOOGLE_OAUTH_STATE_SECRET are set
// and (b) the user is an admin or listed in GSC_ALLOWED_EMAILS. Nothing customer-facing names it until
// it has worked end to end on a second Google account (WO-006 deliverability rule).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';

const ADMIN_EMAILS = ['lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com'];
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const env = (k: string) => process.env[k] || '';
const configured = () => !!(env('GOOGLE_OAUTH_CLIENT_ID') && env('GOOGLE_OAUTH_CLIENT_SECRET') && env('GOOGLE_OAUTH_REDIRECT_URI') && env('GOOGLE_OAUTH_STATE_SECRET'));
const T = (ms: number) => AbortSignal.timeout(ms);

async function userFrom(req: VercelRequest): Promise<{ id: string; email: string } | null> {
  const token = String(req.headers['authorization'] || '').replace(/^Bearer /, '');
  if (!token || !env('VITE_SUPABASE_URL') || !env('VITE_SUPABASE_ANON_KEY')) return null;
  const r = await fetch(`${env('VITE_SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('VITE_SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` }, signal: T(8000) });
  if (!r.ok) return null;
  const u: any = await r.json();
  return { id: u.id, email: String(u.email || '').toLowerCase() };
}
const allowed = (email: string) => ADMIN_EMAILS.includes(email) || env('GSC_ALLOWED_EMAILS').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean).includes(email);

// Signed, expiring OAuth state: userId.expiry.hmac — the callback trusts nothing it did not sign.
const sign = (s: string) => createHmac('sha256', env('GOOGLE_OAUTH_STATE_SECRET')).update(s).digest('base64url');
function makeState(userId: string) { const body = `${userId}.${Date.now() + 10 * 60 * 1000}`; return `${body}.${sign(body)}`; }
function readState(state: string): string | null {
  const i = state.lastIndexOf('.'); if (i < 0) return null;
  const body = state.slice(0, i), mac = state.slice(i + 1), want = sign(body);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const [userId, exp] = body.split('.'); return Number(exp) > Date.now() ? userId : null;
}

const SB = () => ({ url: `${env('VITE_SUPABASE_URL')}/rest/v1/gsc_connections`, H: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' } });
async function storedToken(userId: string): Promise<string | null> {
  const { url, H } = SB(); const r = await fetch(`${url}?user_id=eq.${userId}&select=refresh_token`, { headers: H, signal: T(8000) });
  const [row] = r.ok ? await r.json() : []; return row?.refresh_token || null;
}
async function accessToken(refresh: string): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: T(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j: any = await r.json(); if (!r.ok || !j.access_token) throw new Error(`token refresh failed: ${j.error || r.status}`); return j.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || '');
  try {
    if (action === 'callback') {
      const userId = readState(String(req.query.state || ''));
      if (!configured() || !userId || !req.query.code) return res.redirect(302, '/sweeps?gsc=failed');
      const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: T(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: String(req.query.code), client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), redirect_uri: env('GOOGLE_OAUTH_REDIRECT_URI'), grant_type: 'authorization_code' }) });
      const j: any = await r.json();
      if (!r.ok || !j.refresh_token) return res.redirect(302, '/sweeps?gsc=failed');
      const { url, H } = SB();
      await fetch(url, { method: 'POST', signal: T(8000), headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: userId, refresh_token: j.refresh_token, scope: j.scope || SCOPE, connected_at: new Date().toISOString() }) });
      return res.redirect(302, '/sweeps?gsc=connected');
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST' });
    const user = await userFrom(req);
    if (!user) return res.status(401).json({ error: 'sign in' });
    const enabled = allowed(user.email);
    if (action === 'status') return res.status(200).json({ enabled, configured: configured(), connected: enabled && configured() ? !!(await storedToken(user.id)) : false });
    if (!enabled) return res.status(404).json({ error: 'not available' });
    if (!configured()) return res.status(503).json({ error: 'Search Console connection is not configured on this deployment.' });
    if (action === 'start') {
      const p = new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), redirect_uri: env('GOOGLE_OAUTH_REDIRECT_URI'), response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: makeState(user.id) });
      return res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` });
    }
    const refresh = await storedToken(user.id);
    if (action === 'revoke') {
      if (refresh) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: 'POST', signal: T(8000) }).catch(() => {});
      const { url, H } = SB(); await fetch(`${url}?user_id=eq.${user.id}`, { method: 'DELETE', headers: H, signal: T(8000) });
      return res.status(200).json({ revoked: true });
    }
    if (!refresh) return res.status(409).json({ error: 'Search Console is not connected.' });
    const at = await accessToken(refresh);
    if (action === 'sites') {
      const r = await fetch('https://www.googleapis.com/webmasters/v3/sites', { headers: { Authorization: `Bearer ${at}` }, signal: T(10000) });
      const j: any = await r.json(); return res.status(r.ok ? 200 : 502).json({ sites: (j.siteEntry || []).map((s: any) => s.siteUrl) });
    }
    if (action === 'queries') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const site = String(body.siteUrl || ''), startDate = String(body.startDate || ''), endDate = String(body.endDate || '');
      if (!site || !/^\d{4}-\d\d-\d\d$/.test(startDate) || !/^\d{4}-\d\d-\d\d$/.test(endDate)) return res.status(400).json({ error: 'siteUrl, startDate, endDate (YYYY-MM-DD)' });
      const rows: any[] = [];
      for (let startRow = 0; startRow < 100000; startRow += 25000) { // paginated; capped at 100,000 rows
        const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', signal: T(20000), headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25000, startRow, dataState: 'final' }) });
        const j: any = await r.json(); if (!r.ok) return res.status(502).json({ error: j.error?.message || 'Search Analytics query failed' });
        const page = (j.rows || []).map((x: any) => ({ query: x.keys[0], clicks: x.clicks, impressions: x.impressions, position: x.position }));
        rows.push(...page); if (page.length < 25000) break;
      }
      return res.status(200).json({ rows });
    }
    return res.status(400).json({ error: 'unknown action' });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e).slice(0, 200) });
  }
}
