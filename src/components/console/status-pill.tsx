import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  BID: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
  PASS: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
  VERIFIED: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
  REVIEW: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]",
  CONCERN: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]",
  SUPPORTED: "border-[#3182F6]/40 bg-[#3182F6]/15 text-[#7CB3FF]",
  SKIP: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]",
  BLOCKER: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]",
  UNKNOWN: "border-[#1D3043] bg-[#111E2C] text-[#9BA8B7]",
  UNVERIFIED: "border-[#1D3043] bg-[#111E2C] text-[#9BA8B7]",
  CHANGED: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-semibold tracking-wide",
        STYLES[status] ?? "border-border bg-elevated text-muted-foreground",
        className,
      )}
    >
      {status}
    </span>
  );
}
