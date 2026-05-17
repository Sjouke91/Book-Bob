import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isValid,
  parse,
  startOfMonth,
  subMonths
} from "date-fns";

import type { Trip } from "@/lib/types";

export function parseMonthParam(value?: string) {
  if (!value) {
    return startOfMonth(new Date());
  }

  const parsed = parse(value, "yyyy-MM", new Date());
  return isValid(parsed) ? startOfMonth(parsed) : startOfMonth(new Date());
}

export function monthWindow(month: Date) {
  return {
    start: format(startOfMonth(month), "yyyy-MM-dd"),
    end: format(endOfMonth(month), "yyyy-MM-dd")
  };
}

export function monthNav(month: Date) {
  return {
    previous: format(subMonths(month, 1), "yyyy-MM"),
    current: format(month, "yyyy-MM"),
    next: format(addMonths(month, 1), "yyyy-MM"),
    label: format(month, "MMMM yyyy")
  };
}

export function calendarDays(month: Date) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });
  const leadingBlanks = (getDay(startOfMonth(month)) + 6) % 7;

  return { days, leadingBlanks };
}

export function dateRangeLabel(startDate: string, endDate: string) {
  const start = parse(startDate, "yyyy-MM-dd", new Date());
  const end = parse(endDate, "yyyy-MM-dd", new Date());

  if (!isValid(start) || !isValid(end)) {
    return `${startDate} to ${endDate}`;
  }

  if (startDate === endDate) {
    return format(start, "d MMM yyyy");
  }

  return `${format(start, "d MMM yyyy")} to ${format(end, "d MMM yyyy")}`;
}

export function tripTouchesDate(trip: Trip, date: Date) {
  const isoDate = format(date, "yyyy-MM-dd");
  return trip.start_date <= isoDate && trip.end_date >= isoDate;
}

export function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export function toInputTime(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}
