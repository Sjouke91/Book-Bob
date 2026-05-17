import Link from "next/link";
import { LogOut, Plus, Settings, Van } from "lucide-react";

import { createCamper, createTrip, signOut } from "@/app/actions";
import { MobileTabLayout } from "@/components/MobileTabLayout";
import { CalendarMonth } from "@/components/CalendarMonth";
import { SetupInstructions } from "@/components/SetupInstructions";
import { StatusBadge } from "@/components/StatusBadge";
import { TripForm } from "@/components/TripForm";
import { dateRangeLabel, monthWindow, parseMonthParam } from "@/lib/dates";
import { getCampers } from "@/lib/data";
import { hasSupabaseConfig } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  if (!hasSupabaseConfig()) {
    return <SetupInstructions />;
  }

  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const campers = await getCampers(supabase);

  const firstName = user.name.split(/[\s@]/)[0];
  const isWelcome = params?.welcome === "1";

  if (campers.length === 0) {
    return (
      <main className="appShell">
        <TopBar userName={user.name} />
        <section className="emptyState">
          <div>
            <h1>Add your camper</h1>
            <p className="muted">
              Create the shared calendar and invite your co-owner by email.
            </p>
          </div>
          <form action={createCamper} className="formStack narrowForm">
            <label>
              <span>Camper name</span>
              <input required name="name" placeholder="Bob" />
            </label>
            <label>
              <span>Friend email</span>
              <input required type="email" name="friend_email" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="description" rows={3} />
            </label>
            <button className="button primary" type="submit">
              <Plus size={18} aria-hidden />
              Create calendar
            </button>
          </form>
        </section>
      </main>
    );
  }

  const selectedCamperId =
    typeof params?.camper === "string" ? params.camper : campers[0].id;
  const selectedCamper =
    campers.find((c) => c.id === selectedCamperId) ?? campers[0];
  const month = parseMonthParam(
    typeof params?.month === "string" ? params.month : undefined
  );
  const window = monthWindow(month);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: monthTripsRaw },
    { data: upcomingRaw },
    { data: pastRaw },
    { data: membersRaw }
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("camper_id", selectedCamper.id)
      .not("status", "in", "(rejected,cancelled)")
      .lte("start_date", window.end)
      .gte("end_date", window.start)
      .order("start_date", { ascending: true }),
    supabase
      .from("trips")
      .select("*")
      .eq("camper_id", selectedCamper.id)
      .not("status", "in", "(rejected,cancelled,completed)")
      .gte("end_date", today)
      .order("start_date", { ascending: true }),
    supabase
      .from("trips")
      .select("*")
      .eq("camper_id", selectedCamper.id)
      .eq("status", "completed")
      .order("end_date", { ascending: false })
      .limit(20),
    supabase
      .from("camper_members")
      .select("user_id, profiles(full_name, email)")
      .eq("camper_id", selectedCamper.id),
  ]);

  const trips = (monthTripsRaw ?? []) as Trip[];
  const upcomingTrips = (upcomingRaw ?? []) as Trip[];
  const pastTrips = (pastRaw ?? []) as Trip[];

  // Build userId → first name map, handling Supabase returning profiles as array or object
  const bookerNames: Record<string, string> = {};
  (membersRaw ?? []).forEach((m) => {
    const row = m as { user_id: string; profiles: unknown };
    const raw = row.profiles;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as
      | { full_name?: string | null; email?: string }
      | null;
    if (profile && row.user_id) {
      const name = profile.full_name ?? profile.email ?? "";
      bookerNames[row.user_id] = name.split(/[\s@]/)[0];
    }
  });

  const camperSelector =
    campers.length > 1 ? (
      <div className="camperSelector">
        <div className="segmented">
          {campers.map((camper) => (
            <Link
              key={camper.id}
              className={camper.id === selectedCamper.id ? "active" : ""}
              href={`/?camper=${camper.id}`}
            >
              {camper.name}
            </Link>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <main className="appShell">
      <TopBar userName={user.name} />

      {isWelcome ? (
        <div className="welcomeBanner">
          Welcome {firstName}, ready for your next booking?
        </div>
      ) : null}

      <MobileTabLayout
        camperSelector={camperSelector}
        calendarContent={
          <CalendarMonth
            month={month}
            trips={trips}
            camperId={selectedCamper.id}
          />
        }
        bookContent={
          <div className="bookPanel">
            <h2 className="bookPanelTitle">Request a trip</h2>
            <TripForm
              action={createTrip}
              camperId={selectedCamper.id}
              submitLabel="Request dates"
            />
          </div>
        }
        tripsContent={
          <div className="tripsView">
            <div className="tripsSection">
              <p className="tripsSectionLabel">Upcoming</p>
              {upcomingTrips.length ? (
                upcomingTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="tripCard"
                  >
                    <div className="tripCardInfo">
                      <strong>{trip.destination}</strong>
                      <span>
                        {dateRangeLabel(trip.start_date, trip.end_date)}
                      </span>
                      <span className="tripBookerTag">
                        {trip.requested_by === user.id
                          ? "You"
                          : (bookerNames[trip.requested_by] ?? "Partner")}
                      </span>
                    </div>
                    <StatusBadge status={trip.status} />
                  </Link>
                ))
              ) : (
                <p className="muted">
                  No upcoming trips — request one from the Book tab.
                </p>
              )}
            </div>

            {pastTrips.length > 0 ? (
              <div className="tripsSection">
                <p className="tripsSectionLabel">Past trips</p>
                {pastTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="tripCard"
                  >
                    <div className="tripCardInfo">
                      <strong>{trip.destination}</strong>
                      <span>
                        {dateRangeLabel(trip.start_date, trip.end_date)}
                      </span>
                      <span className="tripBookerTag">
                        {trip.requested_by === user.id
                          ? "You"
                          : (bookerNames[trip.requested_by] ?? "Partner")}
                      </span>
                    </div>
                    <StatusBadge status={trip.status} />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        }
      />
    </main>
  );
}

function TopBar({ userName }: { userName: string }) {
  return (
    <header className="topBar">
      <Link className="brand" href="/">
        <span className="brandMark">
          <Van size={20} aria-hidden />
        </span>
        <span>Book Bob</span>
      </Link>
      <div className="topBarActions">
        <Link
          className="iconButton"
          href="/settings"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={17} aria-hidden />
        </Link>
        <form action={signOut}>
          <button
            className="iconButton"
            type="submit"
            title={`Sign out (${userName})`}
            aria-label="Sign out"
          >
            <LogOut size={17} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
