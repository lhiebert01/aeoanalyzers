// WO-6 — Stateful Action Plans. Persist a per-domain implementation plan (ranked
// tasks with priority/category/execution badges, checkboxes, completed log).
//   GET   ?domain=&userId=            → the current plan
//   POST  { userId, domain, tasks, generationCostUsd }  → create/replace plan
//   PATCH { id, taskId, done }        → toggle one task's completed state
import type { VercelRequest, VercelResponse } from '@vercel/node';

function db() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const d = db();
  if (!d) return res.status(200).json({ configured: false });

  try {
    if (req.method === 'GET') {
      const domain = String(req.query.domain || '');
      const userId = String(req.query.userId || '');
      const q = `${d.url}/rest/v1/action_plans?domain=eq.${encodeURIComponent(domain)}` +
        (userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '') + `&order=updated_at.desc&limit=1`;
      const r = await fetch(q, { headers: d.headers });
      const [plan] = r.ok ? await r.json() : [null];
      return res.status(200).json({ configured: true, plan: plan || null });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if (req.method === 'POST') {
      if (!body.domain) return res.status(400).json({ error: 'domain is required' });
      const r = await fetch(`${d.url}/rest/v1/action_plans`, {
        method: 'POST',
        headers: { ...d.headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: body.userId || null,
          domain: body.domain,
          tasks: body.tasks || [],
          generation_cost_usd: body.generationCostUsd || 0,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!r.ok) return res.status(502).json({ error: 'insert failed' });
      const [plan] = await r.json();
      return res.status(200).json({ plan });
    }

    if (req.method === 'PATCH') {
      const { id, taskId, done } = body;
      if (!id || !taskId) return res.status(400).json({ error: 'id and taskId required' });
      // Read → mutate the task → write back (jsonb array).
      const r = await fetch(`${d.url}/rest/v1/action_plans?id=eq.${encodeURIComponent(id)}&limit=1`, { headers: d.headers });
      const [plan] = r.ok ? await r.json() : [null];
      if (!plan) return res.status(404).json({ error: 'plan not found' });
      const tasks = (plan.tasks || []).map((t: any) =>
        t.id === taskId ? { ...t, done: !!done, completed_at: done ? new Date().toISOString() : null } : t
      );
      const upd = await fetch(`${d.url}/rest/v1/action_plans?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...d.headers, Prefer: 'return=representation' },
        body: JSON.stringify({ tasks, updated_at: new Date().toISOString() }),
      });
      const [updated] = upd.ok ? await upd.json() : [null];
      return res.status(200).json({ plan: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'action-plan failed' });
  }
}
