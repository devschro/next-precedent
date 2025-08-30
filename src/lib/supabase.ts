// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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
  // Optional: tie auth cookies to Next’s cookie store if you end up using auth sessions
  const jar = cookies();

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        // useful if you want to forward user context later
        'x-next-req-url': (typeof window === 'undefined') ? '' : window.location.origin,
      },
    },
  });
}
