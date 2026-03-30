import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cached access token — set during auth initialization so REST helpers
// never need to call supabase.auth.getSession() (which can hang).
let cachedAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export function getAccessToken(): string {
  return cachedAccessToken || supabaseAnonKey;
}

// Direct REST API helper — bypasses the Supabase client to avoid
// queuing issues with timed-out requests. Uses the cached JWT for auth.
export async function supabaseQuery(table: string, params: string = '', timeoutMs: number = 10000): Promise<{ data: any; error: any }> {
  try {
    const token = cachedAccessToken || supabaseAnonKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Supabase] REST error: ${response.status} ${errorBody}`);
      return { data: null, error: { message: `HTTP ${response.status}: ${errorBody}`, code: response.status } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[Supabase] Query to ${table} timed out after ${timeoutMs}ms`);
      return { data: null, error: { message: `Query timed out after ${timeoutMs / 1000} seconds` } };
    }
    console.error(`[Supabase] Query to ${table} failed:`, err);
    return { data: null, error: { message: err.message } };
  }
}

// Direct REST INSERT helper
export async function supabaseInsert(table: string, body: any, timeoutMs: number = 10000): Promise<{ data: any; error: any }> {
  try {
    const token = cachedAccessToken || supabaseAnonKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Supabase] INSERT error: ${response.status} ${errorBody}`);
      return { data: null, error: { message: `HTTP ${response.status}: ${errorBody}`, code: response.status } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { data: null, error: { message: `Insert timed out after ${timeoutMs / 1000} seconds` } };
    }
    return { data: null, error: { message: err.message } };
  }
}

// Direct REST UPDATE helper
export async function supabaseUpdate(table: string, params: string, body: any, timeoutMs: number = 10000): Promise<{ data: any; error: any }> {
  try {
    const token = cachedAccessToken || supabaseAnonKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      return { data: null, error: { message: `HTTP ${response.status}: ${errorBody}` } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { data: null, error: { message: `Update timed out after ${timeoutMs / 1000} seconds` } };
    }
    return { data: null, error: { message: err.message } };
  }
}

export function handleSupabaseError(error: unknown, operation: string, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase Error [${operation}] ${path || ''}:`, message);
  throw new Error(message);
}
