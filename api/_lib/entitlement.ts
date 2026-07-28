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
): Promise<{ paid: boolean; userId: string | null; determined: boolean }> {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;

  // Admin/service bypass (same header run-sweep honors).
  const adminToken = process.env.ADMIN_SWEEP_TOKEN;
  if (adminToken && req.headers['x-admin-token'] === adminToken) {
    return { paid: true, userId: null, determined: true };
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
    if (ADMIN_EMAILS.includes(email)) return { paid: true, userId, determined: true };

    const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rowRes = await fetch(
      `${supaUrl}/rest/v1/users?id=eq.${userId}&select=subscription_status,report_pass_until`,
      { headers: H },
    );
    const [row] = rowRes.ok ? await rowRes.json() : [null];
    const sub = row?.subscription_status || 'free';
    const dayPassActive = row?.report_pass_until && new Date(row.report_pass_until) > new Date();
    const paid = sub === 'Business' || sub === 'Pro' || !!dayPassActive;
    return { paid, userId, determined: true };
  } catch {
    return { paid: false, userId: null, determined: false }; // transient error → fail open (protect payers)
  }
}
