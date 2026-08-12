"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useCreateDeal() {
  const createDeal = useMutation(api.deals.create);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof createDeal>[0]) => {
      try {
        await createDeal(args);
        addNotification({
          title: "Deal created",
          message: `"${args.name}" has been created`,
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to create deal",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
