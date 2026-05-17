"use client";

import { type ReactNode, useState } from "react";
import { CalendarDays, ClipboardList, Plus } from "lucide-react";

import {
  BookingDateSelectionProvider,
  useBookingDateSelectionOptional,
} from "@/components/BookingDateSelection";

type Tab = "calendar" | "book" | "trips";

function BookCTA({ onBook }: { onBook: () => void }) {
  const selection = useBookingDateSelectionOptional();
  if (!selection?.startDate || !selection?.endDate) return null;

  return (
    <div className="bookCTA">
      <button className="bookCTAButton" onClick={onBook}>
        <Plus size={16} aria-hidden />
        Add trip
      </button>
    </div>
  );
}

type Props = {
  camperSelector: ReactNode;
  calendarContent: ReactNode;
  bookContent: ReactNode;
  tripsContent: ReactNode;
};

export function MobileTabLayout({
  camperSelector,
  calendarContent,
  bookContent,
  tripsContent,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  return (
    <BookingDateSelectionProvider>
      {camperSelector}
      <nav className="tabPill" aria-label="Main navigation">
        <button
          className={`tabPillItem${activeTab === "calendar" ? " active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          <CalendarDays size={16} aria-hidden />
          Calendar
        </button>
        <button
          className={`tabPillItem${activeTab === "book" ? " active" : ""}`}
          onClick={() => setActiveTab("book")}
        >
          <Plus size={16} aria-hidden />
          Book
        </button>
        <button
          className={`tabPillItem${activeTab === "trips" ? " active" : ""}`}
          onClick={() => setActiveTab("trips")}
        >
          <ClipboardList size={16} aria-hidden />
          Trips
        </button>
      </nav>

      <div className={activeTab === "calendar" ? undefined : "tabContentHidden"}>
        {calendarContent}
        <BookCTA onBook={() => setActiveTab("book")} />
      </div>
      <div className={activeTab === "book" ? undefined : "tabContentHidden"}>
        {bookContent}
      </div>
      <div className={activeTab === "trips" ? undefined : "tabContentHidden"}>
        {tripsContent}
      </div>
    </BookingDateSelectionProvider>
  );
}
