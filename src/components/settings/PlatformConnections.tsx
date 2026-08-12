"use client";

import { IntegrationsSetupWizard } from "./IntegrationsSetupWizard";

/**
 * Settings → Integrations entry point.
 * Multi-step admin setup lives in IntegrationsSetupWizard.
 */
export function PlatformConnections({
  currentUserId = "admin",
}: {
  currentUserId?: string;
}) {
  return <IntegrationsSetupWizard currentUserId={currentUserId} />;
}
