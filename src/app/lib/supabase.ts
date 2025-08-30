import { createClient } from '@supabase/supabase-js';

/**
 * Server-side client (only use in server code: API routes, server actions, edge functions).
 * It uses the SERVICE ROLE key, which bypasses RLS — never expose this to the browser.
 */
export const supabaseServer = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
};

/**
 * Browser-side client (safe for client components/pages).
 * Uses the ANON key, which is RLS-enforced.
 */
export const supabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createClient(url, anon, {
    auth: { persistSession: true }
  });
};
