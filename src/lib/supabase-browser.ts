"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Browser-side client for client components/pages.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export const supabaseBrowser = () => {
  return createClientComponentClient();
};
