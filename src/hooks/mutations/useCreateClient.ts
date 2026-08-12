"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useCreateClient() {
  const createClient = useMutation(api.clients.create);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof createClient>[0]) => {
      try {
        await createClient(args);
        addNotification({
          title: "Client created",
          message: `"${args.name}" has been added`,
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to create client",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
