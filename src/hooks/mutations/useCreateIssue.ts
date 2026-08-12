"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useCreateIssue() {
  const createIssue = useMutation(api.issues.create);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof createIssue>[0]) => {
      try {
        await createIssue(args);
        addNotification({
          title: "Issue created",
          message: `"${args.title}" has been created`,
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to create issue",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
