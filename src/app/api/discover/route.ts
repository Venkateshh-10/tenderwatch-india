import { runDiscovery } from "@/lib/discovery/run";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { refresh?: boolean };
  try {
    const result = await runDiscovery({ refresh: Boolean(body.refresh) });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live search unavailable.";
    return NextResponse.json(
      {
        mode: "live",
        log: [],
        planned: [],
        searchResultCount: 0,
        uniqueOpportunities: 0,
        relevantOpportunities: 0,
        error: message.slice(0, 280),
        notice: "No verified data available.",
        lastVerifiedAt: null,
      },
      { status: 500 },
    );
  }
}
