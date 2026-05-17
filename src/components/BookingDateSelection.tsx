"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState
} from "react";

type DateRange = {
  startDate: string;
  endDate: string;
};

type BookingDateSelectionContextValue = DateRange & {
  clearDateSelection: () => void;
  selectCalendarDate: (isoDate: string) => void;
  setDateRange: (range: DateRange) => void;
};

const BookingDateSelectionContext =
  createContext<BookingDateSelectionContextValue | null>(null);

export function BookingDateSelectionProvider({
  children
}: {
  children: ReactNode;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: ""
  });

  const value = useMemo<BookingDateSelectionContextValue>(
    () => ({
      ...dateRange,
      clearDateSelection: () => {
        setDateRange({ startDate: "", endDate: "" });
      },
      selectCalendarDate: (isoDate: string) => {
        setDateRange((current) => {
          if (!current.startDate || current.endDate) {
            return { startDate: isoDate, endDate: "" };
          }

          if (isoDate === current.startDate) {
            return { startDate: "", endDate: "" };
          }

          if (isoDate > current.startDate) {
            return { startDate: current.startDate, endDate: isoDate };
          }

          return { startDate: isoDate, endDate: "" };
        });
      },
      setDateRange
    }),
    [dateRange]
  );

  return (
    <BookingDateSelectionContext.Provider value={value}>
      {children}
    </BookingDateSelectionContext.Provider>
  );
}

export function useBookingDateSelectionOptional() {
  return useContext(BookingDateSelectionContext);
}
