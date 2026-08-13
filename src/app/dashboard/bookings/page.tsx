"use client";

import { Calendar } from "lucide-react";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";

export default function BookingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Bookings</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Schedule consultations, development sessions, and reviews with clients.
            </p>
          </div>
        </div>
      </div>
      <BookingCalendar />
    </div>
  );
}
