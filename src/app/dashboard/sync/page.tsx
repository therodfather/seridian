import { redirect } from "next/navigation";
import { settingsTabHref } from "@/lib/routes";

/** Legacy Sync nav URL — keep bookmarks working by sending users to Settings. */
export default function SyncPage() {
  redirect(settingsTabHref("sync"));
}
