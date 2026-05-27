import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Camper,
  PhotoWithUrl,
  Trip,
  TripChangeRequest
} from "@/lib/types";

export async function getCampers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("campers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Camper[];
}

export async function getTripById(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Trip;
}

export async function getPendingChangeRequests(
  supabase: SupabaseClient,
  tripId: string
) {
  const { data, error } = await supabase
    .from("trip_change_requests")
    .select("*")
    .eq("trip_id", tripId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TripChangeRequest[];
}

export async function getCamperContactEmails(
  supabase: SupabaseClient,
  camperId: string
) {
  const emails = new Set<string>();

  const { data: members } = await supabase
    .from("camper_members")
    .select("profiles(email)")
    .eq("camper_id", camperId);

  (members ?? []).forEach((member) => {
    const profile = (member as { profiles?: { email?: string } }).profiles;
    if (profile?.email) {
      emails.add(profile.email.toLowerCase());
    }
  });

  const { data: invites } = await supabase
    .from("camper_invites")
    .select("email")
    .eq("camper_id", camperId);

  (invites ?? []).forEach((invite) => {
    if (invite.email) {
      emails.add(String(invite.email).toLowerCase());
    }
  });

  return Array.from(emails);
}

export async function getTripPhotos(
  supabase: SupabaseClient,
  tripId: string
) {
  const { data, error } = await supabase
    .from("trip_photos")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const photos = await Promise.all(
    (data ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("trip-photos")
        .createSignedUrl(photo.storage_path, 60 * 15);

      return {
        ...photo,
        signedUrl: signed?.signedUrl ?? null
      } as PhotoWithUrl;
    })
  );

  return photos;
}

export async function assertNoApprovedOverlap(
  supabase: SupabaseClient,
  camperId: string,
  startDate: string,
  endDate: string,
  excludeTripId?: string
) {
  let query = supabase
    .from("trips")
    .select("id, destination, start_date, end_date")
    .eq("camper_id", camperId)
    .in("status", ["approved", "completed"])
    // Treat availability as half-open: [pickup, return).
    // A return date can be reused as another trip's pickup date.
    .lt("start_date", endDate)
    .gt("end_date", startDate);

  if (excludeTripId) {
    query = query.neq("id", excludeTripId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (data?.length) {
    const conflict = data[0] as Pick<
      Trip,
      "destination" | "start_date" | "end_date"
    >;
    throw new Error(
      `Those dates overlap with ${conflict.destination} (${conflict.start_date} to ${conflict.end_date}).`
    );
  }
}

export function normalizeEmail(email: FormDataEntryValue | null) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}
