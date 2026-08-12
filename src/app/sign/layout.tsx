import { ConvexClientProvider } from "@/app/ConvexClientProvider";

export default function SignLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
