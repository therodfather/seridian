import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QueryProvider } from "../QueryProvider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </QueryProvider>
  );
}
