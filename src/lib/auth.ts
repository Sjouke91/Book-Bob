import { redirect } from "next/navigation";
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
  // Dev bypass: auto-login on localhost using GMAIL_USER as the identity
  if (
    process.env.NODE_ENV === "development" &&
    process.env.GMAIL_USER &&
    process.env.SUPABASE_SECRET_KEY
  ) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", process.env.GMAIL_USER.toLowerCase())
      .single();

    if (profile) {
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
    redirect("/login");
  }

  return context as {
    supabase: SupabaseClient;
    user: UserContext;
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
