import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { formatIst } from "@/lib/format";
import { getCompany } from "@/lib/company/store";
import { serpApiKeyPresent } from "@/lib/mode";
import { countWatchlist, latestLiveRetrieval, searchActivity } from "@/lib/tenders/queries";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "TenderWatch India",
  description: "Search-native tender intelligence and bid readiness for Indian SMEs.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [company, activity, lastVerified, watchCount] = await Promise.all([
    getCompany(),
    searchActivity(),
    latestLiveRetrieval(),
    countWatchlist(),
  ]);

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppShell
          liveSearch={serpApiKeyPresent()}
          companyName={company.companyName}
          headquarters={company.headquarters}
          lastVerified={lastVerified ? formatIst(lastVerified) : null}
          searchCount={activity.executed}
          watchCount={watchCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
