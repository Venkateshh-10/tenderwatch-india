import { refreshTender } from "@/lib/discovery/run";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const result = await refreshTender(id);
    return NextResponse.json(result, { status: result.ok ? 200 : result.error === "Notice not found." ? 404 : 502 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        calledSerpApi: false,
        message: "Live search unavailable.",
        newChanges: [],
        error: "Live search unavailable.",
      },
      { status: 500 },
    );
  }
}
