import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/env";

export function createAdminClient() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Admin client must only be used in development.");
  }

  const { url } = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for the dev auth bypass."
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
