import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ImagePlus,
  Pencil,
  Star,
  X
} from "lucide-react";

import {
  approveChangeRequest,
  approveTrip,
  cancelTrip,
  markTripCompleted,
  proposeTripEdit,
  rejectChangeRequest,
  rejectTrip,
  requestTripChanges,
  saveTripReview,
  updatePendingTrip,
  uploadTripPhoto
} from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { TripForm } from "@/components/TripForm";
import {
  dateRangeLabel,
  toInputTime
} from "@/lib/dates";
import {
  getPendingChangeRequests,
  getTripById,
  getTripPhotos
} from "@/lib/data";
import { requireUser } from "@/lib/auth";
import type { TripChangeRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

type TripPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const trip = await getTripById(supabase, id);
  const changeRequests = await getPendingChangeRequests(supabase, trip.id);
  const photos = await getTripPhotos(supabase, trip.id);
  const canReviewPending =
    trip.status === "pending_approval" && trip.requested_by !== user.id;
  const canEditPending =
    ["pending_approval", "change_requested"].includes(trip.status) &&
    trip.requested_by === user.id;
  const canProposeEdit = trip.status === "approved";
  const canReviewChangeRequest = changeRequests.some(
    (request) => request.requested_by !== user.id
  );
  const canComplete = trip.status === "approved";

  return (
    <main className="appShell">
      <div className="detailNav">
        <Link className="textLink" href="/">
          <ArrowLeft size={17} aria-hidden />
          Calendar
        </Link>
        <Link className="textLink" href="/history">
          History
        </Link>
      </div>

      <section className="tripHero">
        <div>
          <p className="eyebrow">Trip</p>
          <h1>{trip.destination}</h1>
          <p className="muted">{dateRangeLabel(trip.start_date, trip.end_date)}</p>
        </div>
        <StatusBadge status={trip.status} />
      </section>

      <div className="detailGrid">
        <section className="detailMain">
          <div className="infoGrid">
            <Info label="Pickup" value={trip.start_date} />
            <Info label="Return" value={trip.end_date} />
            <Info label="Pickup time" value={toInputTime(trip.pickup_time) || "-"} />
            <Info label="Return time" value={toInputTime(trip.return_time) || "-"} />
            <Info label="With whom" value={trip.companions || "-"} />
            <Info label="Notes" value={trip.notes || "-"} wide />
          </div>

          {trip.approval_message ? (
            <section className="messageBand">
              <strong>Approval note</strong>
              <p>{trip.approval_message}</p>
            </section>
          ) : null}

          {canEditPending ? (
            <section className="sectionBlock">
              <div className="panelTitle">
                <Pencil size={18} aria-hidden />
                <h2>Edit request</h2>
              </div>
              <TripForm
                action={updatePendingTrip}
                trip={trip}
                mode="edit"
                submitLabel="Resend approval"
              />
            </section>
          ) : null}

          {canProposeEdit ? (
            <section className="sectionBlock">
              <div className="panelTitle">
                <Pencil size={18} aria-hidden />
                <h2>Propose edit</h2>
              </div>
              <TripForm
                action={proposeTripEdit}
                trip={trip}
                mode="edit"
                submitLabel="Send edit for approval"
              />
            </section>
          ) : null}

          {trip.status === "completed" ? (
            <section className="sectionBlock">
              <div className="panelTitle">
                <Star size={18} aria-hidden />
                <h2>Review</h2>
              </div>
              <form action={saveTripReview} className="formStack">
                <input type="hidden" name="trip_id" value={trip.id} />
                <label>
                  <span>Rating</span>
                  <input
                    type="number"
                    name="review_rating"
                    min="1"
                    max="5"
                    defaultValue={trip.review_rating ?? ""}
                  />
                </label>
                <label>
                  <span>Highlights</span>
                  <input name="highlights" defaultValue={trip.highlights ?? ""} />
                </label>
                <label>
                  <span>Review</span>
                  <textarea
                    rows={4}
                    name="review_text"
                    defaultValue={trip.review_text ?? ""}
                  />
                </label>
                <button className="button primary" type="submit">
                  <Star size={18} aria-hidden />
                  Save review
                </button>
              </form>
            </section>
          ) : null}

          {trip.status === "completed" ? (
            <section className="sectionBlock">
              <div className="panelTitle">
                <ImagePlus size={18} aria-hidden />
                <h2>Photos</h2>
              </div>
              <form action={uploadTripPhoto} className="formStack">
                <input type="hidden" name="trip_id" value={trip.id} />
                <label>
                  <span>Photo</span>
                  <input required type="file" name="photo" accept="image/*" />
                </label>
                <label>
                  <span>Caption</span>
                  <input name="caption" />
                </label>
                <button className="button secondary" type="submit">
                  <ImagePlus size={18} aria-hidden />
                  Upload photo
                </button>
              </form>

              {photos.length ? (
                <div className="photoGrid">
                  {photos.map((photo) =>
                    photo.signedUrl ? (
                      <figure key={photo.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.signedUrl} alt={photo.caption ?? ""} />
                        {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                      </figure>
                    ) : null
                  )}
                </div>
              ) : null}
            </section>
          ) : null}
        </section>

        <aside className="sidePanel">
          {canReviewPending ? <ApprovalPanel tripId={trip.id} /> : null}

          {changeRequests.length ? (
            <section className="panelBlock">
              <div className="panelTitle">
                <CalendarCheck size={18} aria-hidden />
                <h2>Pending edits</h2>
              </div>
              {changeRequests.map((request) => (
                <ChangeRequestCard
                  key={request.id}
                  request={request}
                  canReview={canReviewChangeRequest && request.requested_by !== user.id}
                />
              ))}
            </section>
          ) : null}

          {canComplete ? (
            <section className="panelBlock">
              <form action={markTripCompleted}>
                <input type="hidden" name="trip_id" value={trip.id} />
                <button className="button secondary fullWidth" type="submit">
                  <Check size={18} aria-hidden />
                  Mark completed
                </button>
              </form>
            </section>
          ) : null}

          {["pending_approval", "approved", "change_requested"].includes(
            trip.status
          ) ? (
            <section className="panelBlock">
              <form action={cancelTrip} className="formStack">
                <input type="hidden" name="trip_id" value={trip.id} />
                <label>
                  <span>Cancel note</span>
                  <textarea name="message" rows={3} />
                </label>
                <button className="button danger" type="submit">
                  <X size={18} aria-hidden />
                  Cancel trip
                </button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "infoItem wide" : "infoItem"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ApprovalPanel({ tripId }: { tripId: string }) {
  return (
    <section className="panelBlock">
      <div className="panelTitle">
        <CalendarCheck size={18} aria-hidden />
        <h2>Approval</h2>
      </div>
      <form action={approveTrip} className="formStack">
        <input type="hidden" name="trip_id" value={tripId} />
        <label>
          <span>Message</span>
          <textarea name="message" rows={3} />
        </label>
        <button className="button primary" type="submit">
          <Check size={18} aria-hidden />
          Approve
        </button>
      </form>
      <form action={requestTripChanges} className="formStack">
        <input type="hidden" name="trip_id" value={tripId} />
        <label>
          <span>Change request</span>
          <textarea required name="message" rows={3} />
        </label>
        <button className="button secondary" type="submit">
          <Pencil size={18} aria-hidden />
          Request changes
        </button>
      </form>
      <form action={rejectTrip} className="formStack">
        <input type="hidden" name="trip_id" value={tripId} />
        <label>
          <span>Reject note</span>
          <textarea name="message" rows={3} />
        </label>
        <button className="button danger" type="submit">
          <X size={18} aria-hidden />
          Reject
        </button>
      </form>
    </section>
  );
}

function ChangeRequestCard({
  request,
  canReview
}: {
  request: TripChangeRequest;
  canReview: boolean;
}) {
  return (
    <article className="changeRequest">
      <strong>{request.proposed_destination}</strong>
      <span>
        {dateRangeLabel(request.proposed_start_date, request.proposed_end_date)}
      </span>
      {request.proposed_companions ? <p>{request.proposed_companions}</p> : null}
      {request.proposed_notes ? <p>{request.proposed_notes}</p> : null}

      {canReview ? (
        <div className="buttonRow">
          <form action={approveChangeRequest}>
            <input
              type="hidden"
              name="change_request_id"
              value={request.id}
            />
            <button className="button primary" type="submit">
              <Check size={18} aria-hidden />
              Approve edit
            </button>
          </form>
          <form action={rejectChangeRequest}>
            <input
              type="hidden"
              name="change_request_id"
              value={request.id}
            />
            <button className="button danger" type="submit">
              <X size={18} aria-hidden />
              Reject edit
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
