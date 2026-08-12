"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useUpdateIssue() {
  const updateIssue = useMutation(api.issues.update);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof updateIssue>[0]) => {
      try {
        await updateIssue(args);
        addNotification({
          title: "Issue updated",
          message: "Issue has been updated successfully",
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to update issue",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
