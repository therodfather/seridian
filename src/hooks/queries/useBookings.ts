"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

export function useBookings(filters?: {
  startAfter?: string;
  startBefore?: string;
  clientId?: Id<"clients">;
}) {
  return useQuery(
    api.bookings.list,
    filters !== undefined
      ? {
          startAfter: filters.startAfter,
          startBefore: filters.startBefore,
          clientId: filters.clientId,
        }
      : {},
  );
}

export function useBooking(bookingId: Id<"bookings"> | undefined) {
  return useQuery(
    api.bookings.get,
    bookingId !== undefined ? { bookingId } : "skip",
  );
}
