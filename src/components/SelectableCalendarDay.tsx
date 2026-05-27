"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { useBookingDateSelectionOptional } from "@/components/BookingDateSelection";
import type { Trip } from "@/lib/types";

export type CalendarTripItem = {
  trip: Trip;
  dayRole: "pickup" | "return" | "same-day" | "stay";
};

type SelectableCalendarDayProps = {
  dayLabel: string;
  dayNumber: string;
  isToday: boolean;
  isoDate: string;
  trips: CalendarTripItem[];
};

const dayRoleLabels: Record<CalendarTripItem["dayRole"], string> = {
  pickup: "Pickup",
  return: "Return",
  "same-day": "Same day",
  stay: "On trip"
};

function selectionClass(isoDate: string, startDate: string, endDate: string) {
  if (!startDate) {
    return "";
  }

  if (isoDate === startDate && !endDate) {
    return "calendarSelectionStart calendarSelectionSingle";
  }

  if (isoDate === startDate) {
    return "calendarSelectionStart";
  }

  if (isoDate === endDate) {
    return "calendarSelectionEnd";
  }

  if (endDate && isoDate > startDate && isoDate < endDate) {
    return "calendarSelectionRange";
  }

  return "";
}

export function SelectableCalendarDay({
  dayLabel,
  dayNumber,
  isToday,
  isoDate,
  trips
}: SelectableCalendarDayProps) {
  const selection = useBookingDateSelectionOptional();
  const selectedClass = selection
    ? selectionClass(isoDate, selection.startDate, selection.endDate)
    : "";
  const instruction = selection?.startDate
    ? "Select as return date"
    : "Select as pickup date";

  function selectDate() {
    selection?.selectCalendarDate(isoDate);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${dayLabel}. ${instruction}.`}
      className={`calendarDay calendarDayInteractive ${
        isToday ? "calendarToday" : ""
      } ${selectedClass}`}
      onClick={selectDate}
      onKeyDown={handleKeyDown}
    >
      <div className="calendarDate">{dayNumber}</div>
      <div className="calendarTripStack">
        {trips.map(({ trip, dayRole }) => (
          <Link
            key={trip.id}
            className={`calendarTrip calendarTrip-${trip.status} calendarTrip-${dayRole}`}
            href={`/trips/${trip.id}`}
            aria-label={`${trip.destination}. ${dayRoleLabels[dayRole]}.`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <span className="calendarTripTitle">{trip.destination}</span>
            <span className="calendarTripFooter">
              {dayRole !== "stay" ? (
                <span
                  className={`calendarTripDayRole calendarTripDayRole-${dayRole}`}
                >
                  {dayRoleLabels[dayRole]}
                </span>
              ) : null}
              <StatusBadge status={trip.status} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
