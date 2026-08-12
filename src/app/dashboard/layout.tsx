import { ConvexClientProvider } from "../ConvexClientProvider";
import {
  DashboardAuthProvider,
  DashboardGuard,
} from "@/components/dashboard/DashboardGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { QueryProvider } from "../QueryProvider";

/**
 * Shared shell for every `/dashboard/**` route. Auth is enforced here via
 * DashboardGuard so new pages cannot bypass login by omitting a local guard.
 */
export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <ConvexClientProvider>
        <NotificationProvider>
          <DashboardAuthProvider>
            <DashboardGuard>
              <DashboardLayout>{children}</DashboardLayout>
            </DashboardGuard>
          </DashboardAuthProvider>
        </NotificationProvider>
      </ConvexClientProvider>
    </QueryProvider>
  );
}
