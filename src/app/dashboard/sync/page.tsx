"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function SyncPage() {
  useEffect(() => {
    redirect("/dashboard/settings");
  }, []);

  return null;
}

