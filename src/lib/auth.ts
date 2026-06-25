import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { UserContext } from "@/lib/types";

type ClaimsResponse = {
  sub?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

export async function getCurrentUserOrNull() {
  const bypassContext = await getNoLoginContext();

  if (bypassContext) {
    return bypassContext;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub || !claims.email) {
    return { supabase, user: null };
  }

  const typedClaims = claims as ClaimsResponse;
  const user = {
    id: typedClaims.sub ?? claims.sub,
    email: String(typedClaims.email ?? claims.email).toLowerCase(),
    name:
      typedClaims.user_metadata?.full_name ??
      typedClaims.user_metadata?.name ??
      String(typedClaims.email ?? claims.email).split("@")[0]
  };

  await ensureProfile(supabase, user);
  await claimInvites(supabase, user);

  return { supabase, user };
}

export async function requireUser() {
  const context = await getCurrentUserOrNull();

  if (!context.user) {
    throw new Error(
      "No-login mode requires SUPABASE_SECRET_KEY and BOOK_BOB_SHARED_USER_EMAIL (or GMAIL_USER) to match an existing Supabase profile."
    );
  }

  return context as {
    supabase: SupabaseClient;
    user: UserContext;
  };
}

async function getNoLoginContext() {
  const sharedEmail = (
    process.env.BOOK_BOB_SHARED_USER_EMAIL ?? process.env.GMAIL_USER
  )
    ?.trim()
    .toLowerCase();

  if (!sharedEmail || !process.env.SUPABASE_SECRET_KEY) {
    return null;
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", sharedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    throw new Error(
      `No profile found for ${sharedEmail}. Create that user once in Supabase or set BOOK_BOB_SHARED_USER_EMAIL to an existing profile email.`
    );
  }

  return {
    supabase: adminClient,
    user: {
      id: profile.id as string,
      email: profile.email as string,
      name:
        (profile.full_name as string | null) ??
        (profile.email as string).split("@")[0]
    }
  };
}

export async function ensureProfile(
  supabase: SupabaseClient,
  user: UserContext
) {
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.name
    },
    { onConflict: "id" }
  );
}

async function claimInvites(supabase: SupabaseClient, user: UserContext) {
  const { data: invites } = await supabase
    .from("camper_invites")
    .select("camper_id")
    .eq("email", user.email);

  if (!invites?.length) {
    return;
  }

  await supabase.from("camper_members").upsert(
    invites.map((invite) => ({
      camper_id: invite.camper_id,
      user_id: user.id,
      role: "owner"
    })),
    { onConflict: "camper_id,user_id", ignoreDuplicates: true }
  );
}
