import type { TripStatus } from "@/lib/types";

export function statusLabel(status: TripStatus) {
  const labels: Record<TripStatus, string> = {
    pending_approval: "Pending",
    approved: "Booked",
    change_requested: "Changes needed",
    rejected: "Rejected",
    cancelled: "Cancelled",
    completed: "Completed"
  };

  return labels[status];
}

export function statusClass(status: TripStatus) {
  const classes: Record<TripStatus, string> = {
    pending_approval: "statusPending",
    approved: "statusApproved",
    change_requested: "statusChanges",
    rejected: "statusMuted",
    cancelled: "statusMuted",
    completed: "statusCompleted"
  };

  return classes[status];
}
