"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { cancelTrip } from "@/app/actions";

export function CancelTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = async () => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append("trip_id", tripId);
    formData.append("message", note);
    await cancelTrip(formData);
    setSubmitting(false);
    setOpen(false);
    window.location.reload();
  };
  return (
    <>
      <button
        type="button"
        aria-label="Cancel trip"
        className="iconButton danger"
        onClick={() => setOpen(true)}
        style={{marginBottom: 16}}
      >
        <X size={20} aria-hidden />
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Cancel trip"
        description="Are you sure you want to cancel this trip?"
        confirmLabel={submitting ? "Cancelling..." : "Confirm cancellation"}
        danger
      >
        <label style={{display: "block", marginTop: 16}}>
          <span>Note (optional)</span>
          <textarea
            name="message"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{width: "100%", marginTop: 4}}
            disabled={submitting}
          />
        </label>
      </ConfirmModal>
    </>
  );
}