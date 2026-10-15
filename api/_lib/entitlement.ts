// Server-side entitlement check for the analysis route — the SAME Supabase-JWT
// verification `api/run-sweep.ts` (resolveAccess) already uses in production, so a
// paying customer who sends their token is always recognized as paid.
//
// Returns { paid, determined }:
//  - paid=true  → Business/Pro/active Day Pass, or admin → gets the full response.
//  - determined → we CONCLUSIVELY resolved paid/free. When false (Supabase env
//    missing or a transient error on a token-bearing request) the caller must
//    FAIL OPEN (do NOT redact) so a paying user is never stripped during an outage.
//    A request with NO token is conclusively "free" (determined=true) — matching
//    run-sweep, where the client reliably attaches the token for signed-in users.
import type { VercelRequest } from '@vercel/node';

const ADMIN_EMAILS = ['lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com'];

export async function isPaidRequest(
  req: VercelRequest,
): Promise<{ paid: boolean; userId: string | null; determined: boolean; admin?: boolean; tier?: string; passUntil?: string | null }> {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;

  // Admin/service bypass (same header run-sweep honors).
  const adminToken = process.env.ADMIN_SWEEP_TOKEN;
  if (adminToken && req.headers['x-admin-token'] === adminToken) {
    return { paid: true, userId: null, determined: true, admin: true };
  }

  const authHeader = String(req.headers['authorization'] || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { paid: false, userId: null, determined: true }; // no session → free
  if (!supaUrl || !anon || !serviceKey) return { paid: false, userId: null, determined: false }; // can't tell → fail open

  try {
    const ures = await fetch(`${supaUrl}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    if (!ures.ok) return { paid: false, userId: null, determined: true }; // invalid/expired token → free
    const u: any = await ures.json();
    const userId: string = u.id;
    const email = String(u.email || '').toLowerCase();
    if (ADMIN_EMAILS.includes(email)) return { paid: true, userId, determined: true, admin: true };

    const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rowRes = await fetch(
      `${supaUrl}/rest/v1/users?id=eq.${userId}&select=subscription_status,report_pass_until`,
      { headers: H },
    );
    const [row] = rowRes.ok ? await rowRes.json() : [null];
    const sub = row?.subscription_status || 'free';
    const dayPassActive = row?.report_pass_until && new Date(row.report_pass_until) > new Date();
    const paid = sub === 'Business' || sub === 'Pro' || !!dayPassActive;
    // The plan decides the analyses allowance; a subscription outranks a Day Pass.
    const tier = sub === 'Business' || sub === 'Pro' ? sub : dayPassActive ? 'daypass' : 'free';
    return { paid, userId, determined: true, tier, passUntil: row?.report_pass_until ?? null };
  } catch {
    return { paid: false, userId: null, determined: false }; // transient error → fail open (protect payers)
  }
}

/**
 * Analyses are capped per account by tier (analysesAllowance / analysesWindowStart in
 * src/lib/sweepCaps.ts: free 3 ever, Day Pass 25 in its 24 hours, Pro 100 and Business 200 a
 * month). Counts saved analyses (analysis_history) since `since`, or all of them when `since` is
 * null. Returns null when under the cap or when the count can't be read (fail open: the free score
 * must not break on a transient Supabase error), otherwise the number already used.
 */
export async function analysesUsedIfCapped(userId: string, cap: number, since: Date | null): Promise<number | null> {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) return null;
  const window = since ? `&created_at=gte.${since.toISOString()}` : '';
  try {
    const r = await fetch(
      `${supaUrl}/rest/v1/analysis_history?user_id=eq.${userId}${window}&select=id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact', Range: '0-0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!r.ok) return null;
    const used = Number((r.headers.get('content-range') || '0-0/0').split('/')[1] || 0);
    return used >= cap ? used : null;
  } catch {
    return null;
  }
}
