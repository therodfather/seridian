"use client";

import { Calendar } from "lucide-react";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";
import { PageShell } from "@/components/dashboard/kit";

export default function BookingsPage() {
  return (
    <PageShell
      title="Bookings"
      description="Schedule consultations, development sessions, and reviews with clients."
      icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
    >
      <BookingCalendar />
    </PageShell>
  );
}
