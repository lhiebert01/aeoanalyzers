import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function handleSupabaseError(error: unknown, operation: string, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase Error [${operation}] ${path || ''}:`, message);
  throw new Error(message);
}
