"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useCreateBooking() {
  const createBooking = useMutation(api.bookings.create);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof createBooking>[0]) => {
      try {
        await createBooking(args);
        addNotification({
          title: "Booking created",
          message: `"${args.title}" has been scheduled`,
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to create booking",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
