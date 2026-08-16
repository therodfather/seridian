"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@bytecats/ui-kit";
import { GitBranch, Layers } from "lucide-react";
import { LinearSyncSection } from "@/components/sync/LinearSyncSection";
import { GitHubSyncSection } from "@/components/sync/GitHubSyncSection";

export function SyncDashboard() {
  const [activeTab, setActiveTab] = useState("github");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList variant="line" className="gap-1">
        <TabsTrigger value="github" className="gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5" />
          GitHub
        </TabsTrigger>
        <TabsTrigger value="linear" className="gap-2 text-xs">
          <Layers className="h-3.5 w-3.5" />
          Linear (trial)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="github" className="mt-4">
        <GitHubSyncSection />
      </TabsContent>

      <TabsContent value="linear" className="mt-4">
        <LinearSyncSection />
      </TabsContent>
    </Tabs>
  );
}
