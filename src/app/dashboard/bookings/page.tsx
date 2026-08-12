"use client";

import { BookingCalendar } from "@/components/bookings/BookingCalendar";

export default function BookingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <BookingCalendar />
    </div>
  );
}
