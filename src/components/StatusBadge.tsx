import type { TripStatus } from "@/lib/types";
import { statusClass, statusLabel } from "@/lib/status";

type StatusBadgeProps = {
  status: TripStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`statusBadge ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}
