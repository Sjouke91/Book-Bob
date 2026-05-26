import Link from "next/link";
import { ArrowLeft, Star, Trash2 } from "lucide-react";

import { deleteTrip } from "@/app/actions";
import { SetupInstructions } from "@/components/SetupInstructions";
import { StatusBadge } from "@/components/StatusBadge";
import { dateRangeLabel } from "@/lib/dates";
import { hasSupabaseConfig } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!hasSupabaseConfig()) {
    return <SetupInstructions />;
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("status", "completed")
    .order("end_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const trips = (data ?? []) as Trip[];

  return (
    <main className="appShell">
      <div className="detailNav">
        <Link className="textLink" href="/">
          <ArrowLeft size={17} aria-hidden />
          Calendar
        </Link>
      </div>
      <section className="dashboardHeader">
        <div>
          <p className="eyebrow">Trip history</p>
          <h1>Past trips</h1>
        </div>
      </section>

      <section className="historyGrid">
        {trips.length ? (
          trips.map((trip) => (
            <div className="historyCard" key={trip.id}>
              <Link className="historyCardContent" href={`/trips/${trip.id}`}>
                <div>
                  <h2>{trip.destination}</h2>
                  <p>{dateRangeLabel(trip.start_date, trip.end_date)}</p>
                </div>
                <StatusBadge status={trip.status} />
                {trip.review_rating ? (
                  <span className="rating">
                    <Star size={16} aria-hidden />
                    {trip.review_rating}/5
                  </span>
                ) : null}
                {trip.highlights ? <p>{trip.highlights}</p> : null}
              </Link>
              <div className="historyCardActions">
                <form action={deleteTrip}>
                  <input type="hidden" name="trip_id" value={trip.id} />
                  <button className="iconButton" type="submit" title="Delete trip" aria-label="Delete trip">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">Completed trips will appear here.</p>
        )}
      </section>
    </main>
  );
}
