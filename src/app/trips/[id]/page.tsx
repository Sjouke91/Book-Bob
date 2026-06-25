import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ImagePlus,
  Pencil,
  Star,
  Trash2,
  X
} from "lucide-react";

// CalendarCheck used in pending change requests section

import {
  approveChangeRequest,
  cancelTrip,
  deleteTrip,
  markTripCompleted,
  proposeTripEdit,
  rejectChangeRequest,
  saveTripReview,
  updatePendingTrip,
  uploadTripPhoto
} from "@/app/actions";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { TogglePanel } from "@/components/TogglePanel";
import { TripForm } from "@/components/TripForm";

import { dateRangeLabel, toInputTime } from "@/lib/dates";
import { getPendingChangeRequests, getTripById, getTripPhotos } from "@/lib/data";
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
    (r) => r.requested_by !== user.id
  );
  const canComplete = trip.status === "approved";
  const canCancel = ["pending_approval", "approved", "change_requested"].includes(
    trip.status
  );

  const pickupTime = toInputTime(trip.pickup_time ?? null);
  const returnTime = toInputTime(trip.return_time ?? null);

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
          <p className="eyebrow">Trip</p>
          <h1>{trip.destination}</h1>
          <p className="muted">{dateRangeLabel(trip.start_date, trip.end_date)}</p>
        </div>
        <StatusBadge status={trip.status} />
      </section>

      <div className="tripDetailStack">
        {/* Trip info */}
        <section className="detailCard">
          <div className="tripInfoList">
            <Info label="Pickup" value={trip.start_date} />
            <Info label="Return" value={trip.end_date} />
            {pickupTime ? <Info label="Pickup time" value={pickupTime} wide={!returnTime} /> : null}
            {returnTime ? <Info label="Return time" value={returnTime} wide={!pickupTime} /> : null}
            {trip.companions ? <Info label="With" value={trip.companions} wide /> : null}
            {trip.notes ? <Info label="Notes" value={trip.notes} wide /> : null}
          </div>
          {trip.approval_message ? (
            <div className="messageBand">
              <strong>Note</strong>
              <p>{trip.approval_message}</p>
            </div>
          ) : null}
        </section>

        {/* Reviewer: approve / request changes / reject */}
        {canReviewPending ? <ApprovalPanel tripId={trip.id} /> : null}

        {/* Pending change requests */}
        {changeRequests.length ? (
          <section className="detailCard">
            <div className="panelTitle">
              <CalendarCheck size={18} aria-hidden />
              <h2>Pending edits</h2>
            </div>
            <div className="formStack">
              {changeRequests.map((request) => (
                <ChangeRequestCard
                  key={request.id}
                  request={request}
                  canReview={canReviewChangeRequest && request.requested_by !== user.id}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Mark completed */}
        {canComplete ? (
          <form action={markTripCompleted}>
            <input type="hidden" name="trip_id" value={trip.id} />
            <button className="button secondary fullWidth" type="submit">
              <Check size={18} aria-hidden />
              Mark completed
            </button>
          </form>
        ) : null}

        {/* Edit pending request */}
        {canEditPending ? (
          <TogglePanel label="Edit request" icon={<Pencil size={16} aria-hidden />}>
            <TripForm
              action={updatePendingTrip}
              trip={trip}
              mode="edit"
              submitLabel="Resend for approval"
            />
          </TogglePanel>
        ) : null}

        {/* Propose changes to an approved trip */}
        {canProposeEdit ? (
          <TogglePanel label="Propose changes" icon={<Pencil size={16} aria-hidden />}>
            <TripForm
              action={proposeTripEdit}
              trip={trip}
              mode="edit"
              submitLabel="Send for approval"
            />
          </TogglePanel>
        ) : null}

        {/* Review */}
        {trip.status === "completed" ? (
          <section className="detailCard">
            <div className="panelTitle">
              <Star size={18} aria-hidden />
              <h2>Review</h2>
            </div>
            <form action={saveTripReview} className="formStack">
              <input type="hidden" name="trip_id" value={trip.id} />
              <label>
                <span>Rating (1–5)</span>
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

        {/* Photos */}
        {trip.status === "completed" ? (
          <section className="detailCard">
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
                      {photo.caption ? (
                        <figcaption>{photo.caption}</figcaption>
                      ) : null}
                    </figure>
                  ) : null
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Cancel trip */}
        {canCancel ? (
          <TogglePanel
            label="Cancel trip"
            icon={<X size={16} aria-hidden />}
            variant="danger"
          >
            <form action={cancelTrip} className="formStack">
              <input type="hidden" name="trip_id" value={trip.id} />
              <label>
                <span>Note (optional)</span>
                <textarea name="message" rows={3} />
              </label>
              <button className="button danger" type="submit">
                <X size={18} aria-hidden />
                Confirm cancellation
              </button>
            </form>
          </TogglePanel>
        ) : null}

        {/* Delete trip — always last */}
        <TogglePanel
          label="Delete trip"
          icon={<Trash2 size={16} aria-hidden />}
          variant="danger"
        >
          <form action={deleteTrip} className="formStack">
            <input type="hidden" name="trip_id" value={trip.id} />
            <p className="muted">This permanently removes the trip and cannot be undone.</p>
            <button className="button danger" type="submit">
              <Trash2 size={18} aria-hidden />
              Confirm deletion
            </button>
          </form>
        </TogglePanel>
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
    <div className={wide ? "tripInfoItem wide" : "tripInfoItem"}>
      <span className="tripInfoLabel">{label}</span>
      <strong className="tripInfoValue">{value}</strong>
    </div>
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
      <span>{dateRangeLabel(request.proposed_start_date, request.proposed_end_date)}</span>
      {request.proposed_companions ? <p>{request.proposed_companions}</p> : null}
      {request.proposed_notes ? <p>{request.proposed_notes}</p> : null}
      {canReview ? (
        <div className="buttonRow">
          <form action={approveChangeRequest}>
            <input type="hidden" name="change_request_id" value={request.id} />
            <button className="button primary" type="submit">
              <Check size={18} aria-hidden />
              Approve edit
            </button>
          </form>
          <form action={rejectChangeRequest}>
            <input type="hidden" name="change_request_id" value={request.id} />
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
