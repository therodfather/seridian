"use client";

import { BookingCalendar } from "@/components/bookings/BookingCalendar";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

export default function BookingsPage() {
  return (
    <DashboardGuard>
      <div className="p-4 md:p-6 space-y-6">
        <BookingCalendar />
      </div>
    </DashboardGuard>
  );
}
