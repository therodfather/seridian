import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "@bytecats/ui-kit/styles.css";
import "./globals.css";
import { Toaster } from "@bytecats/ui-kit";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://seridian.dev"),
  title: "Seridian | Cloud Infrastructure & Application Development Consulting",
  description:
    "Seridian helps organizations design, build, and scale cloud infrastructure and modern applications. Expert consulting for AWS, Azure, GCP, and full-stack development.",
  keywords: [
    "cloud consulting",
    "infrastructure consulting",
    "application development",
    "AWS",
    "Azure",
    "GCP",
    "DevOps",
    "cloud architecture",
  ],
  openGraph: {
    title: "Seridian | Cloud & Application Consulting",
    description:
      "Expert cloud infrastructure and application development consulting for modern organizations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
