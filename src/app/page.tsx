import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  History,
  LogOut,
  Plus,
  Van
} from "lucide-react";

import {
  createCamper,
  createTrip,
  signOut
} from "@/app/actions";
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

  if (campers.length === 0) {
    return (
      <main className="appShell">
        <TopBar userEmail={user.email} />
        <section className="emptyState">
          <div>
            <p className="eyebrow">First camper</p>
            <h1>Add your camper</h1>
            <p className="muted">
              Create the shared calendar and invite your friend by email.
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
    campers.find((camper) => camper.id === selectedCamperId) ?? campers[0];
  const month = parseMonthParam(
    typeof params?.month === "string" ? params.month : undefined
  );
  const window = monthWindow(month);

  const { data: monthTrips, error: tripsError } = await supabase
    .from("trips")
    .select("*")
    .eq("camper_id", selectedCamper.id)
    .not("status", "in", "(rejected,cancelled)")
    .lte("start_date", window.end)
    .gte("end_date", window.start)
    .order("start_date", { ascending: true });

  if (tripsError) {
    throw new Error(tripsError.message);
  }

  const { data: upcoming, error: upcomingError } = await supabase
    .from("trips")
    .select("*")
    .eq("camper_id", selectedCamper.id)
    .not("status", "in", "(rejected,cancelled,completed)")
    .gte("end_date", window.start)
    .order("start_date", { ascending: true })
    .limit(8);

  if (upcomingError) {
    throw new Error(upcomingError.message);
  }

  const trips = (monthTrips ?? []) as Trip[];
  const upcomingTrips = (upcoming ?? []) as Trip[];

  return (
    <main className="appShell">
      <TopBar userEmail={user.email} />

      <section className="dashboardHeader">
        <div>
          <p className="eyebrow">Shared camper</p>
          <h1>{selectedCamper.name}</h1>
          {selectedCamper.description ? (
            <p className="muted">{selectedCamper.description}</p>
          ) : null}
        </div>
        <div className="headerActions">
          <Link className="button secondary" href="/history">
            <History size={18} aria-hidden />
            Trip history
          </Link>
          {campers.length > 1 ? (
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
          ) : null}
        </div>
      </section>

      <div className="dashboardGrid">
        <CalendarMonth
          month={month}
          trips={trips}
          camperId={selectedCamper.id}
        />

        <aside className="sidePanel">
          <section className="panelBlock">
            <div className="panelTitle">
              <CalendarDays size={18} aria-hidden />
              <h2>Request trip</h2>
            </div>
            <TripForm
              action={createTrip}
              camperId={selectedCamper.id}
              submitLabel="Send for approval"
            />
          </section>

          <section className="panelBlock">
            <div className="panelTitle">
              <CheckCircle2 size={18} aria-hidden />
              <h2>Upcoming</h2>
            </div>
            <div className="tripList">
              {upcomingTrips.length ? (
                upcomingTrips.map((trip) => (
                  <Link
                    href={`/trips/${trip.id}`}
                    className="tripListItem"
                    key={trip.id}
                  >
                    <div>
                      <strong>{trip.destination}</strong>
                      <span>
                        {dateRangeLabel(trip.start_date, trip.end_date)}
                      </span>
                    </div>
                    <StatusBadge status={trip.status} />
                  </Link>
                ))
              ) : (
                <p className="muted">No upcoming trips.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function TopBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="topBar">
      <Link className="brand" href="/">
        <span className="brandMark">
          <Van size={20} aria-hidden />
        </span>
        <span>Book Bob</span>
      </Link>
      <form action={signOut}>
        <button className="iconTextButton" type="submit">
          <span>{userEmail}</span>
          <LogOut size={17} aria-hidden />
        </button>
      </form>
    </header>
  );
}
