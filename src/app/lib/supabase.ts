'use client';

import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Server-side client (API routes, edge functions).
 * Uses SERVICE ROLE key — never expose this to the browser.
 */
export const supabaseServer = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
};

/**
 * Browser-side client for client components/pages.
 * Uses the Next.js helper (reads NEXT_PUBLIC_* envs automatically).
 */
export const supabaseBrowser = () => {
  return createClientComponentClient();
};
