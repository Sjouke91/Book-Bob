import { CalendarPlus, Send } from "lucide-react";

import { toInputTime, todayIso } from "@/lib/dates";
import { DateRangeFields } from "@/components/DateRangeFields";
import type { Trip } from "@/lib/types";

type TripFormProps = {
  action: (formData: FormData) => Promise<void>;
  camperId?: string;
  trip?: Trip;
  submitLabel: string;
  mode?: "create" | "edit";
};

export function TripForm({
  action,
  camperId,
  trip,
  submitLabel,
  mode = "create"
}: TripFormProps) {
  return (
    <form action={action} className="formStack">
      {camperId ? <input type="hidden" name="camper_id" value={camperId} /> : null}
      {trip ? <input type="hidden" name="trip_id" value={trip.id} /> : null}

      <DateRangeFields
        defaultStartDate={trip?.start_date}
        defaultEndDate={trip?.end_date}
        minStartDate={mode === "create" ? todayIso() : undefined}
      />

      <div className="formGrid two">
        <label>
          <span>Pickup time</span>
          <input
            type="time"
            name="pickup_time"
            defaultValue={toInputTime(trip?.pickup_time ?? null)}
          />
        </label>
        <label>
          <span>Return time</span>
          <input
            type="time"
            name="return_time"
            defaultValue={toInputTime(trip?.return_time ?? null)}
          />
        </label>
      </div>

      <label>
        <span>Destination</span>
        <input
          required
          name="destination"
          placeholder="Norway, the Veluwe, Provence..."
          defaultValue={trip?.destination}
        />
      </label>

      <label>
        <span>With whom</span>
        <input
          name="companions"
          placeholder="Friends, family, solo"
          defaultValue={trip?.companions ?? ""}
        />
      </label>

      <label>
        <span>Notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Route ideas, campsites, handover notes"
          defaultValue={trip?.notes ?? ""}
        />
      </label>

      <button className="button primary" type="submit">
        {mode === "create" ? (
          <CalendarPlus size={18} aria-hidden />
        ) : (
          <Send size={18} aria-hidden />
        )}
        {submitLabel}
      </button>
    </form>
  );
}
