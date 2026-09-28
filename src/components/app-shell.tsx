"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/discover", label: "Discover" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/company", label: "Company DNA" },
];

export function AppShell({
  liveSearch,
  children,
}: {
  liveSearch: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#1c1915]">
      <header className="border-b border-[#e4dccb] bg-[#fbf8f2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-serif text-xl tracking-tight text-[#16302b]">
              TenderWatch India
            </Link>
            <p className="text-sm text-[#5c564c]">Find the right government opportunity. Know if you qualify. See the evidence.</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 whitespace-nowrap",
                    active ? "bg-[#16302b] text-white" : "text-[#3d3832] hover:bg-[#efe8da]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className={cn("px-4 py-2 text-sm", liveSearch ? "bg-[#e7f2ec] text-[#145239]" : "bg-[#f3e6c8] text-[#6a4b12]")}>
          <div className="mx-auto max-w-6xl">
            {liveSearch
              ? "Live search. TenderWatch builds Google Search and Google News queries through SerpApi and stores only those results."
              : "Live search unavailable. Add SERPAPI_API_KEY to .env.local. The desk stays empty until a real SerpApi result is stored."}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
