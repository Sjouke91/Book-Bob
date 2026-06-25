"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { deleteTrip } from "@/app/actions";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = async () => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append("trip_id", tripId);
    await deleteTrip(formData);
    setSubmitting(false);
    setOpen(false);
    window.location.reload();
  };
  return (
    <>
      <button
        type="button"
        aria-label="Delete trip"
        className="iconButton danger"
        onClick={() => setOpen(true)}
        style={{marginBottom: 16}}
      >
        <Trash2 size={20} aria-hidden />
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Delete trip"
        description="This permanently removes the trip and cannot be undone. Are you sure?"
        confirmLabel={submitting ? "Deleting..." : "Confirm deletion"}
        danger
      />
    </>
  );
}