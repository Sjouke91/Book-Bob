"use client";

import { useMemo, useState } from "react";

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
  const [startDate, setStartDate] = useState(defaultStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate);
  const minReturnDate = startDate ? addDaysIso(startDate, 1) : minStartDate;

  return (
    <div className="formGrid two">
      <label>
        <span>Pickup</span>
        <input
          required
          type="date"
          name="start_date"
          min={minStartDate}
          value={startDate}
          onChange={(event) => {
            const nextStartDate = event.target.value;
            setStartDate(nextStartDate);
            setEndDate((currentEndDate) =>
              normalizeEndDate(nextStartDate, currentEndDate)
            );
          }}
        />
      </label>
      <label>
        <span>Return</span>
        <input
          required
          type="date"
          name="end_date"
          min={minReturnDate}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </label>
    </div>
  );
}
