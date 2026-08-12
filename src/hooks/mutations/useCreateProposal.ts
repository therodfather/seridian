"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNotifications } from "@/contexts/NotificationContext";

export function useCreateProposal() {
  const createProposal = useMutation(api.proposals.create);
  const { addNotification } = useNotifications();

  return {
    mutate: async (args: Parameters<typeof createProposal>[0]) => {
      try {
        await createProposal(args);
        addNotification({
          title: "Proposal created",
          message: `"${args.title}" has been created`,
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "Failed to create proposal",
          message: String(error),
          type: "error",
        });
        throw error;
      }
    },
  };
}
