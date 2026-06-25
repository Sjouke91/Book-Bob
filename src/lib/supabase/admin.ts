import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for the no-login auth bypass."
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
