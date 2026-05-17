import Link from "next/link";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

import { addCamperRecipient, removeInvite, updateCamper } from "@/app/actions";
import { SetupInstructions } from "@/components/SetupInstructions";
import { hasSupabaseConfig } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import type { Camper } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  if (!hasSupabaseConfig()) {
    return <SetupInstructions />;
  }

  const params = await searchParams;
  const saved = params?.saved === "1";
  const added = params?.added === "1";

  const { supabase, user } = await requireUser();

  const { data: campersRaw } = await supabase
    .from("campers")
    .select("*")
    .order("created_at", { ascending: true });

  const campers = (campersRaw ?? []) as Camper[];

  type Profile = { email: string; full_name: string | null };
  type InviteRow = { id: string; email: string };

  // Supabase returns joined profiles as either an object or a single-element array
  // depending on the relationship direction — handle both shapes.
  function extractProfile(raw: unknown): Profile | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return (raw[0] ?? null) as Profile | null;
    return raw as Profile;
  }

  const camperDetails = await Promise.all(
    campers.map(async (camper) => {
      const { data: membersRaw } = await supabase
        .from("camper_members")
        .select("user_id, profiles(email, full_name)")
        .eq("camper_id", camper.id);

      const { data: invitesRaw } = await supabase
        .from("camper_invites")
        .select("id, email")
        .eq("camper_id", camper.id);

      const members = (membersRaw ?? []).map((m) => ({
        user_id: m.user_id as string,
        profile: extractProfile((m as Record<string, unknown>).profiles)
      }));

      const invites = (invitesRaw ?? []) as InviteRow[];

      const memberEmails = new Set(
        members.map((m) => m.profile?.email?.toLowerCase()).filter(Boolean)
      );

      const pendingInvites = invites.filter(
        (inv) => !memberEmails.has(inv.email.toLowerCase())
      );

      return { camper, members, pendingInvites };
    })
  );

  return (
    <main className="appShell">
      <div className="detailNav">
        <Link className="textLink" href="/">
          <ArrowLeft size={17} aria-hidden />
          Calendar
        </Link>
      </div>

      <section className="tripHero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
        </div>
      </section>

      {saved ? (
        <div className="welcomeBanner" style={{ marginBottom: 16 }}>
          <Check size={15} aria-hidden /> Camper saved.
        </div>
      ) : null}
      {added ? (
        <div className="welcomeBanner" style={{ marginBottom: 16 }}>
          <Check size={15} aria-hidden /> Recipient added and notified.
        </div>
      ) : null}

      <div className="tripDetailStack">
        {camperDetails.map(({ camper, members, pendingInvites }) => (
          <div key={camper.id} className="tripDetailStack">
            {/* Camper details */}
            <section className="detailCard">
              <h2 className="settingsSectionTitle">Camper</h2>
              <form action={updateCamper} className="formStack">
                <input type="hidden" name="camper_id" value={camper.id} />
                <label>
                  <span>Name</span>
                  <input required name="name" defaultValue={camper.name} />
                </label>
                <label>
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={camper.description ?? ""}
                  />
                </label>
                <button className="button primary" type="submit">
                  Save camper
                </button>
              </form>
            </section>

            {/* Notification recipients */}
            <section className="detailCard">
              <div>
                <h2 className="settingsSectionTitle">Notification recipients</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Everyone below receives an email when a booking is requested,
                  approved, or changed.
                </p>
              </div>

              <div className="recipientList">
                {/* Active members */}
                {members.map((member) => {
                  const isYou = member.user_id === user.id;
                  const name = member.profile?.full_name;
                  const email = member.profile?.email ?? "—";
                  return (
                    <div key={member.user_id} className="recipientRow">
                      <div className="recipientInfo">
                        <strong>{name ?? email}</strong>
                        {name ? <span className="recipientEmail">{email}</span> : null}
                      </div>
                      <span className="recipientTag">
                        {isYou ? "You" : "Member"}
                      </span>
                    </div>
                  );
                })}

                {/* Pending invites */}
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="recipientRow">
                    <div className="recipientInfo">
                      <strong>{invite.email}</strong>
                      <span className="recipientEmail">Invite pending</span>
                    </div>
                    <form action={removeInvite}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <button
                        className="iconButton iconButton--small"
                        type="submit"
                        title="Remove recipient"
                        aria-label="Remove recipient"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Add recipient */}
              <form action={addCamperRecipient} className="recipientAddForm">
                <input type="hidden" name="camper_id" value={camper.id} />
                <input
                  type="email"
                  name="email"
                  placeholder="Add email address…"
                  required
                />
                <button className="button secondary" type="submit">
                  Add
                </button>
              </form>
            </section>
          </div>
        ))}
      </div>
    </main>
  );
}
