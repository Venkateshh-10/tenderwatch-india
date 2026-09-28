import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  BID: "bg-emerald-800 text-white",
  REVIEW: "bg-amber-700 text-white",
  SKIP: "bg-rose-800 text-white",
};

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <Badge variant="outline">Not evaluated</Badge>;
  return <Badge className={STYLES[verdict] ?? ""}>{verdict}</Badge>;
}
