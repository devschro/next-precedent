// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Browser/client-side Supabase (uses anon key) */
export function supabaseBrowser() {
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** Server-side Supabase (uses service role; NEVER import in client components) */
export function supabaseServer() {
  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
