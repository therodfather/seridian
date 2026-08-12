import { ConvexClientProvider } from "../ConvexClientProvider";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { QueryProvider } from "../QueryProvider";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <ConvexClientProvider>
        <NotificationProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </NotificationProvider>
      </ConvexClientProvider>
    </QueryProvider>
  );
}
