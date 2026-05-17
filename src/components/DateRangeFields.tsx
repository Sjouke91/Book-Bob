"use client";

import { useMemo, useState } from "react";

import { useBookingDateSelectionOptional } from "@/components/BookingDateSelection";

type DateRangeFieldsProps = {
  defaultStartDate?: string;
  defaultEndDate?: string;
  minStartDate?: string;
};

function addDaysIso(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function normalizeEndDate(startDate?: string, endDate?: string) {
  if (!startDate) {
    return endDate ?? "";
  }

  const firstAllowedReturnDate = addDaysIso(startDate, 1);

  if (!endDate || endDate <= startDate) {
    return firstAllowedReturnDate;
  }

  return endDate;
}

export function DateRangeFields({
  defaultStartDate,
  defaultEndDate,
  minStartDate
}: DateRangeFieldsProps) {
  const initialEndDate = useMemo(
    () => normalizeEndDate(defaultStartDate, defaultEndDate),
    [defaultStartDate, defaultEndDate]
  );
  const sharedSelection = useBookingDateSelectionOptional();
  const [startDate, setStartDate] = useState(defaultStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate);
  const displayedStartDate = sharedSelection?.startDate ?? startDate;
  const displayedEndDate = sharedSelection?.endDate ?? endDate;
  const minReturnDate = displayedStartDate
    ? addDaysIso(displayedStartDate, 1)
    : minStartDate;

  function updateStartDate(nextStartDate: string) {
    const nextEndDate = normalizeEndDate(nextStartDate, displayedEndDate);

    if (sharedSelection) {
      sharedSelection.setDateRange({
        startDate: nextStartDate,
        endDate: nextEndDate
      });
      return;
    }

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
  }

  function updateEndDate(nextEndDate: string) {
    if (sharedSelection) {
      sharedSelection.setDateRange({
        startDate: displayedStartDate,
        endDate: nextEndDate
      });
      return;
    }

    setEndDate(nextEndDate);
  }

  return (
    <div className="formGrid two">
      <label>
        <span>Pickup</span>
        <input
          required
          type="date"
          name="start_date"
          min={minStartDate}
          value={displayedStartDate}
          onChange={(event) => updateStartDate(event.target.value)}
        />
      </label>
      <label>
        <span>Return</span>
        <input
          required
          type="date"
          name="end_date"
          min={minReturnDate}
          value={displayedEndDate}
          onChange={(event) => updateEndDate(event.target.value)}
        />
      </label>
    </div>
  );
}
