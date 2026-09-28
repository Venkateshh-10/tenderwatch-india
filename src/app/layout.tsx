import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { serpApiKeyPresent } from "@/lib/mode";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "TenderWatch India",
  description: "Search-native tender intelligence and bid readiness for Indian SMEs.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell liveSearch={serpApiKeyPresent()}>{children}</AppShell>
      </body>
    </html>
  );
}
