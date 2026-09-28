"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Dna, LayoutDashboard, Menu, Radar, Settings, X } from "lucide-react";
import { TopSearch } from "@/components/console/top-search";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Radar },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/company", label: "Company DNA", icon: Dna },
];

export function AppShell({
  liveSearch,
  companyName,
  headquarters,
  lastVerified,
  searchCount,
  watchCount,
  children,
}: {
  liveSearch: boolean;
  companyName: string;
  headquarters: string;
  lastVerified: string | null;
  searchCount: number;
  watchCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarBody
          pathname={pathname}
          liveSearch={liveSearch}
          lastVerified={lastVerified}
          searchCount={searchCount}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-sidebar px-3 py-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <Suspense fallback={<div className="h-8 rounded-md border border-border bg-elevated" />}>
              <TopSearch />
            </Suspense>
          </div>
          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] sm:flex",
              liveSearch ? "text-[#22C55E]" : "text-[#F59E0B]",
            )}
          >
            <span className={cn("size-1.5 rounded-full", liveSearch ? "bg-[#22C55E] live-pulse" : "bg-[#F59E0B]")} />
            {liveSearch ? "Live Search" : "Unavailable"}
          </div>
          <Link
            href="/watchlist"
            aria-label="Watchlist"
            className="relative inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-3.5" />
            {watchCount > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#3182F6] px-1 text-[9px] font-semibold text-white">
                {watchCount}
              </span>
            ) : null}
          </Link>
          <div className="hidden min-w-0 max-w-[180px] md:block">
            <p className="truncate text-[12px] font-medium leading-tight">{companyName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{headquarters}</p>
          </div>
        </header>
        {open ? (
          <div className="border-b border-border bg-sidebar p-2 lg:hidden">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-y-auto p-3">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  pathname,
  liveSearch,
  lastVerified,
  searchCount,
}: {
  pathname: string;
  liveSearch: boolean;
  lastVerified: string | null;
  searchCount: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-[#3182F6] text-[11px] font-semibold text-white">
          TW
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">TenderWatch India</p>
          <p className="truncate text-[10px] text-muted-foreground">Search-native bid readiness</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        <NavLinks pathname={pathname} />
      </nav>
      <div className="space-y-2 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
            pathname.startsWith("/settings") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-elevated hover:text-foreground",
          )}
        >
          <Settings className="size-3.5" />
          Settings
        </Link>
        <div className="rounded-md border border-sidebar-border bg-elevated p-2.5">
          <p className="text-[11px] font-medium">SerpApi</p>
          <p className={cn("mt-1 text-[11px]", liveSearch ? "text-[#22C55E]" : "text-[#F59E0B]")}>
            {liveSearch ? "Live search ready" : "Live search unavailable"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{searchCount} searches stored</p>
          <p className="text-[10px] text-muted-foreground">{lastVerified ? `Last retrieval ${lastVerified}` : "No verified retrieval yet"}</p>
        </div>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
