import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { calendarDays, monthNav, tripTouchesDate } from "@/lib/dates";
import { SelectableCalendarDay } from "@/components/SelectableCalendarDay";
import type { Trip } from "@/lib/types";

type CalendarMonthProps = {
  month: Date;
  trips: Trip[];
  camperId: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonth({ month, trips, camperId }: CalendarMonthProps) {
  const { days, leadingBlanks } = calendarDays(month);
  const nav = monthNav(month);
  const today = new Date();

  return (
    <section className="calendarSurface" aria-labelledby="calendar-heading">
      <div className="calendarHeader">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2 id="calendar-heading">{nav.label}</h2>
        </div>
        <div className="iconButtonGroup" aria-label="Calendar navigation">
          <Link
            className="iconButton"
            href={`/?camper=${camperId}&month=${nav.previous}`}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <Link
            className="iconButton"
            href={`/?camper=${camperId}&month=${nav.next}`}
            aria-label="Next month"
          >
            <ChevronRight size={18} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="calendarGrid calendarWeekdays">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="calendarGrid">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} className="calendarDay calendarDayBlank" />
        ))}

        {days.map((day) => {
          const dayTrips = trips.filter((trip) => tripTouchesDate(trip, day));
          const isoDate = format(day, "yyyy-MM-dd");

          return (
            <SelectableCalendarDay
              key={isoDate}
              dayLabel={format(day, "d MMMM yyyy")}
              dayNumber={format(day, "d")}
              isToday={isSameDay(day, today)}
              isoDate={isoDate}
              trips={dayTrips}
            />
          );
        })}
      </div>
    </section>
  );
}
