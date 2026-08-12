import { toast } from "sonner";

export function mutationErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function toastMutationSuccess(message: string) {
  toast.success(message);
}

export function toastMutationError(
  error: unknown,
  fallback = "Something went wrong",
) {
  toast.error(mutationErrorMessage(error, fallback));
}
