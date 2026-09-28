import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { formatIst } from "@/lib/format";
import { getCompany } from "@/lib/company/store";
import { getDeskSnapshot } from "@/lib/desk";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "TenderWatch India",
  description: "Search-native tender intelligence and bid readiness for Indian SMEs.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [company, desk] = await Promise.all([getCompany(), getDeskSnapshot()]);

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppShell
          liveSearch={desk.liveSearch}
          companyName={company.companyName}
          headquarters={company.headquarters}
          lastVerified={desk.lastVerified ? formatIst(desk.lastVerified) : null}
          searchCount={desk.historicalSearches}
          watchCount={desk.watchCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
